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

export async function saveMultipleChanges(
  propertyId: string, 
  roomId: string, 
  dateStrings: string[], 
  available: boolean | null, 
  price: number | null
) {
  try {
    const supabase = await createClient()

    const promises = []

    if (available !== null) {
      promises.push(
        supabase.from('room_availability').upsert(
          dateStrings.map(date => ({
            room_id: roomId,
            date,
            available
          })), 
          { onConflict: 'room_id, date' }
        )
      )
    }

    if (price !== null && !isNaN(price)) {
      promises.push(
        supabase.from('room_rates').upsert(
          dateStrings.map(date => ({
            room_id: roomId,
            date,
            price
          })), 
          { onConflict: 'room_id, date' }
        )
      )
    }

    if (promises.length === 0) return { success: true }

    const results = await Promise.all(promises)
    const error = results.find(r => r.error)?.error

    if (error) {
      console.error('Failed to save multiple changes', error)
      return { error: 'Failed to save changes: ' + error.message }
    }

    revalidatePath(`/dashboard/owner/property/${propertyId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function updateRoomCategories(propertyId: string, categories: any[]) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('properties')
      .update({ room_categories: categories })
      .eq('id', propertyId)

    if (error) throw error

    // After updating categories metadata, sync the rooms table
    for (const cat of categories) {
      await syncCategoryRooms(propertyId, cat.name, cat.count, cat.base_price, cat.price_bucket)
    }

    revalidatePath(`/dashboard/owner/property/${propertyId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function syncCategoryRooms(
  propertyId: string, 
  categoryName: string, 
  targetCount: number, 
  basePrice: number, 
  priceBucket: string
) {
  try {
    const supabaseAdmin = createAdminClient()
    
    // Get current rooms in this category
    const { data: currentRooms } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('property_id', propertyId)
      .eq('category', categoryName)

    const currentCount = currentRooms?.length || 0

    if (currentCount < targetCount) {
      // Add rooms
      const toAdd = targetCount - currentCount
      const newRooms = Array.from({ length: toAdd }).map((_, i) => ({
        property_id: propertyId,
        name: `${categoryName} Room ${currentCount + i + 1}`,
        category: categoryName,
        base_price: basePrice,
        price_bucket: priceBucket,
        is_ac: true // Default
      }))
      await supabaseAdmin.from('rooms').insert(newRooms)
    } else if (currentCount > targetCount) {
      // Remove rooms (simplification: remove the most recently added ones)
      // Ideally check for bookings before removing
      const toRemove = currentCount - targetCount
      const roomsToRemove = currentRooms!.slice(-toRemove).map(r => r.id)
      await supabaseAdmin.from('rooms').delete().in('id', roomsToRemove)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Sync error:', err)
    return { error: err.message }
  }
}

export async function saveCategoryChanges(
  propertyId: string,
  categoryName: string,
  dateStrings: string[],
  roomsToUpdateCount: number,
  available: boolean | null,
  price: number | null
) {
  try {
    const supabaseAdmin = createAdminClient()
    
    // 1. Get all room IDs for this category
    const { data: rooms } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('property_id', propertyId)
      .eq('category', categoryName)

    if (!rooms || rooms.length === 0) return { error: 'No rooms found in this category' }

    // 2. For each date, identify which rooms to update
    const promises = []

    for (const date of dateStrings) {
      // Find currently available rooms for this specific date
      const { data: availabilityInfo } = await supabaseAdmin
        .from('room_availability')
        .select('room_id, available')
        .in('room_id', rooms.map(r => r.id))
        .eq('date', date)

      const blockedRoomIds = new Set(availabilityInfo?.filter(a => !a.available).map(a => a.room_id) || [])
      
      // If we are blocking, we want to block 'roomsToUpdateCount' rooms.
      // If we are pricing, we apply to 'roomsToUpdateCount' rooms? 
      // User said "select a subset of number of rooms to edit". 
      // Usually this means "I want to block 2 rooms today".
      
      let targetRoomIds: string[] = []

      if (available === false) {
        // We want to block N rooms. 
        // Pick rooms that are currently NOT blocked.
        const freeRooms = rooms.filter(r => !blockedRoomIds.has(r.id)).map(r => r.id)
        targetRoomIds = freeRooms.slice(0, roomsToUpdateCount)
      } else if (available === true) {
        // We want to open N rooms.
        // Pick rooms that ARE currently blocked.
        const blockedRooms = rooms.filter(r => blockedRoomIds.has(r.id)).map(r => r.id)
        targetRoomIds = blockedRooms.slice(0, roomsToUpdateCount)
      } else {
        // Just pricing? Apply to the first N rooms.
        targetRoomIds = rooms.slice(0, roomsToUpdateCount).map(r => r.id)
      }

      if (targetRoomIds.length > 0) {
        if (available !== null) {
          promises.push(
            supabaseAdmin.from('room_availability').upsert(
              targetRoomIds.map(id => ({ room_id: id, date, available })),
              { onConflict: 'room_id, date' }
            )
          )
        }
        if (price !== null) {
          promises.push(
            supabaseAdmin.from('room_rates').upsert(
              targetRoomIds.map(id => ({ room_id: id, date, price })),
              { onConflict: 'room_id, date' }
            )
          )
        }
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises)
    }

    revalidatePath(`/dashboard/owner/property/${propertyId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
