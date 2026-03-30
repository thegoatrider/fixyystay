'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    // Edge case: Profile doesn't exist for an old user
    // Auto-create profile if missing
    const supabaseAdmin = createAdminClient()
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Guest',
        email: user.email,
        phone: user.user_metadata?.phone || ''
      }, { onConflict: 'id' })
      .select()
      .single()

    if (createError) {
      console.error('Error auto-creating profile:', createError)
      return { error: 'Failed to find or create profile' }
    }
    return { data: newProfile }
  }

  return { data: profile }
}

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone: phone,
      email: email,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error)
    return { error: error.message }
  }

  revalidatePath('/guest/profile')
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('avatar') as File
  if (!file) return { error: 'No file provided' }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-${Math.random()}.${fileExt}`
  const filePath = `${fileName}`

  // 1. Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Avatar upload failed:', uploadError)
    return { error: uploadError.message }
  }

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  // 3. Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/guest/profile')
  return { success: true, url: publicUrl }
}

export async function getUserBookings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      properties (name, city_area, image_url),
      rooms (category)
    `)
    .eq('user_id', user.id)
    .order('checkin_date', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    return { error: error.message }
  }

  const today = new Date().toISOString().split('T')[0]
  
  const upcoming = bookings.filter(b => b.checkin_date && b.checkin_date >= today)
  const past = bookings.filter(b => b.checkout_date && b.checkout_date < today)

  return { data: { upcoming, past } }
}
