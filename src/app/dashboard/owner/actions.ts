'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createProperty(formData: FormData) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  // 1. Verify session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please log in again.' }

  if (user.user_metadata?.role !== 'owner') {
    return { error: 'Access denied. Your account is not registered as an Owner.' }
  }

  // 2. Get owner record (using admin to bypass any RLS)
  const { data: owner, error: ownerError } = await supabaseAdmin
    .from('owners')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (ownerError || !owner) {
    console.error('Owner lookup failed:', ownerError)
    return { error: `Owner profile not found. Contact support. (uid: ${user.id})` }
  }

  // 3. Extract form fields
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const amenities = formData.getAll('amenities') as string[]
  const priceBucket = formData.get('priceBucket') as string
  const latitude = parseFloat(formData.get('latitude') as string) || 0
  const longitude = parseFloat(formData.get('longitude') as string) || 0
  const cityArea = formData.get('cityArea') as string
  const helpdeskNumber = formData.get('helpdeskNumber') as string
  const max_guests = parseInt(formData.get('max_guests') as string) || 2
  const max_capacity = parseInt(formData.get('max_capacity') as string) || 20
  const extra_per_pax = parseFloat(formData.get('extra_per_pax') as string) || 0

  // 4. Handle multiple image uploads
  const imageFiles = formData.getAll('image') as File[]
  const image_urls: string[] = []
  
  for (const imageFile of imageFiles) {
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `prop-${owner.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('property_images')
        .upload(fileName, imageFile)
        
      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(fileName)
        image_urls.push(urlData.publicUrl)
      } else {
        console.error('Image upload failed:', uploadError)
      }
    }
  }

  // 5. Insert property (admin bypasses RLS)
  const { data: property, error: insertError } = await supabaseAdmin
    .from('properties')
    .insert({
      owner_id: owner.id,
      name,
      type,
      description,
      amenities,
      image_urls,
      image_url: image_urls[0] || null, // Keep for backward compatibility
      helpdesk_number: helpdeskNumber,
      city_area: cityArea,
      latitude,
      longitude,
      approved: false,
      max_guests,
      max_capacity,
      extra_per_pax,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Property insert error:', insertError)
    return { error: `DB Error (${insertError.code}): ${insertError.message}` }
  }

  // 6. Create a default room
  if (priceBucket && property?.id) {
    const basePrice = parseInt(priceBucket.replace(/[^0-9]/g, ''), 10) || 0
    const { error: roomError } = await supabaseAdmin.from('rooms').insert({
      property_id: property.id,
      name: type === 'villa' ? 'Entire Villa' : 'Standard Room',
      category: 'Standard',
      base_price: basePrice,
      price_bucket: priceBucket,
      is_ac: true,
    })
    if (roomError) console.error('Default room error (non-fatal):', roomError)
  }

  revalidatePath('/dashboard/owner')
  return { success: true, id: property.id }
}
