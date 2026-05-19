'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export async function submitCheckin(formData: FormData) {
  try {
    const supabaseAdmin = createAdminClient()

    const propertyId = formData.get('propertyId') as string
    const guestPhone = formData.get('guestPhone') as string
    const guestName = formData.get('guestName') as string
    const numPeople = parseInt(formData.get('numPeople') as string) || 1
    const checkinDate = formData.get('checkinDate') as string
    const checkoutDate = formData.get('checkoutDate') as string

    console.log(`[CHECKIN] Starting submission for property ${propertyId}, guest ${guestName}`)

    const { data: property, error: propError } = await supabaseAdmin
      .from('properties')
      .select('owner_id, name, helpdesk_number')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      console.error('[CHECKIN] Property fetch error:', propError, 'propertyId:', propertyId)
      return { error: 'Property not found. Please verify the check-in link.' }
    }

    // Collect verified ID references
    const idDocuments = []
    const allIdentityIds: string[] = []
    
    for (let i = 0; i < numPeople; i++) {
      const frontId = formData.get(`guestIdentityId_front_${i}`) as string
      const backId = formData.get(`guestIdentityId_back_${i}`) as string
      
      if (!frontId || !backId) {
        return { error: `Missing verified IDs for Guest ${i+1}. Please ensure all IDs are uploaded and verified.` }
      }

      allIdentityIds.push(frontId, backId)

      // We still store some basic structured format in guest_checkins.id_documents for legacy compatibility or quick access
      idDocuments.push({
        personIndex: i + 1,
        frontIdentityId: frontId,
        backIdentityId: backId
      })
    }

    // Generate and include UID
    const uid = 'GST-' + Date.now().toString(16).toUpperCase().slice(-8)

    const checkinRecord = {
      property_id: propertyId,
      owner_id: property.owner_id,
      guest_phone: guestPhone,
      guest_name: guestName,
      num_people: numPeople,
      checkin_date: checkinDate || null,
      checkout_date: checkoutDate || null,
      vehicle_number: formData.get('vehicleNumber') as string || null,
      id_documents: idDocuments,
      uid: uid
    }

    console.log('[CHECKIN] Final check-in record preparation complete. Inserting into database...')

    // Insert Checkin Record
    const { data: insertedCheckin, error: insertError } = await supabaseAdmin
      .from('guest_checkins')
      .insert([checkinRecord])
      .select('id')
      .single()

    if (insertError) {
      console.error('[CHECKIN] Insert failed:', insertError)
      return { error: `Database error: ${insertError.message}. Please contact the property owner.` }
    }

    const newCheckinId = insertedCheckin.id

    // Link Guest Identities to Checkin Record
    console.log(`[CHECKIN] Linking ${allIdentityIds.length} identities to checkin ${newCheckinId}...`)
    
    const { error: updateError } = await supabaseAdmin
      .from('guest_identity')
      .update({ checkin_id: newCheckinId })
      .in('id', allIdentityIds)

    if (updateError) {
      console.error('[CHECKIN] Failed to link identities:', updateError)
      // We don't fail the whole request if linking fails, but log it aggressively
    }

    console.log(`[CHECKIN] Successfully completed check-in: ${uid}`)

    return { 
      success: true, 
      propertyName: property.name, 
      helpdeskNumber: property.helpdesk_number || 'No helpdesk set'
    }
  } catch (err: any) {
    console.error('[CHECKIN] CRcritical uncaught exception during check-in:', err)
    return { error: `System Error: ${err.message || 'The server encountered an unexpected issue.'}` }
  }
}

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

