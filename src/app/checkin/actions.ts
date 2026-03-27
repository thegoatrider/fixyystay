'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export async function submitCheckin(formData: FormData) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables!')
      return { error: 'Server configuration error. Please contact support.' }
    }

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

    // Handle ID Uploads
    const idDocuments = []
    
    for (let i = 0; i < numPeople; i++) {
      const frontFile = formData.get(`guestID_front_${i}`) as File
      const backFile = formData.get(`guestID_back_${i}`) as File
      
      const personDocs: any = { personIndex: i + 1 }

      if (frontFile && frontFile.size > 0) {
        const fileExt = frontFile.name.split('.').pop() || 'jpg'
        const fileName = `checkin-${propertyId}-${Date.now()}-${i}-front.${fileExt}`
        const { error: uploadError } = await supabaseAdmin.storage
          .from('property_images')
          .upload(`guest_ids/${fileName}`, frontFile, {
            contentType: frontFile.type,
            cacheControl: '3600'
          })

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(`guest_ids/${fileName}`)
          personDocs.frontUrl = publicUrlData.publicUrl
        } else {
          console.error(`[CHECKIN] Front ID upload error (Guest ${i+1}):`, uploadError)
        }
      }

      if (backFile && backFile.size > 0) {
        const fileExt = backFile.name.split('.').pop() || 'jpg'
        const fileName = `checkin-${propertyId}-${Date.now()}-${i}-back.${fileExt}`
        const { error: uploadError } = await supabaseAdmin.storage
          .from('property_images')
          .upload(`guest_ids/${fileName}`, backFile, {
            contentType: backFile.type,
            cacheControl: '3600'
          })

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(`guest_ids/${fileName}`)
          personDocs.backUrl = publicUrlData.publicUrl
        } else {
          console.error(`[CHECKIN] Back ID upload error (Guest ${i+1}):`, uploadError)
        }
      }

      idDocuments.push(personDocs)
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
      id_documents: idDocuments,
      uid: uid // Added missing uid
    }

    console.log('[CHECKIN] Inserting record:', { ...checkinRecord, id_documents: `${idDocuments.length} files` })

    // Use admin client which bypasses RLS
    const { error: insertError } = await supabaseAdmin.from('guest_checkins').insert([checkinRecord])

    if (insertError) {
      console.error('[CHECKIN] Insert failed:', insertError)
      return { error: `Database error: ${insertError.message}` }
    }

    console.log(`[CHECKIN] Success: ${uid}`)

    return { 
      success: true, 
      propertyName: property.name, 
      helpdeskNumber: property.helpdesk_number || 'No helpdesk set'
    }
  } catch (err: any) {
    console.error('[CHECKIN] Uncaught exception:', err)
    return { error: `System error: ${err.message || 'Unknown error occurred'}` }
  }
}

