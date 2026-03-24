'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function addRoom(propertyId: string, formData: FormData) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    const name = formData.get('name') as string
    const acType = formData.get('acType') as string
    const roomCategory = formData.get('category') as string
    const category = `${acType} ${roomCategory}`
    const basePrice = Number(formData.get('basePrice'))
    
    const priceBucket = formData.get('priceBucket') as string
    if (!priceBucket) {
      return { error: 'Price Bucket must be selected.' }
    }

    // Handle Multiple Image Uploads
    const imageFiles = formData.getAll('image') as File[]
    const image_urls: string[] = []
    
    for (const imageFile of imageFiles) {
      if (imageFile && imageFile.size > 0) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `room-${propertyId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        
        const { error: uploadError } = await supabaseAdmin.storage
          .from('property_images')
          .upload(fileName, imageFile)
          
        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('property_images')
            .getPublicUrl(fileName)
            
          image_urls.push(publicUrlData.publicUrl)
        } else {
          console.error('Failed to upload room image:', uploadError)
        }
      }
    }

    const { error } = await supabase.from('rooms').insert([{
      property_id: propertyId,
      name,
      category,
      base_price: basePrice,
      price_bucket: priceBucket,
      image_urls,
      image_url: image_urls[0] || null // Backward compatibility
    }])

    if (error) {
      console.error('Failed to add room', error)
      return { error: 'Failed to add room: ' + error.message }
    }

    revalidatePath(`/dashboard/owner/property/${propertyId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function setRoomAvailability(propertyId: string, roomId: string, dateStr: string, available: boolean) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('room_availability').upsert({
      room_id: roomId,
      date: dateStr,
      available
    }, { onConflict: 'room_id, date' })

    if (error) {
      console.error('Failed to update availability', error)
      return { error: 'Failed to update availability: ' + error.message }
    }

    revalidatePath(`/dashboard/owner/property/${propertyId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function setRoomRate(propertyId: string, roomId: string, dateStr: string, price: number) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('room_rates').upsert({
      room_id: roomId,
      date: dateStr,
      price
    }, { onConflict: 'room_id, date' })

    if (error) {
      console.error('Failed to update rate', error)
      return { error: 'Failed to update rate: ' + error.message }
    }

    revalidatePath(`/dashboard/owner/property/${propertyId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function setMultipleRoomAvailability(propertyId: string, roomId: string, dateStrings: string[], available: boolean) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('room_availability').upsert(
      dateStrings.map(date => ({
        room_id: roomId,
        date,
        available
      })), 
      { onConflict: 'room_id, date' }
    )

    if (error) {
      console.error('Failed to update bulk availability', error)
      return { error: 'Failed to update bulk availability: ' + error.message }
    }

    revalidatePath(`/dashboard/owner/property/${propertyId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function setMultipleRoomRates(propertyId: string, roomId: string, dateStrings: string[], price: number) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('room_rates').upsert(
      dateStrings.map(date => ({
        room_id: roomId,
        date,
        price
      })), 
      { onConflict: 'room_id, date' }
    )

    if (error) {
      console.error('Failed to update bulk rates', error)
      return { error: 'Failed to update bulk rates: ' + error.message }
    }

    revalidatePath(`/dashboard/owner/property/${propertyId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

