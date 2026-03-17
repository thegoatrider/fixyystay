'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProperty(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'A valid session is required. Please log in.' }
  
  if (user?.user_metadata?.role !== 'owner') {
    return { error: 'Access denied. You must be an Owner to create properties.' }
  }

  const { data: owner, error: ownerError } = await supabase.from('owners').select('id').eq('user_id', user.id).single()
  if (ownerError || !owner) {
    console.error('Owner fetch error:', ownerError)
    return { error: 'Owner record not found. Was your account verified as an owner?' }
  }

  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const amenities = (formData.get('amenities') as string).split(',').map(s => s.trim())
  const priceBucket = formData.get('priceBucket') as string
  const latitude = Number(formData.get('latitude')) || 0
  const longitude = Number(formData.get('longitude')) || 0
  const cityArea = formData.get('cityArea') as string
  
  // Handle Image Upload
  const imageFile = formData.get('image') as File
  let image_url = null
  
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${owner.id}-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('property_images')
      .upload(fileName, imageFile)
      
    if (uploadError) {
      console.error('Failed to upload image:', uploadError)
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('property_images')
        .getPublicUrl(fileName)
        
      image_url = publicUrlData.publicUrl
    }
  }
  
  const { data, error } = await supabase
    .from('properties')
    .insert([{
      owner_id: owner.id,
      name,
      type,
      description,
      amenities,
      image_url,
      helpdesk_number: formData.get('helpdeskNumber') as string,
      city_area: cityArea,
      latitude,
      longitude,
      approved: false // starts false as per prompt
    }])
    .select()
    .single()

  if (error) {
    console.error('Failed to create property:', error)
    return { error: 'Failed to create property record in database' }
  }

  // Automatically provision a default room so the property inherits the max price bucket
  if (priceBucket) {
    const { error: roomError } = await supabase.from('rooms').insert([{
      property_id: data.id,
      name: type === 'villa' ? 'Entire Villa' : 'Standard Room',
      category: 'Standard',
      base_price: Number(priceBucket.replace(/[^0-9]/g, '')) || 0,
      price_bucket: priceBucket,
      image_url: null
    }])
    if (roomError) {
      console.error('Failed to create default room:', roomError)
      // We don't necessarily fail the whole thing, but it's good to know
    }
  }

  revalidatePath('/dashboard/owner')
  return { success: true, id: data.id }
}
