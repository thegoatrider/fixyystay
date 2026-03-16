'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createLead(formData: {
  ownerId: string
  propertyId: string
  phoneNumber: string
  checkinDate: string
  checkoutDate: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .insert([
      {
        owner_id: formData.ownerId,
        property_id: formData.propertyId,
        phone_number: formData.phoneNumber,
        checkin_date: formData.checkinDate || null,
        checkout_date: formData.checkoutDate || null,
        status: 'Enquired'
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating lead:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/owner')
  return { success: true, lead: data }
}

export async function updateLeadStatus(leadId: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId)

  if (error) {
    console.error('Error updating lead status:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/owner')
  return { success: true }
}

export async function updateLeadMarking(leadId: string, marking: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ marking })
    .eq('id', leadId)

  if (error) {
    console.error('Error updating lead marking:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/owner')
  return { success: true }
}
