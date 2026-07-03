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
      const isAllowedStatus = identity.verification_status === 'VERIFIED' || identity.verification_status === 'MANUAL_REVIEW';
      if (!isAllowedStatus) {
        return { error: `Verification is incomplete or failed for ${identity.full_name || 'one of the guests'}. Please re-upload a clearer image.` }
      }
      if (!identity.full_name || identity.full_name.trim() === '') {
        return { error: 'Full Name could not be parsed. Please re-upload a clearer image.' }
      }
      if (!identity.document_number || identity.document_number.trim() === '') {
        return { error: 'Document Number could not be parsed. Please re-upload a clearer image.' }
      }
      if (!identity.document_type || identity.document_type === 'UNKNOWN') {
        return { error: 'Document Type is unrecognized. Please re-upload a clearer image.' }
      }
    }

    console.log(`[CHECKIN] Submitting check-in for property ${propertyId}, guest ${guestName}, ${numPeople} person(s)`)

    const { data: property, error: propError } = await supabaseAdmin
      .from('properties')
      .select('owner_id, name, helpdesk_number')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      console.error('[CHECKIN] Property fetch error:', propError)
      return { error: 'Property not found. Please verify the check-in link.' }
    }

    // Generate UID
    const uid = 'GST-' + Date.now().toString(16).toUpperCase().slice(-8)

    // Store identity IDs as an array for reference
    const idDocuments = identityIds.map((id, i) => ({ personIndex: i + 1, identityId: id }))

    const checkinRecord = {
      property_id: propertyId,
      owner_id: property.owner_id,
      guest_phone: guestPhone,
      guest_name: guestName,
      num_people: numPeople,
      checkin_date: checkinDate || null,
      checkout_date: checkoutDate || null,
      vehicle_number: (formData.get('vehicleNumber') as string) || null,
      id_documents: idDocuments,
      uid,
      status: 'completed'
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
    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .select('name, helpdesk_number')
      .eq('id', propertyId)
      .single()

    if (error || !property) return null
    return property
  } catch (err) {
    console.error('Error fetching property info:', err)
    return null
  }
}
