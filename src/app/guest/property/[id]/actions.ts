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
      // If error is about missing column guest_email, inform the user
      if (bookingError?.message?.includes('column "guest_email" does not exist')) {
        return { error: 'Database schema mismatch: guest_email column is missing. Please run notifications_migration.sql.' }
      }
      return { error: `Booking failed: ${bookingError?.message || 'Unknown error'}` }
    }

    // 3. Financial Splits & Wallet Ledger (non-fatal)
    try {
      const bookingId = insertedBooking.id
      const { data: prop } = await supabaseAdmin
        .from('properties')
        .select('owners(user_id)')
        .eq('id', propertyId)
        .single()
      
      const ownerUserId = (prop as any)?.owners?.user_id

      if (ownerUserId) {
        const ownerEarning = amount * 0.80
        await supabaseAdmin.from('wallet_transactions').insert({
          user_id: ownerUserId,
          amount: ownerEarning,
          transaction_type: 'earning',
          booking_id: bookingId,
          description: `Booking payout for ${guestName}`
        })
      }

      const infId = influencerId
      if (infId) {
        // Here influencers use auth.users(id) directly or we need to find their user_id
        // Assuming influencers table 'id' matches auth.users(id) or we need to look it up.
        // Let's check influencers table.
        const { data: inf } = await supabaseAdmin.from('influencers').select('commission_rate, user_id').eq('id', infId).single()
        const rate = inf?.commission_rate || 0
        const infUserId = inf?.user_id || infId // Fallback to infId if it's already a user_id
        
        if (rate > 0 && infUserId) {
          const influencerEarning = amount * (rate / 100)
          await supabaseAdmin.from('wallet_transactions').insert({
            user_id: infUserId,
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

