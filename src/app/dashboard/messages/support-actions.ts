'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function sendSupportMessage(
  ownerId: string,
  senderType: 'admin' | 'owner',
  content: string,
  attachmentUrl?: string
) {
  try {
    const supabase = await createClient()
    const { data: user, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const role = user.user.user_metadata?.role
    const isSuperAdmin = user.user.email === 'superadmin@fixstay.com'

    if (senderType === 'admin' && role !== 'admin' && !isSuperAdmin) {
      return { success: false, error: 'Unauthorized role' }
    }
    if (senderType === 'owner' && role !== 'owner' && !isSuperAdmin) {
      return { success: false, error: 'Unauthorized role' }
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('support_messages')
      .insert({
        owner_id: ownerId,
        sender_type: senderType,
        content: content,
        attachment_url: attachmentUrl || null,
        is_read: false
      })

    if (error) {
      console.error('Error sending support message:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error sending support message:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

export async function getSupportMessages(ownerId: string) {
  try {
    const supabase = await createClient()
    const { data: user, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .select('id, owner_id, sender_type, content, attachment_url, is_read, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching support messages:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messages: data }
  } catch (err: any) {
    console.error('Unexpected error fetching support messages:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

export async function markSupportAsRead(ownerId: string, readerType: 'admin' | 'owner') {
  try {
    const supabase = await createClient()
    const { data: user, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const targetSenderType = readerType === 'admin' ? 'owner' : 'admin'

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('support_messages')
      .update({ is_read: true })
      .eq('owner_id', ownerId)
      .eq('sender_type', targetSenderType)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking support messages as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error marking support messages as read:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

export async function getSupportOwners() {
  try {
    const supabase = await createClient()
    const { data: user, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const role = user.user.user_metadata?.role
    const isSuperAdmin = user.user.email === 'superadmin@fixstay.com'

    if (role !== 'admin' && !isSuperAdmin) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabaseAdmin = createAdminClient()
    
    // Fetch all owners
    const { data: owners, error: ownersError } = await supabaseAdmin
      .from('owners')
      .select('id, user_id, name, email, phone')

    if (ownersError) throw ownersError

    // Fetch properties
    const { data: properties, error: propError } = await supabaseAdmin
      .from('properties')
      .select('id, name, owner_id, city_area')

    if (propError) throw propError

    // Fetch all support messages to calculate unread counts and latest messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('support_messages')
      .select('id, owner_id, sender_type, content, attachment_url, is_read, created_at')
      .order('created_at', { ascending: false })

    if (msgError) throw msgError

    // Map owners with properties, latest support message, and unread count
    const ownersData = owners.map(owner => {
      const ownerProps = properties.filter(p => p.owner_id === owner.id)
      const ownerMessages = messages.filter(m => m.owner_id === owner.user_id)
      
      const unreadCount = ownerMessages.filter(m => m.sender_type === 'owner' && !m.is_read).length
      const latestMessage = ownerMessages[0] || null

      return {
        id: owner.user_id, // Match auth.users.id
        db_owner_id: owner.id, // public.owners.id
        name: owner.name || owner.email || 'Unknown Owner',
        email: owner.email,
        properties: ownerProps,
        latestMessage,
        unreadCount
      }
    })

    // Sort owners by latest message timestamp (most recent first), then by name
    ownersData.sort((a, b) => {
      if (a.latestMessage && b.latestMessage) {
        return new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime()
      }
      if (a.latestMessage) return -1
      if (b.latestMessage) return 1
      return a.name.localeCompare(b.name)
    })

    return { success: true, owners: ownersData }
  } catch (err: any) {
    console.error('Unexpected error fetching support owners:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

export async function sendSupportBroadcast(
  ownerIds: string[],
  senderType: 'admin',
  content: string,
  attachmentUrl?: string
) {
  try {
    const supabase = await createClient()
    const { data: user, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const role = user.user.user_metadata?.role
    const isSuperAdmin = user.user.email === 'superadmin@fixstay.com'

    if (role !== 'admin' && !isSuperAdmin) {
      return { success: false, error: 'Unauthorized role' }
    }

    if (!ownerIds || ownerIds.length === 0) {
      return { success: false, error: 'No recipients specified' }
    }

    const supabaseAdmin = createAdminClient()
    
    // Batch insert message records for each owner
    const insertRows = ownerIds.map(ownerId => ({
      owner_id: ownerId,
      sender_type: senderType,
      content: content,
      attachment_url: attachmentUrl || null,
      is_read: false
    }))

    const { error } = await supabaseAdmin
      .from('support_messages')
      .insert(insertRows)

    if (error) {
      console.error('Error sending support broadcast messages:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error sending support broadcast message:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}
