'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProperty(propertyId: string, formData: FormData) {
  const supabase = await createClient()

  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const imageUrl = formData.get('image_url') as string
  
  // Amenities are comma separated in the form
  const amenitiesString = formData.get('amenities') as string
  const amenities = amenitiesString 
    ? amenitiesString.split(',').map(a => a.trim()).filter(a => a.length > 0)
    : []

  if (!name || !type) {
    throw new Error('Name and Type are required')
  }

  const { error } = await supabase
    .from('properties')
    .update({
      name,
      type,
      description: description || null,
      image_url: imageUrl || null,
      amenities
    })
    .eq('id', propertyId)

  if (error) {
    console.error('Failed to update property', error)
    throw new Error('Failed to update property')
  }

  revalidatePath('/dashboard/admin')
  revalidatePath(`/dashboard/admin/properties/${propertyId}`)
}
