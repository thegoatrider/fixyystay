'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const OCR_SYSTEM_PROMPT = `
You are an expert Government ID verification AI.
Analyze the provided image and extract information strictly in JSON format.
Allowed document_type values: AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID, UNKNOWN.
Return STRICTLY this JSON format (no markdown):
{
  "document_type": string,
  "document_number": string,
  "full_name": string,
  "date_of_birth": string,
  "raw_ocr_text": string
}
`

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
  const houseRules = formData.get('houseRules') as string // Added houseRules extraction
  const amenities = formData.getAll('amenities') as string[]
  const otherAmenitiesRaw = formData.get('otherAmenities') as string || ''
  const otherAmenities = otherAmenitiesRaw.split(',').map(s => s.trim()).filter(s => s !== '')
  const allAmenities = Array.from(new Set([...amenities, ...otherAmenities]))
  
  const priceBucket = formData.get('priceBucket') as string
  const pincode = (formData.get('pincode') as string || '').trim()
  const cityArea = formData.get('cityArea') as string
  const city = (formData.get('city') as string) || 'Alibag'
  const helpdeskNumber = formData.get('helpdeskNumber') as string
  const max_guests = parseInt(formData.get('max_guests') as string) || 2
  const max_capacity = parseInt(formData.get('max_capacity') as string) || 20
  const extra_per_pax = parseFloat(formData.get('extra_per_pax') as string) || 0

  // 3.5 Automated Geocoding
  const searchQuery = `${pincode}, India`
  const geoData = await geocodeAddress(searchQuery)

  // 3.8 Handle Cover Image upload
  const coverImageFile = formData.get('coverImage') as File | null;
  let coverImageUrl: string | null = null;

  if (coverImageFile && coverImageFile.size > 0) {
    const fileExt = coverImageFile.name.split('.').pop()
    const fileName = `prop-cover-${owner.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('property_images')
      .upload(fileName, coverImageFile)
      
    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(fileName)
      coverImageUrl = urlData.publicUrl
    } else {
      console.error('Cover Image upload failed:', uploadError)
      return { error: `Cover image upload failed: ${uploadError.message}` }
    }
  }

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
        return { error: `Failed to upload gallery image: ${uploadError.message}` }
      }
    }
  }

  if (!coverImageUrl && image_urls.length === 0) {
    return { error: 'Please upload at least one image of the property.' }
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
      house_rules: houseRules, // Save houseRules to DB
      amenities: allAmenities,
      image_urls,
      image_url: coverImageUrl || image_urls[0] || null, // Priority to coverImage
      helpdesk_number: helpdeskNumber,
      city: city,
      city_area: cityArea,
      area_name: cityArea,
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
        const { error: roomError } = await supabaseAdmin.from('rooms').insert({
          property_id: property.id,
          name: `${cat.name} Room`,
          category: cat.name,
          base_price: cat.base_price,
          price_bucket: cat.price_bucket,
        })
        if (roomError) {
          await supabaseAdmin.from('properties').delete().eq('id', property.id)
          return { error: `Failed to create initial room: ${roomError.message}. Upload cancelled.` }
        }
      }
    } else {
      // Villa: one room
      const { error: roomError } = await supabaseAdmin.from('rooms').insert({
        property_id: property.id,
        name: 'Entire Villa',
        category: 'Villa',
        base_price: basePrice,
        price_bucket: priceBucket,
        base_capacity: max_guests,
        max_capacity: max_capacity,
      })
      if (roomError) {
        await supabaseAdmin.from('properties').delete().eq('id', property.id)
        return { error: `Failed to create Villa room constraint: ${roomError.message}. Upload cancelled.` }
      }
    }
  }

  revalidatePath('/dashboard/owner')
  return { success: true, id: property.id }
}

export async function updatePassword(formData: FormData) {
  try {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' }
    }
    if (password !== confirmPassword) {
      return { error: 'Passwords do not match.' }
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function claimFreeTrial() {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // 1. Verify session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Session expired.' }

    // 2. Get owner record
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!owner) return { error: 'Owner profile not found.' }

    // 3. Verify they have NEVER had a subscription (including trials)
    const { data: existingSub } = await supabaseAdmin
      .from('owner_subscriptions')
      .select('id')
      .eq('owner_id', owner.id)
      .maybeSingle()

    if (existingSub) {
      return { error: 'You are not eligible for a free trial. Please pick a premium plan.' }
    }

    // 4. Create 7-day Trial
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 7)

    const { error: subError } = await supabaseAdmin
      .from('owner_subscriptions')
      .insert({
        owner_id: owner.id,
        plan_name: '7-Day Free Trial',
        end_date: expiryDate.toISOString(),
        status: 'active'
      })

    if (subError) return { error: 'Failed to activate trial.' }

    revalidatePath('/dashboard/owner')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error claiming trial' }
  }
}

export async function approveIdentity(identityId: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Fetch identity to check if OCR data is missing
    const { data: identity } = await supabaseAdmin
      .from('guest_identity')
      .select('document_image_url, document_number, full_name')
      .eq('id', identityId)
      .single()

    let ocrUpdates: any = {}

    if (identity && identity.document_image_url && (!identity.document_number || !identity.full_name)) {
      try {
        console.log('[APPROVE] Missing OCR data. Running background scan...')
        const response = await fetch(identity.document_image_url)
        const arrayBuffer = await response.arrayBuffer()
        const base64Data = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = response.headers.get('content-type') || 'image/jpeg'

        const generatePromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            OCR_SYSTEM_PROMPT,
            { inlineData: { data: base64Data, mimeType } }
          ],
          config: { temperature: 0.0, responseMimeType: 'application/json' }
        });
        
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 45000));
        const aiResponse = await Promise.race([generatePromise, timeoutPromise]) as any;
        const aiText = aiResponse.text || '{}';
        
        const result = JSON.parse(aiText.replace(/^```json/gi, '').replace(/```$/g, '').trim())
        
        if (result.document_number) ocrUpdates.document_number = result.document_number
        if (result.full_name) ocrUpdates.full_name = result.full_name
        if (result.document_type && result.document_type !== 'UNKNOWN') ocrUpdates.document_type = result.document_type
        if (result.date_of_birth) ocrUpdates.date_of_birth = result.date_of_birth
        if (result.raw_ocr_text) ocrUpdates.raw_ocr_text = result.raw_ocr_text
        
        console.log('[APPROVE] Background scan successful.')
      } catch (ocrErr) {
        console.error('[APPROVE] Background scan failed:', ocrErr)
      }
    }

    const { error } = await supabaseAdmin
      .from('guest_identity')
      .update({
        is_verified: true,
        verification_status: 'VERIFIED',
        verification_reason: 'Manually approved by owner',
        ...ocrUpdates
      })
      .eq('id', identityId)

    if (error) {
      console.error('Failed to approve identity:', error)
      return { success: false, error: 'Database update failed' }
    }

    revalidatePath('/dashboard/owner')
    return { success: true }
  } catch (err: any) {
    console.error('Error approving identity:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}

export async function addPropertyRoom(propertyId: string, roomNumber: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = createAdminClient()
    const { data: owner } = await supabaseAdmin.from('owners').select('id').eq('user_id', user.id).single()
    if (!owner) return { success: false, error: 'Owner profile not found' }

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('owner_id', owner.id)
      .single()
    if (!property) return { success: false, error: 'Property not found or access denied' }

    const { error } = await supabaseAdmin
      .from('property_rooms')
      .insert({ property_id: propertyId, room_number: roomNumber })

    if (error) {
      console.error('Failed to add property room:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/owner')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deletePropertyRoom(roomId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = createAdminClient()
    const { data: owner } = await supabaseAdmin.from('owners').select('id').eq('user_id', user.id).single()
    if (!owner) return { success: false, error: 'Owner profile not found' }

    // Fetch the room to verify it belongs to this owner's property
    const { data: room } = await supabaseAdmin
      .from('property_rooms')
      .select('id, property_id')
      .eq('id', roomId)
      .single()

    if (!room) return { success: false, error: 'Room not found' }

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', room.property_id)
      .eq('owner_id', owner.id)
      .single()

    if (!property) return { success: false, error: 'Access denied' }

    const { error } = await supabaseAdmin
      .from('property_rooms')
      .delete()
      .eq('id', roomId)

    if (error) {
      console.error('Failed to delete property room:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/owner')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function assignRoomToGuest(checkinId: string, roomNumber: string | null) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = createAdminClient()
    const { data: owner } = await supabaseAdmin.from('owners').select('id').eq('user_id', user.id).single()
    if (!owner) return { success: false, error: 'Owner profile not found' }

    // Fetch the checkin to ensure it belongs to this owner
    const { data: checkin } = await supabaseAdmin
      .from('guest_checkins')
      .select('id, property_id')
      .eq('id', checkinId)
      .eq('owner_id', owner.id)
      .single()

    if (!checkin) {
      return { success: false, error: 'Check-in record not found or access denied' }
    }

    // Update room number
    const { error } = await supabaseAdmin
      .from('guest_checkins')
      .update({ room_number: roomNumber })
      .eq('id', checkinId)

    if (error) {
      console.error('Failed to assign room:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/owner')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function checkoutGuest(checkinId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = createAdminClient()
    const { data: owner } = await supabaseAdmin.from('owners').select('id').eq('user_id', user.id).single()
    if (!owner) return { success: false, error: 'Owner profile not found' }

    // Fetch the checkin to ensure it belongs to this owner
    const { data: checkin } = await supabaseAdmin
      .from('guest_checkins')
      .select('id, property_id')
      .eq('id', checkinId)
      .eq('owner_id', owner.id)
      .single()

    if (!checkin) {
      return { success: false, error: 'Check-in record not found or access denied' }
    }

    const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format (local timezone)

    const { error } = await supabaseAdmin
      .from('guest_checkins')
      .update({ 
        status: 'checked_out',
        checkout_date: todayStr
      })
      .eq('id', checkinId)

    if (error) {
      console.error('Failed to checkout guest:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/owner')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
