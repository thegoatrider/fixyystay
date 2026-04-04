'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

import Razorpay from 'razorpay'

// Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function logClick(propertyId: string, influencerId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('influencer_clicks').insert([{
    property_id: propertyId,
    influencer_id: influencerId
  }])

  if (error) {
    console.error('Failed to log influencer click', error)
  }
}

export async function createBookingOrder(
  propertyId: string,
  roomId: string,
  amount: number,
  checkinDate: string,
  checkoutDate: string
) {
  try {
    const supabase = await createClient()

    // 1. Availability Check (Pre-order)
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id, checkin_date, checkout_date')
      .eq('room_id', roomId)
      .eq('payment_status', 'paid')

    const hasOverlap = existingBookings?.some(b => {
      if (!b.checkin_date || !b.checkout_date) return false
      return b.checkin_date < checkoutDate && b.checkout_date > checkinDate
    })

    if (hasOverlap) return { error: 'Room already booked for these dates.' }

    // 2. Create Razorpay Order
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        propertyId,
        roomId,
        checkinDate,
        checkoutDate
      }
    }

    const order = await razorpay.orders.create(options)
    return { 
      orderId: order.id, 
      amount: order.amount, 
      key: process.env.RAZORPAY_KEY_ID 
    }
  } catch (err: any) {
    console.error('Razorpay Order Error:', err)
    return { error: 'Failed to initiate payment. Please try again.' }
  }
}

export async function confirmBooking(
  propertyId: string, 
  roomId: string, 
  amount: number, 
  checkinDate: string,
  checkoutDate: string,
  paymentData: {
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string
  },
  guestData: {
    name: string,
    email: string,
    phone: string,
    influencerId?: string | null
  }
) {
  try {
    // 1. Verify Payment Signature
    const crypto = await import('crypto')
    const secret = process.env.RAZORPAY_KEY_SECRET!
    const body = paymentData.razorpay_order_id + "|" + paymentData.razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex')

    if (expectedSignature !== paymentData.razorpay_signature) {
      return { error: 'Payment verification failed. Invalid signature.' }
    }

    const supabaseAdmin = createAdminClient()
    const { data: { user } } = await supabaseAdmin.auth.getUser()
    const userId = user?.id || null

    // 2. Final Availability Check (Prevent race conditions after payment)
    const { data: existing } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .eq('payment_status', 'paid')
      .lt('checkin_date', checkoutDate)
      .gt('checkout_date', checkinDate)
      .maybeSingle()

    if (existing) {
      // In a real app, you'd trigger an automated refund here.
      return { error: 'Sorry, this room was just confirmed by someone else. Our team will contact you for a full refund.' }
    }

    // 3. Insert Booking
    const { data: insertedBooking, error: bookingError } = await supabaseAdmin.from('bookings').insert([{
      property_id: propertyId,
      room_id: roomId,
      user_id: userId,
      influencer_id: guestData.influencerId || null,
      guest_name: guestData.name,
      guest_email: guestData.email,
      guest_phone: guestData.phone,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      amount,
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      payment_status: 'paid'
    }]).select().single()

    if (bookingError || !insertedBooking) {
      console.error('Final booking insert failed:', bookingError)
      return { error: 'Failed to record your booking. Please contact support with your Payment ID.' }
    }

    // 4. Update Wallets & Leads (Same logic as before)
    try {
      const { data: prop } = await supabaseAdmin.from('properties').select('owner_id').eq('id', propertyId).single()
      if (prop?.owner_id) {
        await supabaseAdmin.from('leads').insert([{
          owner_id: prop.owner_id,
          property_id: propertyId,
          guest_name: guestData.name,
          guest_email: guestData.email,
          phone_number: guestData.phone,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
          status: 'Booked',
          marking: 'Booked'
        }])
      }

      // Wallet Splits
      const { data: propOwner } = await supabaseAdmin.from('properties').select('owners(user_id)').eq('id', propertyId).single()
      const ownerUserId = (propOwner as any)?.owners?.user_id
      if (ownerUserId) {
        await supabaseAdmin.from('wallet_transactions').insert({
          user_id: ownerUserId,
          amount: amount * 0.80,
          transaction_type: 'earning',
          booking_id: insertedBooking.id,
          description: `Booking payout for ${guestData.name}`
        })
      }

      const infId = guestData.influencerId
      if (infId) {
        const { data: inf } = await supabaseAdmin.from('influencers').select('commission_rate, user_id').eq('id', infId).single()
        const rate = Math.min(Number(inf?.commission_rate || 0), 20)
        if (rate > 0 && inf?.user_id) {
          await supabaseAdmin.from('wallet_transactions').insert({
            user_id: inf.user_id,
            amount: amount * (rate / 100),
            transaction_type: 'earning',
            booking_id: insertedBooking.id,
            description: `Referral commission (${rate}%) for ${guestData.name}`
          })
        }
      }
    } catch (e) { console.error('Side logic failed:', e) }

    revalidatePath('/guest')
    revalidatePath(`/guest/property/${propertyId}`)
    
    // Notifications... (keep same logic)
    try {
      const { data: p } = await supabaseAdmin.from('properties').select('name').eq('id', propertyId).single()
      const { data: r } = await supabaseAdmin.from('rooms').select('category').eq('id', roomId).single()
      const { sendBookingNotifications } = await import('@/utils/notifications')
      await sendBookingNotifications({
        guestName: guestData.name,
        guestEmail: guestData.email,
        guestPhone: guestData.phone,
        propertyName: p?.name || 'FixStay Property',
        roomCategory: r?.category || 'Standard',
        amount,
        bookingId: insertedBooking.id
      })
    } catch (e) {}

    return { success: true }
  } catch (err: any) {
    return { error: 'An unexpected error occurred during confirmation.' }
  }
}

