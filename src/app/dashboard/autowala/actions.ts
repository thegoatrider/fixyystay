'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateTrackingLink(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { error: 'Unauthorized' }

    const influencerId = formData.get('influencerId') as string
    const propertyId = formData.get('propertyId') as string
    const customerName = formData.get('customerName') as string
    const customerPhone = formData.get('customerPhone') as string

    if (!propertyId || !customerName || !customerPhone) {
      return { error: 'Please fill in all fields' }
    }

    const { data, error } = await supabase
      .from('influencer_links')
      .insert({
        influencer_id: influencerId,
        property_id: propertyId,
        customer_name: customerName,
        customer_phone: customerPhone,
        status: 'sent'
      })
      .select('id')
      .single()

    if (error) {
      console.error('Link generation error:', error)
      return { error: 'Failed to generate tracking link' }
    }

    revalidatePath('/dashboard/autowala')
    return { success: true, linkId: data.id }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}
