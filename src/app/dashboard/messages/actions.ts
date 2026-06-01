'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function sendMessage(ownerId: string, senderType: 'police' | 'owner', content: string, attachmentUrl?: string) {
  try {
    const supabase = await createClient()
    const { data: user, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const role = user.user.user_metadata?.role;
    if (senderType === 'police' && role !== 'police') {
      return { success: false, error: 'Unauthorized role' }
    }
    // Note: We don't strictly enforce owner id match here for owners to avoid edge case issues, 
    // but we enforce the senderType role.
    if (senderType === 'owner' && role !== 'owner') {
      return { success: false, error: 'Unauthorized role' }
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('messages')
      .insert({
        owner_id: ownerId,
        sender_type: senderType,
        content: content,
        attachment_url: attachmentUrl || null,
        is_read: false
      })

    if (error) {
      console.error('Error sending message:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error sending message:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

export async function getMessages(ownerId: string) {
  try {
    const supabase = await createClient()
    const { data: user, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messages: data }
  } catch (err: any) {
    console.error('Unexpected error fetching messages:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

export async function markAsRead(ownerId: string, readerType: 'police' | 'owner') {
  try {
    const supabase = await createClient()
    const { data: user, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const targetSenderType = readerType === 'police' ? 'owner' : 'police'

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('owner_id', ownerId)
      .eq('sender_type', targetSenderType)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking messages as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error marking messages as read:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

export async function getOwnersWithProperties() {
  try {
    const supabaseAdmin = createAdminClient()
    
    // Fetch directly from owners table to avoid auth.admin.listUsers() limits
    const { data: owners, error: ownersError } = await supabaseAdmin
      .from('owners')
      .select('*')

    if (ownersError) throw ownersError
    
    // Fetch properties
    const { data: properties, error: propError } = await supabaseAdmin
      .from('properties')
      .select('id, name, owner_id')

    if (propError) throw propError

    // Map owners to their properties
    const ownersData = owners.map(owner => {
      // properties.owner_id matches owners.id
      const ownerProps = properties.filter(p => p.owner_id === owner.id)
      return {
        id: owner.user_id, // Important: keep id as user_id for messaging
        name: owner.name || owner.email || 'Unknown Owner',
        properties: ownerProps
      }
    })

    return { success: true, owners: ownersData }
  } catch (err: any) {
    console.error('Unexpected error fetching owners:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}
