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

export async function bookRoom(
  propertyId: string, 
  roomId: string, 
  amount: number, 
  checkinDate: string,
  checkoutDate: string,
  formData: FormData
) {
  try {
    const supabase = await createClient()

    const guestName = formData.get('guestName') as string
    const guestEmail = formData.get('guestEmail') as string
    const guestPhone = formData.get('guestPhone') as string
    const influencerId = formData.get('influencerId') as string || null

    if (!checkinDate || !checkoutDate) {
      return { error: 'Please select valid check-in and check-out dates.' }
    }

    // 1. Check room availability (Overlapping bookings)
    // A room is unavailable if an existing booking overlaps:
    // existing.checkin < stay.checkout AND existing.checkout > stay.checkin
    const { data: existingBookings, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, checkin_date, checkout_date')
      .eq('room_id', roomId)

    if (fetchErr) {
      console.error('Error checking availability:', fetchErr)
    } else {
      const hasOverlap = existingBookings?.some(b => {
        if (!b.checkin_date || !b.checkout_date) return false
        return b.checkin_date < checkoutDate && b.checkout_date > checkinDate
      })

      if (hasOverlap) {
        return { error: 'This room was just booked for these dates. Please try another room or date.' }
      }
    }

    // Also check manual blocks
    const { data: blocks } = await supabase
      .from('room_availability')
      .select('date')
      .eq('room_id', roomId)
      .eq('available', false)
      .gte('date', checkinDate)
      .lt('date', checkoutDate)

    if (blocks && blocks.length > 0) {
      return { error: 'Some dates in your stay are manually blocked by the owner.' }
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
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
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

