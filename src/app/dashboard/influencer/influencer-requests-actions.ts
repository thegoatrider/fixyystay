'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Influencer: Submit a new promotion request to a property owner
 */
export async function submitPromotionRequest(propertyId: string, proposalText: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Get Influencer ID representing this user
    const { data: influencer } = await supabase
      .from('influencers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!influencer) return { error: 'You must be an approved influencer to send requests.' }

    // 2. Insert Request
    const { error } = await supabase
      .from('influencer_promotion_requests')
      .insert([{
        influencer_id: influencer.id,
        property_id: propertyId,
        proposal_text: proposalText,
        status: 'pending'
      }])

    if (error) {
      if (error.code === '23505') return { error: 'You have already sent a request for this property.' }
      console.error('Request failed:', error)
      return { error: 'Failed to send request.' }
    }

    revalidatePath('/dashboard/influencer')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

/**
 * Owner/Admin: Respond to an influencer's request
 */
export async function respondToPromotionRequest(requestId: string, status: 'accepted' | 'rejected', reason?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // RLS will handle ownership verification
    const { error } = await supabase
      .from('influencer_promotion_requests')
      .update({ 
        status, 
        rejection_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (error) {
      console.error('Update failed:', error)
      return { error: 'Failed to process request.' }
    }

    revalidatePath('/dashboard/owner')
    revalidatePath('/dashboard/influencer')
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

/**
 * Owner: Get all requests for their properties
 */
export async function getOwnerPromotionRequests(ownerId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('influencer_promotion_requests')
    .select(`
      *,
      influencers (id, name, email),
      properties (id, name)
    `)
    .in('property_id', (
      await supabase.from('properties').select('id').eq('owner_id', ownerId)
    ).data?.map(p => p.id) || [])
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { requests: data }
}
