'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateProperty(propertyId: string, formData: FormData) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  // 1. Verify session & authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please log in again.' }

  const isSuperAdmin = user.email === 'superadmin@fixstay.com'
  
  // Verify ownership if not admin
  if (!isSuperAdmin) {
    const { data: owner } = await supabaseAdmin.from('owners').select('id').eq('user_id', user.id).single()
    if (!owner) return { error: 'Owner profile not found.' }
    
    const { data: prop } = await supabaseAdmin.from('properties').select('id').eq('id', propertyId).eq('owner_id', owner.id).single()
    if (!prop) return { error: 'You do not have permission to edit this property.' }
  }

  // 2. Extract fields
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const house_rules = formData.get('houseRules') as string
  const max_guests = parseInt(formData.get('max_guests') as string) || 2
  const max_capacity = parseInt(formData.get('max_capacity') as string) || 20
  const amenities = formData.getAll('amenities') as string[]
  const otherAmenitiesRaw = formData.get('otherAmenities') as string || ''
  const otherAmenities = otherAmenitiesRaw.split(',').map(s => s.trim()).filter(s => s !== '')
  const allAmenities = Array.from(new Set([...amenities, ...otherAmenities]))
  
  // Parse existing photos to keep
  const existingPhotosStr = formData.get('existingPhotos') as string
  let image_urls: string[] = []
  if (existingPhotosStr) {
    try {
      image_urls = JSON.parse(existingPhotosStr)
    } catch(e) {}
  }

  // 3. Handle new image uploads
  const imageFiles = formData.getAll('newImages') as File[]
  
  for (const imageFile of imageFiles) {
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `prop-update-${propertyId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('property_images')
        .upload(fileName, imageFile)
        
      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(fileName)
        image_urls.push(urlData.publicUrl)
      } else {
        console.error('Image upload failed during update:', uploadError)
      }
    }
  }

  // 3.5 Handle new Cover Image upload
  const coverImageFile = formData.get('coverImage') as File | null;
  let newCoverImageUrl: string | null = null;

  if (coverImageFile && coverImageFile.size > 0) {
    const fileExt = coverImageFile.name.split('.').pop()
    const fileName = `prop-cover-update-${propertyId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('property_images')
      .upload(fileName, coverImageFile)
      
    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(fileName)
      newCoverImageUrl = urlData.publicUrl
    } else {
      console.error('Cover image upload failed during update:', uploadError)
    }
  }

  // 4. Update property
  const updatePayload: any = {
    name,
    description,
    house_rules,
    amenities: allAmenities,
    image_urls,
    max_guests,
    max_capacity,
  }
  
  if (newCoverImageUrl) {
    updatePayload.image_url = newCoverImageUrl
  } else if (image_urls.length === 0) {
    // If they wipe out all images and never set a cover, we can null it out, 
    // though usually cover remains untouched. I'll leave it unchanged unless new cover uploaded.
  }

  const { error: updateError } = await supabaseAdmin
    .from('properties')
    .update(updatePayload)
    .eq('id', propertyId)

  if (updateError) {
    console.error('Property update error:', updateError)
    return { error: `Update failed: ${updateError.message}` }
  }

  // 4.5 Sync villa capacity if it's a villa
  const { data: propData } = await supabaseAdmin.from('properties').select('type').eq('id', propertyId).single()
  if (propData?.type === 'villa') {
    await supabaseAdmin.from('rooms').update({
      base_capacity: max_guests,
      max_capacity: max_capacity,
    }).eq('property_id', propertyId).eq('category', 'Villa')
  }

  // 5. Revalidate paths to reflect changes
  revalidatePath('/dashboard/owner/property/[id]', 'page')
  revalidatePath('/dashboard/admin/properties/[id]', 'page')
  revalidatePath(`/guest/property/${propertyId}`)
  revalidatePath('/dashboard/owner')
  
  return { success: true }
}
