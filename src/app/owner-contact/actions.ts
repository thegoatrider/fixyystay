'use server'

import { createClient } from '@/utils/supabase/server'

export async function submitOwnerLead(formData: FormData) {
  const supabase = await createClient()

  const full_name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const city = formData.get('city') as string
  const area = formData.get('area') as string
  const google_link = formData.get('google_link') as string

  if (!full_name || !phone || !city || !area || !google_link) {
    return { error: 'All fields are compulsory. Please fill everything.' }
  }

  const { error } = await supabase.from('property_owner_leads').insert([{
    full_name,
    phone,
    city,
    area,
    google_link,
    status: 'pending'
  }])

  if (error) {
    console.error('Lead submission error:', error)
    return { error: 'Failed to submit. Please try again later.' }
  }

  return { success: true }
}
