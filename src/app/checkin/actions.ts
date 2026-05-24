'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export async function submitSingleCheckin(formData: FormData, verifiedIdentityId: string) {
  try {
    const supabaseAdmin = createAdminClient()

    const propertyId = formData.get('propertyId') as string
    const guestPhone = formData.get('guestPhone') as string
    const guestName = formData.get('guestName') as string
    const numPeople = parseInt(formData.get('numPeople') as string) || 1
    const checkinDate = formData.get('checkinDate') as string
    const checkoutDate = formData.get('checkoutDate') as string

    console.log(`[CHECKIN] Submitting single check-in for property ${propertyId}, guest ${guestName}`)

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

    const idDocuments = [{ primaryIdentityId: verifiedIdentityId }]

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
      uid: uid,
      status: 'completed'
    }

    const { data: insertedCheckin, error: insertError } = await supabaseAdmin
      .from('guest_checkins')
      .insert([checkinRecord])
      .select('id')
      .single()

    if (insertError) {
      console.error('[CHECKIN] Check-in Insert failed:', insertError)
      return { error: `Database error: ${insertError.message}. Please contact the property owner.` }
    }

    // Link Guest Identity to Checkin Record
    const { error: updateError } = await supabaseAdmin
      .from('guest_identity')
      .update({ checkin_id: insertedCheckin.id })
      .eq('id', verifiedIdentityId)

    if (updateError) {
      console.error('[CHECKIN] Failed to link identity:', updateError)
    }

    console.log(`[CHECKIN] Successfully completed check-in: ${insertedCheckin.id}`)

    return { 
      success: true, 
      propertyName: property.name, 
      helpdeskNumber: property.helpdesk_number || 'No helpdesk set'
    }
  } catch (err: any) {
    console.error('[CHECKIN] Critical uncaught exception during check-in:', err)
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

