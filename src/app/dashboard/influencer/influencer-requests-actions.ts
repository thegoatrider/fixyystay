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

    const normalizedEmail = user.email ? user.email.toLowerCase() : ''

    // 1. Get Influencer ID representing this user
    let { data: existingInfluencer } = await supabase
      .from('influencers')
      .select('id, approved, user_id, email')
      .eq('user_id', user.id)
      .maybeSingle()

    // Backup: Find by email if not found by user_id
    if (!existingInfluencer) {
      const { data: byEmail } = await supabase
        .from('influencers')
        .select('id, approved, user_id, email')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (byEmail) {
        existingInfluencer = byEmail
        // Update user_id and email format to ensure sync
        await supabase
          .from('influencers')
          .update({ user_id: user.id, email: normalizedEmail })
          .eq('id', byEmail.id)
      }
    } else {
      // Keep email lowercase
      if (existingInfluencer.email !== normalizedEmail) {
        await supabase
          .from('influencers')
          .update({ email: normalizedEmail })
          .eq('id', existingInfluencer.id)
      }
    }

    let influencerId = existingInfluencer?.id

    if (!existingInfluencer) {
      // Auto-create if they have the role but no record
      if (user.user_metadata?.role === 'influencer' || user.email === 'superadmin@fixstay.com') {
        const { data: newInfluencer, error: createError } = await supabase
          .from('influencers')
          .insert({
            id: user.id,
            user_id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            email: normalizedEmail,
            approved: true, // Auto-approve for marketplace flow
            commission_rate: 5 // Standard default
          })
          .select('id')
          .single()
        
        if (createError) {
          console.error('Failed to auto-create influencer:', createError)
          return { error: 'Failed to initialize influencer profile.' }
        }
        influencerId = newInfluencer.id
      } else {
        return { error: 'You do not have permission to pitch as an influencer.' }
      }
    }

    // 2. Insert Request
    const { error } = await supabase
      .from('influencer_promotion_requests')
      .insert([{
        influencer_id: influencerId,
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
