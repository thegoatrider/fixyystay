'use server'

import { createClient } from '@/utils/supabase/server'
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

    const { data: property, error: propError } = await supabaseAdmin
      .from('properties')
      .select('owner_id, name, helpdesk_number')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      console.error('Property fetch error in check-in:', propError, 'propertyId:', propertyId)
      return { error: 'Property not found' }
    }

    // Handle ID Uploads
    const idDocuments = []
    
    for (let i = 0; i < numPeople; i++) {
      const frontFile = formData.get(`guestID_front_${i}`) as File
      const backFile = formData.get(`guestID_back_${i}`) as File
      
      const personDocs: any = { personIndex: i + 1 }

      if (frontFile && frontFile.size > 0) {
        const fileExt = frontFile.name.split('.').pop()
        const fileName = `${propertyId}-${Date.now()}-${i}-front.${fileExt}`
        const { error: uploadError } = await supabaseAdmin.storage
          .from('property_images')
          .upload(`guest_ids/${fileName}`, frontFile)

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(`guest_ids/${fileName}`)
          personDocs.frontUrl = publicUrlData.publicUrl
        } else {
          console.error('Front ID upload error:', uploadError)
        }
      }

      if (backFile && backFile.size > 0) {
        const fileExt = backFile.name.split('.').pop()
        const fileName = `${propertyId}-${Date.now()}-${i}-back.${fileExt}`
        const { error: uploadError } = await supabaseAdmin.storage
          .from('property_images')
          .upload(`guest_ids/${fileName}`, backFile)

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(`guest_ids/${fileName}`)
          personDocs.backUrl = publicUrlData.publicUrl
        } else {
          console.error('Back ID upload error:', uploadError)
        }
      }

      idDocuments.push(personDocs)
    }

    // Generate a simple UID
    const uid = 'GST-' + Date.now().toString(16).toUpperCase()

    const checkinRecord: any = {
      property_id: propertyId,
      owner_id: property.owner_id,
      guest_phone: guestPhone,
      guest_name: guestName,
      num_people: numPeople,
      checkin_date: checkinDate || null,
      checkout_date: checkoutDate || null,
      id_documents: idDocuments,
    }

    // Try insert — use admin to bypass RLS for public guests
    const { error: insertError } = await supabaseAdmin.from('guest_checkins').insert([checkinRecord])

    if (insertError) {
      // If error is about missing uid column, that is expected on some systems, 
      // but here we are not sending it anymore. 
      // If there's another error, log it.
      console.error('Check-in insert failed:', insertError)
      return { error: `Failed to save check-in: ${insertError.message}` }
    }

    return { 
      success: true, 
      propertyName: property.name, 
      helpdeskNumber: property.helpdesk_number 
    }
  } catch (err: any) {
    console.error('Checkin server action exception:', err)
    return { error: `Server Error: ${err.message || 'An unexpected error occurred'}` }
  }
}

