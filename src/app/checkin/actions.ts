'use server'

import { createClient } from '@/utils/supabase/server'

export async function submitCheckin(formData: FormData) {
  const supabase = await createClient()

  const propertyId = formData.get('propertyId') as string
  const guestPhone = formData.get('guestPhone') as string
  const guestName = formData.get('guestName') as string
  const numPeople = parseInt(formData.get('numPeople') as string)
  const checkinDate = formData.get('checkinDate') as string
  const checkoutDate = formData.get('checkoutDate') as string

  // Find property and owner info using Service Role to bypass RLS during check-in
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
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
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
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

  // Insert check-in record
  const { error } = await supabase
    .from('guest_checkins')
    .insert([{
      property_id: propertyId,
      owner_id: property.owner_id,
      guest_phone: guestPhone,
      guest_name: guestName,
      num_people: numPeople,
      checkin_date: checkinDate || null,
      checkout_date: checkoutDate || null,
      id_documents: idDocuments
    }])

  if (error) {
    console.error('Check-in failed:', error)
    return { error: 'Failed to save check-in details. Please try again.' }
  }

  return { 
    success: true, 
    propertyName: property.name, 
    helpdeskNumber: property.helpdesk_number 
  }
}
