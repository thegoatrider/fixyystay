'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addRoom(propertyId: string, formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const acType = formData.get('acType') as string
  const roomCategory = formData.get('category') as string
  const category = `${acType} ${roomCategory}`
  const basePrice = Number(formData.get('basePrice'))
  
  const priceBucket = formData.get('priceBucket') as string
  if (!priceBucket) {
    throw new Error('Price Bucket must be selected.')
  }

  // Handle Image Upload
  const imageFile = formData.get('image') as File
  let image_url = null
  
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `room-${propertyId}-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('property_images')
      .upload(fileName, imageFile)
      
    if (uploadError) {
      console.error('Failed to upload room image:', uploadError)
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('property_images')
        .getPublicUrl(fileName)
        
      image_url = publicUrlData.publicUrl
    }
  }

  const { error } = await supabase.from('rooms').insert([{
    property_id: propertyId,
    name,
    category,
    base_price: basePrice,
    price_bucket: priceBucket,
    image_url
  }])

  if (error) {
    console.error('Failed to add room', error)
    throw new Error('Failed to add room: ' + error.message)
  }

  revalidatePath(`/dashboard/owner/property/${propertyId}`)
}

export async function setRoomAvailability(propertyId: string, roomId: string, dateStr: string, available: boolean) {
  const supabase = await createClient()

  const { error } = await supabase.from('room_availability').upsert({
    room_id: roomId,
    date: dateStr,
    available
  }, { onConflict: 'room_id, date' })

  if (error) {
    console.error('Failed to update availability', error)
    throw new Error('Failed to update availability: ' + error.message)
  }

  revalidatePath(`/dashboard/owner/property/${propertyId}`)
}

export async function setRoomRate(propertyId: string, roomId: string, dateStr: string, price: number) {
  const supabase = await createClient()

  const { error } = await supabase.from('room_rates').upsert({
    room_id: roomId,
    date: dateStr,
    price
  }, { onConflict: 'room_id, date' })

  if (error) {
    console.error('Failed to update rate', error)
    throw new Error('Failed to update rate: ' + error.message)
  }

  revalidatePath(`/dashboard/owner/property/${propertyId}`)
}
