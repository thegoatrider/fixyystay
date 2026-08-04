'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { backupCheckinToGoogleDrive } from '@/lib/google-drive'

/**
 * submitCheckin — handles multi-guest check-in.
 * @param formData   Standard form fields
 * @param identityIds  Array of guest_identity IDs — one per guest, all already verified by AI
 */
export async function submitCheckin(formData: FormData, identityIds: string[]) {
  try {
    const supabaseAdmin = createAdminClient()

    const propertyId = formData.get('propertyId') as string
    const guestPhone = formData.get('guestPhone') as string
    const guestName = formData.get('guestName') as string
    const numPeople = parseInt(formData.get('numPeople') as string) || 1
    const checkinDate = formData.get('checkinDate') as string
    const checkoutDate = formData.get('checkoutDate') as string

    if (!identityIds || identityIds.length === 0) {
      return { error: 'No verified identities provided.' }
    }

    if (identityIds.length !== numPeople) {
      return { error: `Expected ${numPeople} verified ID(s) but received ${identityIds.length}.` }
    }

    // Server-side recheck of OCR data integrity before completing checkin
    const { data: identities, error: identityFetchError } = await supabaseAdmin
      .from('guest_identity')
      .select('id, full_name, document_number, document_type, is_verified, verification_status')
      .in('id', identityIds)

    if (identityFetchError || !identities || identities.length !== identityIds.length) {
      console.error('[CHECKIN-VALIDATE] Failed to fetch identity documents:', identityFetchError)
      return { error: 'Failed to fetch identity documents for validation. Please try again.' }
    }

    for (const identity of identities) {
      const isAllowedStatus = identity.verification_status === 'VERIFIED';
      if (!isAllowedStatus) {
        return { error: `Verification is incomplete or failed for ${identity.full_name || 'one of the guests'}. Please re-upload a clearer image.` }
      }
      
      let needsUpdate = false
      if (!identity.full_name || identity.full_name.trim() === '') {
        identity.full_name = 'Guest (Needs Review)'
        needsUpdate = true
      }
      if (!identity.document_number || identity.document_number.trim() === '') {
        identity.document_number = 'PENDING_REVIEW'
        needsUpdate = true
      }
      if (!identity.document_type || identity.document_type === 'UNKNOWN') {
        identity.document_type = 'OTHER'
        needsUpdate = true
      }

      // If we provided fallbacks, save them back to the DB so the admin dashboard doesn't break
      if (needsUpdate) {
        await supabaseAdmin.from('guest_identity').update({
          full_name: identity.full_name,
          document_number: identity.document_number,
          document_type: identity.document_type
        }).eq('id', identity.id)
      }
    }

    console.log(`[CHECKIN] Submitting check-in for property ${propertyId}, guest ${guestName}, ${numPeople} person(s)`)

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId || '')
    const { data: property, error: propError } = await (isUUID 
      ? supabaseAdmin
          .from('properties')
          .select('owner_id, name, helpdesk_number, organization_id')
          .eq('id', propertyId)
          .single()
      : supabaseAdmin
          .from('properties')
          .select('owner_id, name, helpdesk_number, organization_id')
          .eq('uid', propertyId)
          .single()
    )

    if (propError || !property) {
      console.error('[CHECKIN] Property fetch error:', propError)
      return { error: 'Property not found. Please verify the check-in link.' }
    }

    // Generate UID
    const uid = 'GST-' + Date.now().toString(16).toUpperCase().slice(-8)

    // Store identity IDs as an array for reference
    const idDocuments = identityIds.map((id, i) => ({ personIndex: i + 1, identityId: id }))

    const isForeigner = formData.get('isForeigner') === 'on'
    const formCData = isForeigner ? {
      passport_number: formData.get('passportNumber'),
      visa_number: formData.get('visaNumber'),
      visa_expiry: formData.get('visaExpiry'),
      country_of_origin: formData.get('countryOfOrigin'),
    } : null

    const checkinRecord = {
      property_id: propertyId,
      owner_id: property.owner_id,
      organization_id: property.organization_id || null,
      guest_phone: guestPhone,
      guest_name: guestName,
      num_people: numPeople,
      checkin_date: checkinDate || null,
      checkout_date: checkoutDate || null,
      vehicle_number: (formData.get('vehicleNumber') as string) || null,
      id_documents: idDocuments,
      uid,
      status: 'completed',
      form_c_details: formCData
    }

    const { data: insertedCheckin, error: insertError } = await supabaseAdmin
      .from('guest_checkins')
      .insert([checkinRecord])
      .select('id')
      .single()

    if (insertError) {
      console.error('[CHECKIN] Check-in Insert failed:', insertError)
      return { error: `Database error: ${insertError.message}` }
    }

    // Link ALL guest identities to this checkin record
    const { error: updateError } = await supabaseAdmin
      .from('guest_identity')
      .update({ checkin_id: insertedCheckin.id })
      .in('id', identityIds)

    if (updateError) {
      console.error('[CHECKIN] Failed to link identities to checkin:', updateError)
      // Non-fatal — checkin is still created
    }

    // Trigger Google Drive Cloud Backup (awaited so serverless function does not terminate prematurely)
    try {
      await backupCheckinToGoogleDrive(insertedCheckin.id)
    } catch (err) {
      console.error('[CHECKIN-GOOGLE-DRIVE-BACKUP] Sync error:', err)
    }

    console.log(`[CHECKIN] Successfully completed check-in: ${insertedCheckin.id}, linked ${identityIds.length} identity record(s)`)

    return {
      success: true,
      propertyName: property.name,
      helpdeskNumber: property.helpdesk_number || 'No helpdesk set'
    }
  } catch (err: any) {
    console.error('[CHECKIN] Critical uncaught exception:', err)
    return { error: `System Error: ${err.message || 'The server encountered an unexpected issue.'}` }
  }
}

// Keep the old name as an alias so nothing else breaks if imported
export const submitSingleCheckin = submitCheckin

export async function getPropertyInfo(propertyId: string) {
  try {
    const supabaseAdmin = createAdminClient()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId || '')
    const { data: property, error } = await (isUUID 
      ? supabaseAdmin
          .from('properties')
          .select('name, helpdesk_number')
          .eq('id', propertyId)
          .single()
      : supabaseAdmin
          .from('properties')
          .select('name, helpdesk_number')
          .eq('uid', propertyId)
          .single()
    )

    if (error || !property) return null
    return property
  } catch (err) {
    console.error('Error fetching property info:', err)
    return null
  }
}

export async function saveRegisterGuests(
  propertyId: string,
  registerDate: string,
  guestEntries: any[],
  imageUrls: string[]
) {
  try {
    console.log(`[SAVE-REGISTER-GUESTS] Saving ${guestEntries.length} entries for property ${propertyId}`)
    const supabaseAdmin = createAdminClient()

    // 1. Fetch property info to get owner_id and organization_id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId || '')
    const { data: property, error: propError } = await (isUUID 
      ? supabaseAdmin
          .from('properties')
          .select('owner_id, organization_id')
          .eq('id', propertyId)
          .single()
      : supabaseAdmin
          .from('properties')
          .select('owner_id, organization_id')
          .eq('uid', propertyId)
          .single()
    )

    if (propError || !property) {
      console.error('[SAVE-REGISTER-GUESTS] Property fetch error:', propError)
      return { success: false, error: 'Property not found.' }
    }

    const savedCheckinIds: string[] = []

    // Helper: Map government ID type to ENUM
    const mapIdTypeEnum = (typeStr: string | null | undefined): string => {
      if (!typeStr) return 'UNKNOWN'
      const normalized = typeStr.toLowerCase().replace(/[\s-_]/g, '')
      if (normalized.includes('aadhaar')) return 'AADHAAR'
      if (normalized.includes('pan')) return 'PAN'
      if (normalized.includes('passport')) return 'PASSPORT'
      if (normalized.includes('voterid') || normalized.includes('voter')) return 'VOTER_ID'
      if (normalized.includes('drivinglicence') || normalized.includes('drivinglicense') || normalized.includes('driving')) return 'DRIVING_LICENSE'
      return 'UNKNOWN'
    }

    for (const entry of guestEntries) {
      // Generate standard guest check-in UID
      const uid = 'GST-' + Date.now().toString(16).toUpperCase().slice(-8)

      // 2. Insert check-in record
      const checkinRecord: any = {
        property_id: propertyId,
        owner_id: property.owner_id,
        organization_id: property.organization_id || null,
        guest_phone: entry.mobile_number || '—',
        guest_name: entry.guest_name || 'Guest (Register OCR)',
        num_people: 1,
        checkin_date: entry.checkin_date || registerDate || null,
        checkout_date: entry.checkout_date || null,
        uid,
        status: 'completed',
        source: 'Register OCR',
        register_date: registerDate || null,
        register_image_url: imageUrls.join(', ')
      }

      const { data: checkin, error: checkinError } = await supabaseAdmin
        .from('guest_checkins')
        .insert([checkinRecord])
        .select('id')
        .single()

      if (checkinError || !checkin) {
        console.error('[SAVE-REGISTER-GUESTS] Failed to save check-in:', checkinError)
        continue
      }

      savedCheckinIds.push(checkin.id)

      // 3. Create guest identity record
      const identityRecord = {
        checkin_id: checkin.id,
        document_type: mapIdTypeEnum(entry.id_type),
        document_number: entry.id_number || '—',
        full_name: entry.guest_name || 'Guest (Register OCR)',
        is_verified: true,
        verification_status: 'VERIFIED',
        document_image_url: imageUrls[0] || null, // Front side uses first page image
        raw_ocr_text: JSON.stringify(entry),
        verification_reason: 'Verified via Register OCR digitization.'
      }

      const { data: identity, error: identityError } = await supabaseAdmin
        .from('guest_identity')
        .insert([identityRecord])
        .select('id')
        .single()

      if (identityError || !identity) {
        console.error('[SAVE-REGISTER-GUESTS] Failed to save identity:', identityError)
        continue
      }

      // Link identity record back in the JSON array in guest_checkins.id_documents
      const idDocuments = [{ personIndex: 1, identityId: identity.id }]
      await supabaseAdmin
        .from('guest_checkins')
        .update({ id_documents: idDocuments })
        .eq('id', checkin.id)
    }

    return {
      success: true,
      count: savedCheckinIds.length
    }
  } catch (err: any) {
    console.error('[SAVE-REGISTER-GUESTS] Uncaught exception:', err)
    return { success: false, error: err.message || 'Failed to save register guests.' }
  }
}

