'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getCityCode } from '@/lib/india-locations'

function isUserAdmin(user: any): boolean {
  if (!user) return false
  const email = (user.email || '').toLowerCase().trim()
  const userRole = (user.user_metadata?.role || '').toLowerCase().trim()
  const appRole = (user.app_metadata?.role || '').toLowerCase().trim()
  
  return (
    email === 'superadmin@fixstay.com' ||
    email === 'admin@fixstay.com' ||
    email.endsWith('@fixstay.com') ||
    userRole === 'admin' ||
    userRole === 'superadmin' ||
    appRole === 'admin' ||
    appRole === 'superadmin'
  )
}

export async function uploadPropertyImage(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Session expired. Please log in again.' }

    const file = formData.get('file') as File | null
    const prefix = (formData.get('prefix') as string) || 'prop'
    if (!file || file.size === 0) {
      return { error: 'No valid image file provided.' }
    }

    const supabaseAdmin = createAdminClient()
    const rawExt = file.name && file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const fileExt = (rawExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
    const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('property_images')
      .upload(fileName, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Single image upload failed:', uploadError)
      return { error: `Image upload failed: ${uploadError.message}` }
    }

    const { data: urlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(fileName)
    return { success: true, url: urlData.publicUrl }
  } catch (err: any) {
    console.error('UNEXPECTED ERROR in uploadPropertyImage:', err)
    return { error: err.message || 'Failed to upload image.' }
  }
}

export async function updateProperty(propertyId: string, formData: FormData) {
  try {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  // 1. Verify session & authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please log in again.' }

  const isAdmin = isUserAdmin(user)
  
  // Verify ownership if not admin
  if (!isAdmin) {
    let { data: owner } = await supabaseAdmin.from('owners').select('id').eq('user_id', user.id).maybeSingle()
    if (!owner && user.email) {
      const { data: matchedOwner } = await supabaseAdmin
        .from('owners')
        .select('id')
        .eq('email', user.email.toLowerCase().trim())
        .maybeSingle()
      if (matchedOwner) {
        owner = matchedOwner
        await supabaseAdmin.from('owners').update({ user_id: user.id }).eq('id', matchedOwner.id)
      }
    }
    if (!owner) return { error: 'Owner profile not found.' }
    
    const { data: prop } = await supabaseAdmin.from('properties').select('id, owner_id').eq('id', propertyId).maybeSingle()
    if (!prop) return { error: 'Property not found.' }
    
    // If property has no owner, self-heal and associate with this owner
    if (!prop.owner_id) {
      await supabaseAdmin.from('properties').update({ owner_id: owner.id }).eq('id', propertyId)
    } else if (prop.owner_id !== owner.id) {
      return { error: 'You do not have permission to edit this property.' }
    }
  }

  // 2. Extract fields
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const house_rules = formData.get('houseRules') as string
  const type = formData.get('type') as string
  const max_guests = parseInt(formData.get('max_guests') as string) || 2
  const max_capacity = parseInt(formData.get('max_capacity') as string) || 20
  const extra_per_pax = parseInt(formData.get('extra_per_pax') as string) || 0
  const city = formData.get('city') as string
  const city_area = formData.get('cityArea') as string
  const pincode = formData.get('pincode') as string
  const helpdesk_number = formData.get('helpdeskNumber') as string
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

  // 2.5 Append pre-uploaded gallery URLs if uploaded client-side via uploadPropertyImage
  const uploadedGalleryUrlsStr = formData.get('uploadedGalleryUrls') as string | null
  if (uploadedGalleryUrlsStr) {
    try {
      const parsedUrls = JSON.parse(uploadedGalleryUrlsStr)
      if (Array.isArray(parsedUrls)) {
        image_urls.push(...parsedUrls.filter((u): u is string => typeof u === 'string' && u.length > 0))
      }
    } catch (e) {}
  }

  // 3. Handle new image uploads (fallback if File objects were passed directly)
  const imageFiles = formData.getAll('newImages') as File[]
  const validNewFilesCount = imageFiles.filter(file => file && typeof file === 'object' && file.size > 0).length
  if (image_urls.length + validNewFilesCount > 15) {
    return { error: 'only 15 pictures of property are permitted.' }
  }
  
  const uploadPromises = imageFiles.map(async (imageFile) => {
    if (imageFile && typeof imageFile === 'object' && imageFile.size > 0) {
      const rawExt = imageFile.name && imageFile.name.includes('.') ? imageFile.name.split('.').pop() : 'jpg'
      const fileExt = (rawExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
      const fileName = `prop-update-${propertyId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('property_images')
        .upload(fileName, imageFile)
        
      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(fileName)
        return urlData.publicUrl
      } else {
        console.error('Image upload failed during update:', uploadError)
        return null
      }
    }
    return null
  })

  const uploadedUrls = await Promise.all(uploadPromises)
  const validUrls = uploadedUrls.filter((url): url is string => url !== null)
  image_urls.push(...validUrls)

  // 3.5 Handle new Cover Image upload
  const uploadedCoverUrl = formData.get('uploadedCoverUrl') as string | null
  const coverImageFile = formData.get('coverImage') as File | null;
  let newCoverImageUrl: string | null = uploadedCoverUrl && uploadedCoverUrl.trim().length > 0 ? uploadedCoverUrl.trim() : null;

  if (!newCoverImageUrl && coverImageFile && typeof coverImageFile === 'object' && coverImageFile.size > 0) {
    const rawExt = coverImageFile.name && coverImageFile.name.includes('.') ? coverImageFile.name.split('.').pop() : 'jpg'
    const fileExt = (rawExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
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

  // 3.8 Check and generate UID if missing (for dummy properties)
  const { data: currentProp } = await supabaseAdmin.from('properties').select('uid, city, image_url').eq('id', propertyId).single()
  let uid = currentProp?.uid

  if (!uid && city) {
    const prefix = getCityCode(city)
    const { data: properties } = await supabaseAdmin
      .from('properties')
      .select('uid')
      .like('uid', `${prefix}%`)
      .order('uid', { ascending: false })
      .limit(1)
      
    let nextNum = 1
    if (properties && properties.length > 0 && properties[0].uid) {
      const lastUid = properties[0].uid
      const match = lastUid.match(/\d+$/)
      if (match) {
        nextNum = parseInt(match[0], 10) + 1
      }
    }
    uid = `${prefix}${nextNum.toString().padStart(4, '0')}`
  }

  // 4. Update property
  const updatePayload: any = {
    name,
    description,
    type: type || undefined,
    house_rules,
    amenities: allAmenities,
    image_urls,
    max_guests,
    max_capacity,
    extra_per_pax,
    city,
    city_area,
    pincode,
    helpdesk_number,
    ...(uid ? { uid } : {})
  }
  
  if (newCoverImageUrl) {
    updatePayload.image_url = newCoverImageUrl
  } else if (!currentProp?.image_url && image_urls.length > 0) {
    updatePayload.image_url = image_urls[0]
  }

  const targetOwnerId = formData.get('owner_id') as string | null
  if (isAdmin && targetOwnerId) {
    updatePayload.owner_id = targetOwnerId
  }


  const { error: updateError } = await supabaseAdmin
    .from('properties')
    .update(updatePayload)
    .eq('id', propertyId)

  if (updateError) {
    console.error('Property update error:', updateError)
    return { error: `Update failed: ${updateError.message}` }
  }

  // 4.5 Handle initial room creation or villa sync
  const priceBucket = formData.get('priceBucket') as string
  const basePrice = priceBucket ? (parseInt(priceBucket.replace(/[^0-9]/g, ''), 10) || 0) : 0

  const { data: rooms } = await supabaseAdmin.from('rooms').select('id, category').eq('property_id', propertyId)
  
  if (type === 'villa') {
    if (rooms && rooms.length > 0) {
      // Update existing villa room
      const updateData: any = {
        base_capacity: max_guests,
        max_capacity: max_capacity,
      }
      if (priceBucket) {
        updateData.price_bucket = priceBucket
        updateData.base_price = basePrice
      }
      await supabaseAdmin.from('rooms').update(updateData).eq('property_id', propertyId).eq('category', 'Villa')
    } else if (priceBucket) {
      // Create initial villa room if missing (e.g. converted from dummy)
      await supabaseAdmin.from('rooms').insert({
        property_id: propertyId,
        name: 'Entire Villa',
        category: 'Villa',
        base_price: basePrice,
        price_bucket: priceBucket,
        base_capacity: max_guests,
        max_capacity: max_capacity,
      })
    }
  } else {
    // Multi-room property
    if ((!rooms || rooms.length === 0) && priceBucket) {
      // Create initial standard room if it's a dummy property being setup
      await supabaseAdmin.from('rooms').insert({
        property_id: propertyId,
        name: 'Standard Room',
        category: 'Standard',
        base_price: basePrice,
        price_bucket: priceBucket,
      })
    }
  }

  // 5. Revalidate paths to reflect changes
  revalidatePath('/dashboard/owner/property/[id]', 'page')
  revalidatePath('/dashboard/owner/property/[id]/edit', 'page')
  revalidatePath(`/dashboard/owner/property/${propertyId}`)
  revalidatePath(`/dashboard/owner/property/${propertyId}/edit`)
  revalidatePath('/dashboard/admin/properties/[id]', 'page')
  revalidatePath(`/guest/property/${propertyId}`)
  revalidatePath('/dashboard/owner')
  revalidatePath('/guest')
  revalidatePath('/')
  
  return { 
    success: true,
    image_urls,
    image_url: updatePayload.image_url || currentProp?.image_url || null
  }
  } catch (err: any) {
    console.error('UNEXPECTED ERROR in updateProperty:', err)
    return { error: `Server Error: ${err.message || String(err)}` }
  }
}
