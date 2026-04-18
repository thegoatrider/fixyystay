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

    // Handle ID Uploads
    const idDocuments = []
    
    for (let i = 0; i < numPeople; i++) {
      const frontFile = formData.get(`guestID_front_${i}`) as File
      const backFile = formData.get(`guestID_back_${i}`) as File
      
      const personDocs: any = { personIndex: i + 1 }

      if (frontFile && frontFile.size > 0) {
        const fileExt = frontFile.name.split('.').pop() || 'jpg'
        const randomStr = Math.random().toString(36).substring(2, 7)
        const fileName = `ch-${propertyId}-${Date.now()}-${randomStr}-f${i}.${fileExt}`
        
        console.log(`[CHECKIN] Uploading Front ID for guest ${i+1}...`)
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
          console.error(`[CHECKIN] Front ID UPLOAD FAILED (Guest ${i+1}):`, uploadError)
          return { error: `File upload failed for Guest ${i+1} (Front Side). Please check your connection.` }
        }
      } else {
        return { error: `Front ID for Guest ${i+1} is missing or empty.` }
      }

      if (backFile && backFile.size > 0) {
        const fileExt = backFile.name.split('.').pop() || 'jpg'
        const randomStr = Math.random().toString(36).substring(2, 7)
        const fileName = `ch-${propertyId}-${Date.now()}-${randomStr}-b${i}.${fileExt}`
        
        console.log(`[CHECKIN] Uploading Back ID for guest ${i+1}...`)
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
          console.error(`[CHECKIN] Back ID UPLOAD FAILED (Guest ${i+1}):`, uploadError)
          return { error: `File upload failed for Guest ${i+1} (Back Side). Please check your connection.` }
        }
      } else {
        return { error: `Back ID for Guest ${i+1} is missing or empty.` }
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
      vehicle_number: formData.get('vehicleNumber') as string || null,
      id_documents: idDocuments,
      uid: uid
    }

    console.log('[CHECKIN] Final check-in record preparation complete. Inserting into database...')

    // Use admin client which bypasses RLS
    const { error: insertError } = await supabaseAdmin.from('guest_checkins').insert([checkinRecord])

    if (insertError) {
      console.error('[CHECKIN] Insert failed:', insertError)
      return { error: `Database error: ${insertError.message}. Please contact the property owner.` }
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

