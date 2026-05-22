'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export async function createDraftCheckin(formData: FormData) {
  try {
    const supabaseAdmin = createAdminClient()

    const propertyId = formData.get('propertyId') as string
    const guestPhone = formData.get('guestPhone') as string
    const guestName = formData.get('guestName') as string
    const numPeople = parseInt(formData.get('numPeople') as string) || 1
    const checkinDate = formData.get('checkinDate') as string
    const checkoutDate = formData.get('checkoutDate') as string

    console.log(`[CHECKIN] Starting draft check-in for property ${propertyId}, guest ${guestName}`)

    const { data: property, error: propError } = await supabaseAdmin
      .from('properties')
      .select('owner_id, name, helpdesk_number')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      console.error('[CHECKIN] Property fetch error:', propError, 'propertyId:', propertyId)
      return { error: 'Property not found. Please verify the check-in link.' }
    }

    // Generate UID
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
      id_documents: [], // Empty initially
      uid: uid,
      status: 'draft' // Mark as draft
    }

    const { data: insertedCheckin, error: insertError } = await supabaseAdmin
      .from('guest_checkins')
      .insert([checkinRecord])
      .select('id')
      .single()

    if (insertError) {
      console.error('[CHECKIN] Draft Insert failed:', insertError)
      return { error: `Database error: ${insertError.message}. Please contact the property owner.` }
    }

    return { 
      success: true, 
      checkinId: insertedCheckin.id,
      propertyName: property.name, 
      helpdeskNumber: property.helpdesk_number || 'No helpdesk set'
    }
  } catch (err: any) {
    console.error('[CHECKIN] Critical uncaught exception during draft check-in:', err)
    return { error: `System Error: ${err.message || 'The server encountered an unexpected issue.'}` }
  }
}

export async function completeCheckin(checkinId: string, verifiedIdentities: Record<string, string>, numPeople: number) {
  try {
    const supabaseAdmin = createAdminClient()

    console.log(`[CHECKIN] Completing checkin ${checkinId}`)

    const idDocuments = []
    const allIdentityIds: string[] = []
    
    for (let i = 0; i < numPeople; i++) {
      const frontId = verifiedIdentities[`front_${i}`]
      const backId = verifiedIdentities[`back_${i}`]
      
      if (!frontId || !backId) {
        return { error: `Missing verified IDs for Guest ${i+1}. Please ensure all IDs are uploaded and verified.` }
      }

      allIdentityIds.push(frontId, backId)

      idDocuments.push({
        personIndex: i + 1,
        frontIdentityId: frontId,
        backIdentityId: backId
      })
    }

    // Link Guest Identities to Checkin Record
    console.log(`[CHECKIN] Linking ${allIdentityIds.length} identities to checkin ${checkinId}...`)
    
    const { error: updateError } = await supabaseAdmin
      .from('guest_identity')
      .update({ checkin_id: checkinId })
      .in('id', allIdentityIds)

    if (updateError) {
      console.error('[CHECKIN] Failed to link identities:', updateError)
    }

    // Mark checkin as completed and save legacy id_documents structure
    const { error: finalError } = await supabaseAdmin
      .from('guest_checkins')
      .update({
        status: 'completed',
        id_documents: idDocuments
      })
      .eq('id', checkinId)

    if (finalError) {
      console.error('[CHECKIN] Failed to update checkin status:', finalError)
      return { error: 'Failed to complete checkin. Please contact support.' }
    }

    console.log(`[CHECKIN] Successfully completed check-in: ${checkinId}`)

    return { success: true }
  } catch (err: any) {
    console.error('[CHECKIN] Critical uncaught exception during check-in completion:', err)
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

