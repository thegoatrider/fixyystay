'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function approveProperty(propertyId: string) {
  const supabase = await createClient()
  
  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('properties')
    .update({ approved: true })
    .eq('id', propertyId)

  if (error) {
    console.error('Failed to approve property', error)
    throw new Error('Failed to approve property')
  }

  revalidatePath('/dashboard/admin')
}

export async function deleteProperty(propertyId: string) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  
  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  // 1. Fetch images to delete from storage
  // We need to fetch property images AND room images for this property
  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('image_url, image_urls')
    .eq('id', propertyId)
    .single()

  const { data: rooms } = await supabaseAdmin
    .from('rooms')
    .select('image_url, image_urls')
    .eq('property_id', propertyId)

  const imagesToDelete: string[] = []
  if (property?.image_url) imagesToDelete.push(property.image_url)
  if (property?.image_urls) imagesToDelete.push(...property.image_urls)
  
  rooms?.forEach(room => {
    if (room.image_url) imagesToDelete.push(room.image_url)
    if ((room as any).image_urls) imagesToDelete.push(...(room as any).image_urls)
  })

  // Convert URLs to file paths (assuming public URL format)
  const filePaths = imagesToDelete
    .map(url => {
      try {
        const parts = url.split('/property_images/')
        return parts.length > 1 ? parts[1] : null
      } catch {
        return null
      }
    })
    .filter(Boolean) as string[]

  // 2. Delete files from storage
  if (filePaths.length > 0) {
    const { error: storageError } = await supabaseAdmin.storage
      .from('property_images')
      .remove(filePaths)
    if (storageError) console.error('Storage cleanup failed (non-fatal):', storageError)
  }

  // 3. Delete from DB (cascaded)
  const { error } = await supabaseAdmin
    .from('properties')
    .delete()
    .eq('id', propertyId)

  if (error) {
    console.error('Failed to delete property', error)
    throw new Error('Failed to delete property')
  }

  revalidatePath('/dashboard/admin')
}

export async function assignInfluencer(propertyId: string, influencerId: string) {
  const supabase = await createClient()

  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('influencer_properties')
    .insert([{ property_id: propertyId, influencer_id: influencerId }])

  if (error) {
    if (error.code === '23505') {
      throw new Error('Influencer already assigned to this property')
    }
    console.error('Failed to assign influencer', error)
    throw new Error('Failed to assign influencer')
  }

  revalidatePath('/dashboard/admin')
}

export async function toggleFeatured(propertyId: string, currentValue: boolean) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('properties')
    .update({ featured: !currentValue })
    .eq('id', propertyId)

  if (error) {
    console.error('Failed to toggle featured', error)
    throw new Error('Failed to update featured status')
  }

  revalidatePath('/dashboard/admin')
  revalidatePath('/guest')
}

export async function approveInfluencer(formData: FormData) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin' && user?.email !== 'superadmin@fixstay.com') {
    throw new Error('Unauthorized')
  }

  const influencerId = formData.get('influencerId') as string
  const commissionRate = parseFloat(formData.get('commissionRate') as string) || 0

  const { error } = await supabaseAdmin
    .from('influencers')
    .update({ approved: true, commission_rate: commissionRate })
    .eq('id', influencerId)

  if (error) {
    console.error('Failed to approve influencer', error)
    throw new Error('Failed to approve influencer')
  }

  revalidatePath('/dashboard/admin')
}

export async function rejectInfluencer(influencerId: string) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin' && user?.email !== 'superadmin@fixstay.com') {
    throw new Error('Unauthorized')
  }

  const { error } = await supabaseAdmin
    .from('influencers')
    .delete()
    .eq('id', influencerId)

  if (error) {
    console.error('Failed to reject influencer', error)
    throw new Error('Failed to reject influencer')
  }

  revalidatePath('/dashboard/admin')
}

export async function processPayout(requestId: string, action: 'approve' | 'reject') {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin' && user?.email !== 'superadmin@fixstay.com') {
    throw new Error('Unauthorized')
  }

  // 1. Fetch the request
  const { data: request } = await supabaseAdmin.from('payout_requests').select('*').eq('id', requestId).single()
  if (!request || request.status !== 'pending') {
    throw new Error('Invalid or already processed request')
  }

  // 2. Update status
  const newStatus = action === 'approve' ? 'completed' : 'rejected'
  await supabaseAdmin.from('payout_requests').update({ status: newStatus }).eq('id', requestId)

  // 3. If approved, lock the money by deducting from wallet ledger
  if (action === 'approve') {
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: request.user_id,
      amount: -Math.abs(request.amount),
      transaction_type: 'payout',
      description: `Manual Payout Processed to ${request.bank_details}`
    })
  }

  revalidatePath('/dashboard/admin')
}
