'use server'

import { createClient } from '@/utils/supabase/server'
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
  const supabase = await createClient()

  const guestName = formData.get('guestName') as string
  const guestPhone = formData.get('guestPhone') as string
  const influencerId = formData.get('influencerId') as string || null

  // 1. Double check room availability for today (simplification for MVP logic)
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: availability } = await supabase
    .from('room_availability')
    .select('*')
    .eq('room_id', roomId)
    .eq('date', todayStr)
    .single()

  if (availability && !availability.available) {
    throw new Error('Room is no longer available.')
  }

  // Check if already booked today
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('id, created_at')
    .eq('room_id', roomId)

  const isBookedToday = existingBookings?.some(b => new Date(b.created_at).toISOString().split('T')[0] === todayStr)
  
  if (isBookedToday) {
    throw new Error('Room was just booked by someone else.')
  }

  // 2. Insert booking
  const { error } = await supabase.from('bookings').insert([{
    property_id: propertyId,
    room_id: roomId,
    influencer_id: influencerId,
    guest_name: guestName,
    guest_phone: guestPhone,
    amount
  }])

  if (error) {
    console.error('Booking failed', error)
    throw new Error('Booking failed: ' + error.message)
  }

  revalidatePath('/guest')
  revalidatePath(`/guest/property/${propertyId}`)
  
  return { success: true }
}
