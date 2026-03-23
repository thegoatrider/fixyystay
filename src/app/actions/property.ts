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
  const amenities = formData.getAll('amenities') as string[]
  
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

  // 4. Update property
  const { error: updateError } = await supabaseAdmin
    .from('properties')
    .update({
      name,
      amenities,
      image_urls,
      image_url: image_urls[0] || null, // Keep backward compatibility
    })
    .eq('id', propertyId)

  if (updateError) {
    console.error('Property update error:', updateError)
    return { error: `Update failed: ${updateError.message}` }
  }

  // 5. Revalidate paths to reflect changes
  revalidatePath('/dashboard/owner/property/[id]', 'page')
  revalidatePath('/dashboard/admin/properties/[id]', 'page')
  revalidatePath(`/guest/property/${propertyId}`)
  revalidatePath('/dashboard/owner')
  
  return { success: true }
}
