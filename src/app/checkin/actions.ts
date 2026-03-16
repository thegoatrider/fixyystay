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

  // Find property and owner info
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('owner_id, name, helpdesk_number')
    .eq('id', propertyId)
    .single()

  if (propError || !property) {
    return { error: 'Property not found' }
  }

  // Handle ID Uploads
  const idDocuments = []
  
  for (let i = 0; i < numPeople; i++) {
    const file = formData.get(`guestID_${i}`) as File
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${propertyId}-${Date.now()}-${i}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property_images') // Using existing bucket for simplicity, or could be 'guest_ids'
        .upload(`guest_ids/${fileName}`, file)

      if (uploadError) {
        console.error(`ID Upload failed for person ${i + 1}:`, uploadError)
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('property_images')
          .getPublicUrl(`guest_ids/${fileName}`)
        
        idDocuments.push({
          personIndex: i + 1,
          fileName: file.name,
          url: publicUrlData.publicUrl
        })
      }
    }
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
