'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function logClick(propertyId: string, influencerId: string) {
  const supabase = await createClient()

  // Attempt to insert a click record. Fail silently if invalid influencer.
  // In a robust system, we'd debounce or cookie-check to prevent spam.
  const { error } = await supabase.from('influencer_clicks').insert([{
    property_id: propertyId,
    influencer_id: influencerId
  }])

  if (error) {
    console.error('Failed to log influencer click', error)
  }
}

export async function bookRoom(propertyId: string, roomId: string, amount: number, formData: FormData) {
  try {
    const supabase = await createClient()

    const guestName = formData.get('guestName') as string
    const guestEmail = formData.get('guestEmail') as string
    const guestPhone = formData.get('guestPhone') as string
    const influencerId = formData.get('influencerId') as string || null

    // 1. Check room availability
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: availability } = await supabase
      .from('room_availability')
      .select('*')
      .eq('room_id', roomId)
      .eq('date', todayStr)
      .maybeSingle()

    if (availability && !availability.available) {
      return { error: 'Room is no longer available.' }
    }

    // Check if already booked today
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id, created_at')
      .eq('room_id', roomId)

    const isBookedToday = existingBookings?.some(b => new Date(b.created_at).toISOString().split('T')[0] === todayStr)
    if (isBookedToday) {
      return { error: 'Room was just booked by someone else. Refresh and try another.' }
    }

    // 2. Insert booking (use admin client to bypass RLS)
    const supabaseAdmin = createAdminClient()

    const { data: insertedBooking, error: bookingError } = await supabaseAdmin.from('bookings').insert([{
      property_id: propertyId,
      room_id: roomId,
      influencer_id: influencerId,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      amount
    }]).select().single()

    if (bookingError || !insertedBooking) {
      console.error('Booking insert failed:', bookingError)
      return { error: 'Booking failed. Please try again.' }
    }

    // 3. Financial Splits & Wallet Ledger (non-fatal)
    try {
      const bookingId = insertedBooking.id
      const { data: prop } = await supabaseAdmin.from('properties').select('owner_id').eq('id', propertyId).single()
      const ownerId = prop?.owner_id

      if (ownerId) {
        const ownerEarning = amount * 0.80
        await supabaseAdmin.from('wallet_transactions').insert({
          user_id: ownerId,
          amount: ownerEarning,
          transaction_type: 'earning',
          booking_id: bookingId,
          description: `Booking payout for ${guestName}`
        })
      }

      if (influencerId) {
        const { data: inf } = await supabaseAdmin.from('influencers').select('commission_rate').eq('id', influencerId).single()
        const rate = inf?.commission_rate || 0
        if (rate > 0) {
          const influencerEarning = amount * (rate / 100)
          await supabaseAdmin.from('wallet_transactions').insert({
            user_id: influencerId,
            amount: influencerEarning,
            transaction_type: 'earning',
            booking_id: bookingId,
            description: `Commission for referring ${guestName} (${rate}%)`
          })
        }
      }
    } catch (walletErr) {
      console.error('Wallet ledger creation failed (non-fatal):', walletErr)
    }

    revalidatePath('/guest')
    revalidatePath(`/guest/property/${propertyId}`)

    // 4. Send Notifications (Email & SMS) - Non-fatal, async
    try {
      // Find property and room details for the message
      const { data: prop } = await supabaseAdmin.from('properties').select('name').eq('id', propertyId).single()
      const { data: room } = await supabaseAdmin.from('rooms').select('category').eq('id', roomId).single()
      
      const { sendBookingNotifications } = await import('@/utils/notifications')
      await sendBookingNotifications({
        guestName,
        guestEmail,
        guestPhone,
        propertyName: prop?.name || 'FixStay Property',
        roomCategory: room?.category || 'Standard',
        amount,
        bookingId: insertedBooking.id
      })
    } catch (notifyErr) {
      console.error('Notification dispatch failed:', notifyErr)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error in bookRoom:', err)
    return { error: err?.message || 'An unexpected error occurred. Please try again.' }
  }
}

