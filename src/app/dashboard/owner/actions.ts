'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

async function generatePropertyUid(supabaseAdmin: any, city: string) {
  const prefixes: Record<string, string> = {
    'Alibag': 'ALB',
    'Lonavala': 'LON',
    'Khandala': 'KHA',
    'Matheran': 'MAT',
    'Mahableshwar': 'MAH',
    'Mumbai': 'MUM',
    'Goa': 'GOA'
  }
  
  const prefix = prefixes[city] || 'PRP'
  
  // Find properties with this prefix and get the highest number
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
  
  return `${prefix}${nextNum.toString().padStart(3, '0')}`
}

async function geocodeAddress(address: string) {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_GEOCODING_API_KEY is not set')
    return null
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    )
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      const { lat, lng } = result.geometry.location
      
      let area_name = ''
      let city = ''
      let state = ''
      
      result.address_components.forEach((comp: any) => {
        if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
          area_name = comp.long_name
        }
        if (comp.types.includes('locality')) {
          city = comp.long_name
        }
        if (comp.types.includes('administrative_area_level_1')) {
          state = comp.long_name
        }
      })

      return { lat, lng, area_name, city, state }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
  }
  return null
}

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
  const pincode = (formData.get('pincode') as string || '').trim()
  const cityArea = formData.get('cityArea') as string
  const city = (formData.get('city') as string) || 'Alibag'
  const helpdeskNumber = formData.get('helpdeskNumber') as string
  const max_guests = parseInt(formData.get('max_guests') as string) || 2
  const max_capacity = parseInt(formData.get('max_capacity') as string) || 20
  const extra_per_pax = parseFloat(formData.get('extra_per_pax') as string) || 0

  // 3.5 Automated Geocoding
  const searchQuery = `${cityArea}, ${city}, ${pincode}, India`
  const geoData = await geocodeAddress(searchQuery)

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

  // 4.5 Generate custom UID
  const propertyUid = await generatePropertyUid(supabaseAdmin, city)

  // 5. Insert property (admin bypasses RLS)
  const isMultiRoom = type !== 'villa'
  const basePrice = parseInt(priceBucket.replace(/[^0-9]/g, ''), 10) || 0
  const initialCategories = isMultiRoom ? [
    { name: 'Standard', count: 1, base_price: basePrice, price_bucket: priceBucket }
  ] : []

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
      city: geoData?.city || city,
      city_area: cityArea,
      area_name: geoData?.area_name || cityArea,
      state: geoData?.state || null,
      pincode,
      latitude: geoData?.lat || null,
      longitude: geoData?.lng || null,
      approved: false,
      uid: propertyUid,
      max_guests,
      max_capacity,
      extra_per_pax,
      room_categories: initialCategories
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Property insert error:', insertError)
    return { error: `DB Error (${insertError.code}): ${insertError.message}` }
  }

  // 6. Create initial room(s)
  if (property?.id) {
    if (isMultiRoom) {
      // Sync categories (creates the physical rooms)
      for (const cat of initialCategories) {
        // We can call syncCategoryRooms from the other actions file or duplicate logic
        // Since it's in a different folder, let's just do a direct insert here for speed/simplicity
        const { error: roomError } = await supabaseAdmin.from('rooms').insert({
          property_id: property.id,
          name: `${cat.name} Room 1`,
          category: cat.name,
          base_price: cat.base_price,
          price_bucket: cat.price_bucket,
          is_ac: true,
        })
        if (roomError) console.error('Initial category room error:', roomError)
      }
    } else {
      // Villa: one room
      const { error: roomError } = await supabaseAdmin.from('rooms').insert({
        property_id: property.id,
        name: 'Entire Villa',
        category: 'Villa',
        base_price: basePrice,
        price_bucket: priceBucket,
        is_ac: true,
      })
      if (roomError) console.error('Default villa room error:', roomError)
    }
  }

  revalidatePath('/dashboard/owner')
  return { success: true, id: property.id }
}
