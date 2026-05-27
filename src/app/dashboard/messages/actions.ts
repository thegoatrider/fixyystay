'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function sendMessage(ownerId: string, senderType: 'police' | 'owner', content: string) {
  try {
    const supabase = createClient()
    const { data: user, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        owner_id: ownerId,
        sender_type: senderType,
        content: content,
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
    const supabase = createClient()
    const { data, error } = await supabase
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
    const supabase = createClient()
    
    // We update messages where sender is NOT the reader type and are unread
    const targetSenderType = readerType === 'police' ? 'owner' : 'police'

    const { error } = await supabase
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
    
    // Using admin client because police might not have RLS access to see all users/properties if not setup
    // Fetch users who are owners
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    if (usersError) throw usersError

    const owners = users.users.filter(u => u.user_metadata?.role === 'owner')
    
    // Fetch properties
    const { data: properties, error: propError } = await supabaseAdmin
      .from('properties')
      .select('id, name, owner_id')

    if (propError) throw propError

    // Map owners to their properties
    const ownersData = owners.map(owner => {
      const ownerProps = properties.filter(p => p.owner_id === owner.id)
      return {
        id: owner.id,
        name: owner.user_metadata?.name || owner.email || 'Unknown Owner',
        properties: ownerProps
      }
    })

    return { success: true, owners: ownersData }
  } catch (err: any) {
    console.error('Unexpected error fetching owners:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}
