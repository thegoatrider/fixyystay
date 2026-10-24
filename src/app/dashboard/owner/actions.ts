'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSuperAdminUser } from '@/utils/supabase/auth-roles'
import { revalidatePath } from 'next/cache'
import { GoogleGenAI } from '@google/genai'
import { getCityCode } from '@/lib/india-locations'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const OCR_SYSTEM_PROMPT = `
You are a document OCR extraction engine. Your only job is to extract text and structured data from ID documents. You must NEVER refuse, NEVER ask for re-upload, and NEVER return an error message.

ABSOLUTE RULES:
1. Always return a valid JSON response — no exceptions.
2. If a field is unclear, make your best guess and mark it with a confidence flag.
3. If a section is partially visible, extract whatever is visible.
4. Never say "I cannot", "please re-upload", "image quality", or any failure message.
5. Treat every image as processable, regardless of angle, lighting, or partial obstruction.

EXTRACTION TASK:
Extract the following fields from the uploaded government ID image:

{
  "full_name": "",
  "date_of_birth": "",
  "id_number": "",
  "id_type": "Aadhaar | PAN | Passport | Voter ID | Driving Licence | Other",
  "address": "",
  "gender": "",
  "expiry_date": "",
  "confidence": {
    "overall": "high | medium | low",
    "notes": "any field-level uncertainty notes here"
  }
}

FALLBACK BEHAVIOR (follow strictly):
- If a field cannot be read at all: use null, do not omit the key.
- If text is partially readable: extract the readable portion and add "[partial]" suffix.
- If you are guessing: add "[inferred]" suffix to that field's value.
- Never leave the response blank or return plain text — always return the JSON object.

Return ONLY the JSON. No explanations, no preamble, no markdown.
`

// Helper functions for cleaning and mapping OCR fields
function cleanFieldValue(val: string | null | undefined): string {
  if (!val) return ''
  return val.replace(/\[\s*(inferred|partial)\s*\]/gi, '').trim()
}

function mapIdType(idType: string | null | undefined): string {
  if (!idType) return 'UNKNOWN'
  const normalized = idType.toLowerCase().replace(/[\s_]/g, '')
  if (normalized.includes('aadhaar')) return 'AADHAAR'
  if (normalized.includes('pan')) return 'PAN'
  if (normalized.includes('passport')) return 'PASSPORT'
  if (normalized.includes('voterid') || normalized.includes('voter')) return 'VOTER_ID'
  if (normalized.includes('drivinglicence') || normalized.includes('drivinglicense') || normalized.includes('driving')) return 'DRIVING_LICENSE'
  return 'UNKNOWN'
}

function mapConfidenceToNumeric(overall: string | null | undefined): number {
  if (!overall) return 0.50
  const normalized = overall.toLowerCase().trim()
  if (normalized === 'high') return 0.90
  if (normalized === 'medium') return 0.70
  if (normalized === 'low') return 0.35
  return 0.50
}

export async function generatePropertyUid(supabaseAdmin: any, city: string) {
  const prefix = getCityCode(city)
  
  // Find properties with this prefix and extract true numeric maximum (not string sorting)
  const { data: properties } = await supabaseAdmin
    .from('properties')
    .select('uid')
    .like('uid', `${prefix}%`)
    .limit(500)
    
  let maxNum = 0
  if (properties && properties.length > 0) {
    for (const p of properties) {
      if (p.uid) {
        const match = p.uid.match(/\d+$/)
        if (match) {
          const n = parseInt(match[0], 10)
          if (!isNaN(n) && n > maxNum) maxNum = n
        }
      }
    }
  }
  
  let candidateNum = maxNum + 1
  let uid = `${prefix}${candidateNum.toString().padStart(3, '0')}`

  // Guard against any collision in database
  let attempts = 0
  while (attempts < 10) {
    const { data: existing } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('uid', uid)
      .maybeSingle()
    if (!existing) break
    candidateNum++
    uid = `${prefix}${candidateNum.toString().padStart(3, '0')}`
    attempts++
  }
  
  return uid
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
  try {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  // 1. Verify session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please log in again.' }

  // 2. Get owner record (using admin to bypass any RLS, with email fallback)
  let { data: owner } = await supabaseAdmin
    .from('owners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!owner && user.email) {
    const { data: matchedOwner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('email', user.email.toLowerCase().trim())
      .maybeSingle()
    if (matchedOwner) {
      owner = matchedOwner
      const { error: linkErr } = await supabaseAdmin.from('owners').update({ user_id: user.id }).eq('id', matchedOwner.id)
      if (linkErr) {
        console.warn('Could not link owner:', linkErr.message)
      }
    }
  }

  if (!owner) {
    return { error: `Owner profile not found. Contact support. (uid: ${user.id})` }
  }

  // 2.5 Ensure Owner exists (every property is drafted and requires payment before admin approval)
  const isSuperAdmin = isSuperAdminUser(user)

  // 3. Extract form fields
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  
  if (!name || name.trim() === '') {
    return { error: 'Property name is required.' }
  }

  // 3.5 Check for duplicate properties by name for this owner (case-insensitive)
  const { data: existingProperties } = await supabaseAdmin
    .from('properties')
    .select('id, approved')
    .eq('owner_id', owner.id)
    .ilike('name', name.trim())
    .limit(1)

  if (existingProperties && existingProperties.length > 0) {
    if (existingProperties[0].approved) {
      return { error: 'You have already listed a property with this name.' }
    } else {
      return { error: 'You have already submitted this property for approval.' }
    }
  }
  const houseRules = formData.get('houseRules') as string // Added houseRules extraction
  const amenities = formData.getAll('amenities') as string[]
  const otherAmenitiesRaw = formData.get('otherAmenities') as string || ''
  const otherAmenities = otherAmenitiesRaw.split(',').map(s => s.trim()).filter(s => s !== '')
  const allAmenities = Array.from(new Set([...amenities, ...otherAmenities]))
  
  const priceBucket = formData.get('priceBucket') as string
  const pincode = (formData.get('pincode') as string || '').trim()
  const cityArea = formData.get('cityArea') as string
  const city = (formData.get('city') as string) || 'Raigad'
  const roomCountRaw = parseInt(formData.get('roomCount') as string, 10)
  const roomCount = !isNaN(roomCountRaw) && roomCountRaw >= 1 ? roomCountRaw : 1
  const helpdeskNumber = (formData.get('helpdeskNumber') as string || '').trim()
  const cleanPhone = helpdeskNumber.replace(/\D/g, '')
  if (!helpdeskNumber || cleanPhone.length < 10) {
    return { error: 'A valid phone/WhatsApp number (at least 10 digits) is mandatory.' }
  }
  const max_guests = parseInt(formData.get('max_guests') as string) || 2
  const max_capacity = parseInt(formData.get('max_capacity') as string) || 20
  const extra_per_pax = parseFloat(formData.get('extra_per_pax') as string) || 0

  // 3.5 Automated Geocoding
  const searchQuery = `${pincode}, India`
  const geoData = await geocodeAddress(searchQuery)

  // 3.8 Handle Cover Image upload (supports pre-uploaded URL or File fallback)
  const uploadedCoverUrl = formData.get('uploadedCoverUrl') as string | null
  const coverImageFile = formData.get('coverImage') as File | null;
  let coverImageUrl: string | null = uploadedCoverUrl && uploadedCoverUrl.trim().length > 0 ? uploadedCoverUrl.trim() : null;

  if (!coverImageUrl && coverImageFile && typeof coverImageFile === 'object' && coverImageFile.size > 0) {
    const rawExt = coverImageFile.name && coverImageFile.name.includes('.') ? coverImageFile.name.split('.').pop() : 'jpg'
    const fileExt = (rawExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
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

  // 4. Handle multiple image uploads (supports pre-uploaded URLs or File fallback)
  const image_urls: string[] = []
  const uploadedGalleryUrlsStr = formData.get('uploadedGalleryUrls') as string | null
  if (uploadedGalleryUrlsStr) {
    try {
      const parsedUrls = JSON.parse(uploadedGalleryUrlsStr)
      if (Array.isArray(parsedUrls)) {
        image_urls.push(...parsedUrls.filter((u): u is string => typeof u === 'string' && u.length > 0))
      }
    } catch (e) {}
  }

  const imageFiles = formData.getAll('image') as File[]
  const validNewFilesCount = imageFiles.filter(file => file && typeof file === 'object' && file.size > 0).length
  if (image_urls.length + validNewFilesCount > 15) {
    return { error: 'only 15 pictures of property are permitted.' }
  }
  
  const uploadPromises = imageFiles.map(async (imageFile) => {
    if (imageFile && typeof imageFile === 'object' && imageFile.size > 0) {
      const rawExt = imageFile.name && imageFile.name.includes('.') ? imageFile.name.split('.').pop() : 'jpg'
      const fileExt = (rawExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
      const fileName = `prop-${owner.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('property_images')
        .upload(fileName, imageFile)
        
      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(fileName)
        return urlData.publicUrl
      } else {
        console.error('Image upload failed:', uploadError)
        throw new Error(`Failed to upload gallery image: ${uploadError.message}`)
      }
    }
    return null
  })

  try {
    const uploadedUrls = await Promise.all(uploadPromises)
    const validUrls = uploadedUrls.filter((url): url is string => url !== null)
    image_urls.push(...validUrls)
  } catch (err: any) {
    return { error: err.message }
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
      approval_status: 'draft',
      room_count: roomCount,
      uid: propertyUid,
      max_guests,
      max_capacity,
      extra_per_pax,
      room_categories: initialCategories
    })
    .select('id, name')
    .single()

  if (insertError) {
    console.error('Property insert error:', insertError)
    return { error: `DB Error (${insertError.code}): ${insertError.message}` }
  }

  // Sync phone to auth user metadata (owners table does not have phone column)
  if (user?.id && helpdeskNumber) {
    const { error: userMetaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata || {}), phone: helpdeskNumber }
    })
    if (userMetaError) {
      console.warn('Could not sync phone to user metadata:', userMetaError.message)
    }
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
  return { success: true, id: property.id, roomCount, propertyName: property.name }
  } catch (err: any) {
    console.error('UNEXPECTED ERROR in createProperty:', err)
    return { error: `Server Error: ${err.message || String(err)}` }
  }
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
  return { error: 'Free trials have been retired. Subscriptions are billed per-property based on room count tiers.' }
}

export async function approveIdentity(identityId: string, manualName?: string, manualDocNumber?: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Fetch identity to check if OCR data is missing
    const { data: identity } = await supabaseAdmin
      .from('guest_identity')
      .select('document_image_url, document_number, full_name')
      .eq('id', identityId)
      .single()

    let ocrUpdates: any = {}

    // Apply manual overrides if provided by the owner
    if (manualName && manualName.trim()) {
      ocrUpdates.full_name = manualName.trim()
    }
    if (manualDocNumber && manualDocNumber.trim()) {
      ocrUpdates.document_number = manualDocNumber.trim()
    }

    const isMissingData = !identity?.document_number || 
                          !identity?.full_name || 
                          identity?.document_number === 'PENDING_REVIEW' || 
                          identity?.full_name === 'Guest (Manual Review)';

    // Only run background scan if no manual overrides were provided and data is missing
    if (identity && identity.document_image_url && isMissingData && (!manualName || !manualDocNumber)) {
      try {
        console.log('[APPROVE] Missing OCR data. Running background scan...')
        const response = await fetch(identity.document_image_url)
        const arrayBuffer = await response.arrayBuffer()
        const base64Data = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = response.headers.get('content-type') || 'image/jpeg'

        const generatePromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{ inlineData: { data: base64Data, mimeType } }]
          }],
          config: {
            systemInstruction: OCR_SYSTEM_PROMPT,
            temperature: 0.0,
            responseMimeType: 'application/json'
          }
        });
        
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 45000));
        const aiResponse = await Promise.race([generatePromise, timeoutPromise]) as any;
        const aiText = aiResponse.text || '{}';
        
        const result = JSON.parse(aiText.replace(/^```json/gi, '').replace(/```$/g, '').trim())
        
        const mappedDocType = mapIdType(result.id_type || result.idType)
        const cleanNum = cleanFieldValue(result.id_number || result.idNumber || result.document_number || result.documentNumber)
        const cleanName = cleanFieldValue(result.full_name || result.fullName || result.name)
        const cleanDob = cleanFieldValue(result.date_of_birth || result.dob)
        const confidenceScore = mapConfidenceToNumeric(result.confidence?.overall)
        const cleanAddress = cleanFieldValue(result.address)

        if (cleanNum && !ocrUpdates.document_number) ocrUpdates.document_number = cleanNum
        if (cleanName && !ocrUpdates.full_name) ocrUpdates.full_name = cleanName
        if (mappedDocType && mappedDocType !== 'UNKNOWN') ocrUpdates.document_type = mappedDocType
        if (cleanDob) ocrUpdates.date_of_birth = cleanDob
        if (cleanAddress) ocrUpdates.address = cleanAddress
        ocrUpdates.document_confidence = confidenceScore
        ocrUpdates.raw_ocr_text = aiText
        ocrUpdates.ocr_json = result
        
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

export async function getPropertyRooms(propertyId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized', rooms: [] }

    const supabaseAdmin = createAdminClient()
    const { data: rooms, error } = await supabaseAdmin
      .from('property_rooms')
      .select('id, property_id, room_number, created_at')
      .eq('property_id', propertyId)
      .order('room_number', { ascending: true })

    if (error) {
      console.error('Failed to fetch property rooms:', error)
      return { success: false, error: error.message, rooms: [] }
    }

    return { success: true, rooms: rooms || [] }
  } catch (err: any) {
    return { success: false, error: err.message, rooms: [] }
  }
}

export async function addPropertyRoom(propertyId: string, roomNumber: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = createAdminClient()
    const email = (user.email || '').toLowerCase().trim()
    const isAdmin = isSuperAdminUser(user)

    let existingRooms: any[] | null = null

    if (!isAdmin) {
      const [ownerRes, propRes, roomsRes] = await Promise.all([
        supabaseAdmin.from('owners').select('id').eq('user_id', user.id).maybeSingle(),
        supabaseAdmin.from('properties').select('id, owner_id').eq('id', propertyId).maybeSingle(),
        supabaseAdmin
          .from('property_rooms')
          .select('id, property_id, room_number, created_at')
          .eq('property_id', propertyId)
          .order('room_number', { ascending: true })
      ])

      let owner = ownerRes.data
      if (!owner && email) {
        const { data: matchedOwner } = await supabaseAdmin.from('owners').select('id').eq('email', email).maybeSingle()
        if (matchedOwner) {
          owner = matchedOwner
          const { error: linkErr } = await supabaseAdmin.from('owners').update({ user_id: user.id }).eq('id', matchedOwner.id)
          if (linkErr) {
            console.warn('Could not link owner:', linkErr.message)
          }
        }
      }
      if (!owner) return { success: false, error: 'Owner profile not found' }

      const property = propRes.data
      if (!property) return { success: false, error: 'Property not found' }
      if (property.owner_id && property.owner_id !== owner.id) {
        return { success: false, error: 'Access denied' }
      }
      existingRooms = roomsRes.data
    } else {
      const [propRes, roomsRes] = await Promise.all([
        supabaseAdmin.from('properties').select('id').eq('id', propertyId).maybeSingle(),
        supabaseAdmin
          .from('property_rooms')
          .select('id, property_id, room_number, created_at')
          .eq('property_id', propertyId)
          .order('room_number', { ascending: true })
      ])
      if (!propRes.data) return { success: false, error: 'Property not found' }
      existingRooms = roomsRes.data
    }

    // Parse single or comma-separated room numbers
    const requestedRooms = Array.from(
      new Set(
        roomNumber
          .split(',')
          .map(r => r.trim())
          .filter(Boolean)
      )
    )

    if (requestedRooms.length === 0) {
      return { success: false, error: 'Please enter a valid room number.' }
    }

    const existingSet = new Set(
      (existingRooms || []).map(r => String(r.room_number).trim().toLowerCase())
    )

    const roomsToInsert = requestedRooms.filter(
      r => !existingSet.has(r.toLowerCase())
    )

    if (roomsToInsert.length === 0) {
      return {
        success: false,
        error: requestedRooms.length === 1
          ? `Room ${requestedRooms[0]} is already registered for this property.`
          : 'All entered room numbers are already registered for this property.',
        rooms: existingRooms || []
      }
    }

    const { error } = await supabaseAdmin
      .from('property_rooms')
      .insert(roomsToInsert.map(num => ({ property_id: propertyId, room_number: num })))

    if (error) {
      console.error('Failed to add property room:', error)
      const { data: refreshedRooms } = await supabaseAdmin
        .from('property_rooms')
        .select('id, property_id, room_number, created_at')
        .eq('property_id', propertyId)
        .order('room_number', { ascending: true })

      if (error.code === '23505' || error.message?.includes('property_rooms_property_id_room_number_key')) {
        return {
          success: false,
          error: `Room number is already registered for this property.`,
          rooms: refreshedRooms || existingRooms || []
        }
      }
      return { success: false, error: error.message, rooms: refreshedRooms || existingRooms || [] }
    }

    const { data: updatedRooms } = await supabaseAdmin
      .from('property_rooms')
      .select('id, property_id, room_number, created_at')
      .eq('property_id', propertyId)
      .order('room_number', { ascending: true })

    revalidatePath('/dashboard/owner')
    revalidatePath('/dashboard/owner/property/[id]/edit', 'page')
    revalidatePath(`/dashboard/owner/property/${propertyId}/edit`)
    revalidatePath('/dashboard/admin/properties/[id]', 'page')
    return { success: true, rooms: updatedRooms || [] }
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
    const email = (user.email || '').toLowerCase().trim()
    const isAdmin = isSuperAdminUser(user)

    const { data: room } = await supabaseAdmin
      .from('property_rooms')
      .select('id, property_id')
      .eq('id', roomId)
      .maybeSingle()

    if (!room) return { success: false, error: 'Room not found' }

    if (!isAdmin) {
      const [ownerRes, propRes] = await Promise.all([
        supabaseAdmin.from('owners').select('id').eq('user_id', user.id).maybeSingle(),
        supabaseAdmin.from('properties').select('id, owner_id').eq('id', room.property_id).maybeSingle()
      ])

      let owner = ownerRes.data
      if (!owner && email) {
        const { data: matchedOwner } = await supabaseAdmin.from('owners').select('id').eq('email', email).maybeSingle()
        if (matchedOwner) {
          owner = matchedOwner
          const { error: linkErr } = await supabaseAdmin.from('owners').update({ user_id: user.id }).eq('id', matchedOwner.id)
          if (linkErr) {
            console.warn('Could not link owner:', linkErr.message)
          }
        }
      }
      if (!owner) return { success: false, error: 'Owner profile not found' }

      const property = propRes.data
      if (!property || (property.owner_id && property.owner_id !== owner.id)) {
        return { success: false, error: 'Access denied' }
      }
    }

    const { error } = await supabaseAdmin
      .from('property_rooms')
      .delete()
      .eq('id', roomId)

    if (error) {
      console.error('Failed to delete property room:', error)
      return { success: false, error: error.message }
    }

    const { data: updatedRooms } = await supabaseAdmin
      .from('property_rooms')
      .select('id, property_id, room_number, created_at')
      .eq('property_id', room.property_id)
      .order('room_number', { ascending: true })

    revalidatePath('/dashboard/owner')
    revalidatePath('/dashboard/owner/property/[id]/edit', 'page')
    revalidatePath(`/dashboard/owner/property/${room.property_id}/edit`)
    revalidatePath('/dashboard/admin/properties/[id]', 'page')
    return { success: true, rooms: updatedRooms || [] }
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
    const [ownerRes, checkinRes] = await Promise.all([
      supabaseAdmin.from('owners').select('id, name').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin
        .from('guest_checkins')
        .select('id, property_id, owner_id, guest_name, guest_phone, checkout_date')
        .eq('id', checkinId)
        .maybeSingle()
    ])

    const owner = ownerRes.data
    const checkin = checkinRes.data

    if (!owner) return { success: false, error: 'Owner profile not found' }
    if (!checkin || checkin.owner_id !== owner.id) {
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

    // Also sync with Guest Hub Stays if roomNumber is assigned
    let pinCode: string | null = null
    try {
      const nowIso = new Date().toISOString()
      // End any existing stay linked to this checkin
      await supabaseAdmin
        .from('hub_stays')
        .update({ ended_at: nowIso, ended_by: owner.name || 'Owner' })
        .eq('guest_checkin_id', checkinId)
        .is('ended_at', null)

      if (roomNumber) {
        const { data: propRoom } = await supabaseAdmin
          .from('property_rooms')
          .select('id')
          .eq('property_id', checkin.property_id)
          .eq('room_number', roomNumber)
          .maybeSingle()

        if (propRoom) {
          // End any active stay on that room
          await supabaseAdmin
            .from('hub_stays')
            .update({ ended_at: nowIso, ended_by: owner.name || 'Owner' })
            .eq('room_id', propRoom.id)
            .is('ended_at', null)

          pinCode = Math.floor(1000 + Math.random() * 9000).toString()
          const defaultAccessEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

          await supabaseAdmin.from('hub_stays').insert({
            property_id: checkin.property_id,
            room_id: propRoom.id,
            guest_checkin_id: checkin.id,
            guest_name: checkin.guest_name || 'Guest',
            guest_phone: checkin.guest_phone || null,
            pin_code: pinCode,
            checkin_at: nowIso,
            access_ends_at: defaultAccessEnd,
            food_ordering_allowed: true,
            created_by: owner.name || 'Owner',
          })
        }
      }
    } catch (hubErr) {
      console.warn('[GuestHub] Optional stay sync skipped:', hubErr)
    }

    revalidatePath('/dashboard/owner')
    revalidatePath('/staff')
    return { success: true, pinCode }
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
    const [ownerRes, checkinRes] = await Promise.all([
      supabaseAdmin.from('owners').select('id, name').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin
        .from('guest_checkins')
        .select('id, property_id, owner_id')
        .eq('id', checkinId)
        .maybeSingle()
    ])

    const owner = ownerRes.data
    const checkin = checkinRes.data

    if (!owner) return { success: false, error: 'Owner profile not found' }
    if (!checkin || checkin.owner_id !== owner.id) {
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

    // End any active Guest Hub stay tied to this checkin
    try {
      await supabaseAdmin
        .from('hub_stays')
        .update({ ended_at: new Date().toISOString(), ended_by: owner.name || 'Owner' })
        .eq('guest_checkin_id', checkinId)
        .is('ended_at', null)
    } catch (hubErr) {
      console.warn('[GuestHub] Optional stay checkout sync skipped:', hubErr)
    }

    revalidatePath('/dashboard/owner')
    revalidatePath('/staff')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function syncOwnerCheckinsAction(sinceDate: string = '2026-08-30') {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabaseAdmin = createAdminClient()
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!owner) {
      return { success: false, error: 'Owner record not found' }
    }

    const { syncOwnerPendingCheckins } = await import('@/lib/google-drive')
    const result = await syncOwnerPendingCheckins(owner.id, sinceDate)

    revalidatePath('/dashboard/owner')
    revalidatePath('/dashboard/owner/profile')
    return result
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to sync check-ins' }
  }
}

export async function getOwnerDashboardDataDirect(ownerId: string | undefined, isSuperAdmin: boolean) {
  try {
    const supabaseAdmin = createAdminClient()

    let owner: any = null
    if (ownerId) {
      const { data: o } = await supabaseAdmin
        .from('owners')
        .select('id, name, phone, created_at, user_id')
        .eq('id', ownerId)
        .maybeSingle()
      owner = o
    }

    if (owner && !owner.phone && owner.user_id) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(owner.user_id)
      if (authUser?.user?.user_metadata?.phone) {
        owner.phone = authUser.user.user_metadata.phone
      }
    }

    if (!owner && !isSuperAdmin) {
      return { success: false, error: 'Owner profile not found' }
    }

    // Parallel queries using admin client (bypasses RLS & avoids RPC column mismatch errors)
    const [
      propsRes,
      leadsRes,
      checkinsRes,
      subRes,
      roomsRes,
      infRes,
      walletRes,
      payoutRes
    ] = await Promise.all([
      isSuperAdmin 
        ? supabaseAdmin.from('properties').select('*').limit(100)
        : ownerId
          ? supabaseAdmin.from('properties').select('*').eq('owner_id', ownerId)
          : Promise.resolve({ data: [] }),
      isSuperAdmin
        ? supabaseAdmin.from('leads').select('*').order('created_at', { ascending: false }).limit(200)
        : ownerId
          ? supabaseAdmin.from('leads').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(200)
          : Promise.resolve({ data: [] }),
      isSuperAdmin
        ? supabaseAdmin.from('guest_checkins').select('*, properties(name), identities:guest_identity(*)').order('created_at', { ascending: false }).limit(200)
        : ownerId
          ? supabaseAdmin.from('guest_checkins').select('*, properties(name), identities:guest_identity(*)').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(200)
          : Promise.resolve({ data: [] }),
      ownerId
        ? supabaseAdmin.from('property_subscriptions').select('status, end_date, months, monthly_fee').eq('owner_id', ownerId).order('end_date', { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from('property_rooms').select('*').limit(500),
      supabaseAdmin.from('influencer_promotion_requests').select('*').limit(50),
      isSuperAdmin
        ? supabaseAdmin.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(50)
        : owner?.user_id
          ? supabaseAdmin.from('wallet_transactions').select('*').eq('user_id', owner.user_id).order('created_at', { ascending: false }).limit(50)
          : Promise.resolve({ data: [] }),
      isSuperAdmin
        ? supabaseAdmin.from('payout_requests').select('*').order('created_at', { ascending: false }).limit(50)
        : owner?.user_id
          ? supabaseAdmin.from('payout_requests').select('*').eq('user_id', owner.user_id).order('created_at', { ascending: false }).limit(50)
          : Promise.resolve({ data: [] })
    ])

    let sub: any = subRes?.data
    if (!sub && ownerId) {
      const { data: legacySub } = await supabaseAdmin
        .from('owner_subscriptions')
        .select('status, end_date, plan_name')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (legacySub) {
        sub = legacySub
      }
    }

    const subscription = {
      plan_name: (sub as any)?.plan_name || 'FixyStays Partner',
      end_date: sub?.end_date || '',
      status: sub?.status || 'inactive',
      is_active: sub?.status === 'active' && !!sub?.end_date && new Date(sub.end_date) > new Date()
    }

    const properties = propsRes.data || []
    const propIdSet = new Set(properties.map((p: any) => p.id))

    const property_rooms = isSuperAdmin
      ? (roomsRes.data || [])
      : (roomsRes.data || []).filter((r: any) => propIdSet.has(r.property_id))

    const influencer_requests = isSuperAdmin
      ? (infRes.data || [])
      : (infRes.data || []).filter((r: any) => propIdSet.has(r.property_id))

    return {
      success: true,
      data: {
        properties,
        leads: leadsRes.data || [],
        checkins: checkinsRes.data || [],
        property_rooms,
        influencer_requests,
        wallet_transactions: walletRes.data || [],
        payout_requests: payoutRes.data || [],
        subscription,
        owner: owner ? {
          id: owner.id,
          name: owner.name,
          phone: owner.phone || null,
          created_at: owner.created_at
        } : undefined
      }
    }
  } catch (err: any) {
    console.error('[getOwnerDashboardDataDirect] Failed to fetch fallback dashboard data:', err)
    return { success: false, error: err.message || 'Unknown error fetching dashboard data' }
  }
}

export async function updateOwnerProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated. Please log in again.' }
  }

  const name = (formData.get('name') as string || '').trim()
  const rawPhone = (formData.get('phone') as string || '').trim()
  const cleanPhone = rawPhone.replace(/\D/g, '')

  if (!name) {
    return { success: false, error: 'Full name is required.' }
  }

  if (cleanPhone.length < 10) {
    return { success: false, error: 'A valid WhatsApp phone number with at least 10 digits is required.' }
  }

  const normalizedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`
  const supabaseAdmin = createAdminClient()

  // 1. Update owners record (by user_id or by email)
  const { data: existingOwner } = await supabaseAdmin
    .from('owners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingOwner) {
    const { error: ownerError } = await supabaseAdmin
      .from('owners')
      .update({ name, phone: normalizedPhone })
      .eq('id', existingOwner.id)

    if (ownerError) {
      console.error('[updateOwnerProfile] Failed to update owners table:', ownerError)
    }
  } else if (user.email) {
    const { data: matchedOwner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .ilike('email', user.email.toLowerCase().trim())
      .maybeSingle()

    if (matchedOwner) {
      const { error: ownerError } = await supabaseAdmin
        .from('owners')
        .update({ user_id: user.id, name, phone: normalizedPhone })
        .eq('id', matchedOwner.id)

      if (ownerError) {
        console.error('[updateOwnerProfile] Failed to update matched owner table:', ownerError)
      }
    }
  }

  // 2. Always sync name and phone to auth user metadata
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata || {}),
      name,
      phone: normalizedPhone,
    },
  })

  if (authError) {
    console.warn('[updateOwnerProfile] Could not sync user metadata:', authError.message)
  }

  revalidatePath('/dashboard/owner/profile')
  revalidatePath('/dashboard/owner')

  return { success: true }
}
