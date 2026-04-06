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
  roomSelections: { id: string, name: string, quantity: number, price: number }[],
  totalAmount: number,
  checkinDate: string,
  checkoutDate: string
) {
  try {
    const supabase = await createClient()

    // 1. Availability Check (Pre-order) for each room type
    for (const selection of roomSelections) {
      if (selection.quantity <= 0) continue

      // We check if there are enough rooms of this CATEGORY available
      // For simplicity in this step, we ensure the specific room IDs aren't double booked
      // However, since we're selecting by category, we should check total available rooms in that category
      // For now, we'll rely on the client-side availableRoomIds filtering but do a safety check
    }

    // 2. Create Razorpay Order
    const options = {
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        propertyId,
        checkinDate,
        checkoutDate,
        numRooms: roomSelections.reduce((acc, r) => acc + r.quantity, 0)
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
  roomSelections: { id: string, name: string, quantity: number, price: number }[],
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
    influencerId?: string | null,
    numGuests: number
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

    // 2. Final Availability Check (Race condition prevention)
    // In a multi-room setup, we'd check if the total rooms for these categories are still available.
    // For now, we'll proceed with the insert which links the room_details JSON.

    // 3. Insert Booking
    const { data: insertedBooking, error: bookingError } = await supabaseAdmin.from('bookings').insert([{
      property_id: propertyId,
      room_id: roomSelections[0]?.id || null, // Primary Room ID for legacy support
      user_id: userId,
      influencer_id: guestData.influencerId || null,
      guest_name: guestData.name,
      guest_email: guestData.email,
      guest_phone: guestData.phone,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      amount,
      num_guests: guestData.numGuests,
      num_rooms: roomSelections.reduce((acc, r) => acc + r.quantity, 0),
      room_details: roomSelections,
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
    
    // Notifications
    try {
      const { data: p } = await supabaseAdmin.from('properties').select('name').eq('id', propertyId).single()
      const roomSummary = roomSelections.map(r => `${r.quantity}x ${r.name}`).join(', ')
      const { sendBookingNotifications } = await import('@/utils/notifications')
      await sendBookingNotifications({
        guestName: guestData.name,
        guestEmail: guestData.email,
        guestPhone: guestData.phone,
        propertyName: p?.name || 'FixStay Property',
        roomCategory: roomSummary || 'Rooms',
        amount,
        bookingId: insertedBooking.id
      })
    } catch (e) {}

    return { success: true }
  } catch (err: any) {
    return { error: 'An unexpected error occurred during confirmation.' }
  }
}

