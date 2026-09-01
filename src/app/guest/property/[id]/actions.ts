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

  // First check if it's an influencer_links record
  let linkRecord = null
  try {
    const { data } = await supabase
      .from('influencer_links')
      .select('id, influencer_id')
      .eq('id', influencerId)
      .maybeSingle()
    linkRecord = data
  } catch (e) {
    console.error('UUID parse or query error:', e)
  }

  const actualInfluencerId = linkRecord ? linkRecord.influencer_id : influencerId

  if (linkRecord) {
    // Update link status to clicked
    await supabase
      .from('influencer_links')
      .update({ status: 'clicked' })
      .eq('id', linkRecord.id)
      .eq('status', 'sent') // only update if it was just 'sent'
  }

  const { error } = await supabase.from('influencer_clicks').insert([{
    property_id: propertyId,
    influencer_id: actualInfluencerId
  }])

  if (error) {
    console.error('Failed to log influencer click', error)
  }
}

export async function createBookingOrder(
  propertyId: string,
  roomSelections: { id: string, name?: string, quantity: number, price: number, category?: string }[],
  totalAmount: number,
  checkinDate: string,
  checkoutDate: string,
  guestData?: {
    name?: string,
    email?: string,
    phone?: string,
    influencerId?: string | null,
    numGuests?: number
  }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    const supabaseAdmin = createAdminClient()

    // 1. Calculate authoritative total amount strictly server-side (100% database-derived)
    const checkinTime = new Date(checkinDate).getTime()
    const checkoutTime = new Date(checkoutDate).getTime()
    if (isNaN(checkinTime) || isNaN(checkoutTime) || checkoutTime <= checkinTime) {
      return { error: 'Invalid check-in or check-out dates.' }
    }

    const numDays = Math.max(1, Math.ceil((checkoutTime - checkinTime) / (1000 * 60 * 60 * 24)))
    const activeSelections = roomSelections.filter(r => r.quantity > 0)
    let calculatedTotal = 0

    if (activeSelections.length > 0) {
      const roomIds = activeSelections.map(r => r.id)
      const { data: dbRooms, error: roomsError } = await supabaseAdmin
        .from('rooms')
        .select('id, property_id, base_price, category')
        .in('id', roomIds)
        .eq('property_id', propertyId)

      if (roomsError || !dbRooms || dbRooms.length !== roomIds.length) {
        return { error: 'Unable to verify pricing, please try again.' }
      }

      for (const selection of activeSelections) {
        const room = dbRooms.find(r => r.id === selection.id)
        if (!room || room.base_price === null || room.base_price === undefined || Number(room.base_price) <= 0) {
          return { error: 'Unable to verify pricing, please try again.' }
        }
        const pricePerNight = Number(room.base_price)
        calculatedTotal += pricePerNight * selection.quantity * numDays
      }
    } else {
      const { data: prop, error: propError } = await supabaseAdmin
        .from('properties')
        .select('id, base_price')
        .eq('id', propertyId)
        .single()

      if (propError || !prop || prop.base_price === null || prop.base_price === undefined || Number(prop.base_price) <= 0) {
        return { error: 'Unable to verify pricing, please try again.' }
      }

      calculatedTotal = Number(prop.base_price) * numDays
    }

    if (calculatedTotal <= 0) {
      return { error: 'Unable to verify pricing, please try again.' }
    }

    const authoritativeAmount = calculatedTotal

    // 2. Create Razorpay Order with authoritative server-calculated amount
    const options = {
      amount: Math.round(authoritativeAmount * 100),
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

    // 3. Pre-create pending booking row in database before payment
    const { error: preBookingError } = await supabaseAdmin.from('bookings').insert([{
      property_id: propertyId,
      room_id: roomSelections[0]?.id || null,
      user_id: userId,
      influencer_id: guestData?.influencerId || null,
      guest_name: guestData?.name || 'Pending Guest',
      guest_email: guestData?.email || null,
      guest_phone: guestData?.phone || '',
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      amount: authoritativeAmount,
      num_guests: guestData?.numGuests || 1,
      num_rooms: roomSelections.reduce((acc, r) => acc + r.quantity, 0),
      room_details: roomSelections,
      razorpay_order_id: order.id,
      payment_status: 'pending',
      status: 'pending'
    }])

    if (preBookingError) {
      console.warn('Pre-creating pending booking record warning:', preBookingError)
    }

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
  roomSelections: { id: string, name?: string, quantity: number, price: number, category?: string }[],
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
    // 1. Verify Payment Signature cryptographically
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

    // 2. Fetch authoritative order details from Razorpay API
    const rzpOrder = await razorpay.orders.fetch(paymentData.razorpay_order_id)
    if (!rzpOrder) {
      return { error: 'Could not verify order with payment provider.' }
    }
    const authoritativeAmount = Number(rzpOrder.amount) / 100

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    const supabaseAdmin = createAdminClient()

    // 3. Update existing pending booking row to 'paid'
    const { data: existingBooking } = await supabaseAdmin
      .from('bookings')
      .select('id, payment_status')
      .eq('razorpay_order_id', paymentData.razorpay_order_id)
      .maybeSingle()

    let bookedRecordId = existingBooking?.id

    if (existingBooking) {
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({
          user_id: userId,
          influencer_id: guestData.influencerId || null,
          guest_name: guestData.name,
          guest_email: guestData.email,
          guest_phone: guestData.phone,
          amount: authoritativeAmount, // Authoritative amount from Razorpay
          num_guests: guestData.numGuests,
          num_rooms: roomSelections.reduce((acc, r) => acc + r.quantity, 0),
          room_details: roomSelections,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', existingBooking.id)

      if (updateError) {
        console.error('Updating booking to paid failed:', updateError)
        return { error: 'Failed to record payment on booking. Please contact support.' }
      }
    } else {
      const { data: insertedBooking, error: insertError } = await supabaseAdmin
        .from('bookings')
        .insert([{
          property_id: propertyId,
          room_id: roomSelections[0]?.id || null,
          user_id: userId,
          influencer_id: guestData.influencerId || null,
          guest_name: guestData.name,
          guest_email: guestData.email,
          guest_phone: guestData.phone,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
          amount: authoritativeAmount,
          num_guests: guestData.numGuests,
          num_rooms: roomSelections.reduce((acc, r) => acc + r.quantity, 0),
          room_details: roomSelections,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          payment_status: 'paid',
          status: 'confirmed'
        }])
        .select('id')
        .single()

      if (insertError || !insertedBooking) {
        console.error('Final booking insert failed:', insertError)
        return { error: 'Failed to record your booking. Please contact support with your Payment ID.' }
      }
      bookedRecordId = insertedBooking.id
    }

    // 4. Update Wallets & Leads
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
          amount: authoritativeAmount * 0.88,
          transaction_type: 'earning',
          booking_id: bookedRecordId,
          description: `Booking payout for ${guestData.name}`
        })
      }

      const infId = guestData.influencerId
      if (infId) {
        let actualInfluencerId = infId;
        let linkId = null;

        let linkData = null;
        try {
          const { data } = await supabaseAdmin
            .from('influencer_links')
            .select('influencer_id, id')
            .eq('id', infId)
            .maybeSingle();
          linkData = data;
        } catch (e) {
          console.error('UUID parse or query error in booking:', e)
        }

        if (linkData) {
          actualInfluencerId = linkData.influencer_id;
          linkId = linkData.id;
        }

        const { data: inf } = await supabaseAdmin.from('influencers').select('commission_rate, user_id').eq('id', actualInfluencerId).single()
        const rate = Math.min(Number(inf?.commission_rate || 0), 12)
        if (rate > 0 && inf?.user_id) {
          const commissionAmount = authoritativeAmount * (rate / 100);
          await supabaseAdmin.from('wallet_transactions').insert({
            user_id: inf.user_id,
            amount: commissionAmount,
            transaction_type: 'earning',
            booking_id: bookedRecordId,
            description: `Referral commission (${rate}%) for ${guestData.name}`
          })
          
          if (linkId) {
            await supabaseAdmin.from('influencer_links').update({
              status: 'booked',
              booking_id: bookedRecordId,
              commission_earned: commissionAmount
            }).eq('id', linkId)
          }
        }
      }
    } catch (e) { console.error('Side logic failed:', e) }

    revalidatePath('/guest')
    revalidatePath(`/guest/property/${propertyId}`)
    
    // Notifications
    try {
      const { data: p } = await supabaseAdmin.from('properties').select('name').eq('id', propertyId).single()
      const roomSummary = roomSelections.map(r => `${r.quantity}x ${r.name || 'Room'}`).join(', ')
      const { sendBookingNotifications } = await import('@/utils/notifications')
      await sendBookingNotifications({
        guestName: guestData.name,
        guestEmail: guestData.email,
        guestPhone: guestData.phone,
        propertyName: p?.name || 'FixStay Property',
        roomCategory: roomSummary || 'Rooms',
        amount: authoritativeAmount,
        bookingId: bookedRecordId
      })
    } catch (e) {}

    return { success: true }
  } catch (err: any) {
    return { error: 'An unexpected error occurred during confirmation.' }
  }
}

