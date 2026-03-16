'use server'

import { createClient } from '@/utils/supabase/server'
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

export async function discardProperty(propertyId: string) {
  const supabase = await createClient()
  
  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)

  if (error) {
    console.error('Failed to discard property', error)
    throw new Error('Failed to discard property')
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
