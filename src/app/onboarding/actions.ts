'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { headers } from 'next/headers'
import { Resend } from 'resend'

async function getAbsoluteOrigin() {
  const reqHeaders = await headers()
  let origin = reqHeaders.get('origin')
  if (!origin) {
    const host = reqHeaders.get('host') || 'www.fixystays.com'
    const isLocal = 
      host.includes('localhost') || 
      host.includes('127.0.0.1') || 
      host.includes('10.0.2.2') || 
      host.includes(':') ||
      host.startsWith('192.168.') || 
      host.startsWith('10.') || 
      host.startsWith('172.')
    const protocol = isLocal ? 'http' : 'https'
    origin = `${protocol}://${host}`
  }
  return origin
}

export async function checkEmailAvailability(email: string) {
  const supabaseAdmin = createAdminClient()
  const normalizedEmail = email.toLowerCase().trim()

  const { data: owner } = await supabaseAdmin
    .from('owners')
    .select('id, user_id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (owner) {
    // Check if they actually have an active subscription
    const { data: subscription } = await supabaseAdmin
      .from('owner_subscriptions')
      .select('status, end_date')
      .eq('owner_id', owner.id)
      .maybeSingle()
    
    const isPaid = subscription?.status === 'active' && new Date(subscription.end_date) > new Date()
    
    if (isPaid) {
      return { error: 'An owner account with this email already has an active subscription. Please log in to your dashboard.' }
    }

    // Account exists but has not paid yet - allow proceeding to payment!
    return { success: true, unpaidExisting: true, ownerId: owner.id }
  }

  // Also check if user exists in auth.users directly
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const authUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail)
  if (authUser) {
    return { success: true, unpaidExisting: true }
  }

  return { success: true }
}

export async function submitOnboarding(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const propertyName = formData.get('propertyName') as string

  if (!name || !email || !password) {
    return { error: 'Name, email, and password are required' }
  }

  const normalizedEmail = email.toLowerCase()

  // 1. Create or update user as an owner with auto-confirmed email
  const supabaseAdmin = createAdminClient()
  let userId: string | null = null

  const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: 'owner',
    },
  })

  if (!adminAuthError && adminAuthData?.user) {
    userId = adminAuthData.user.id
  } else if (adminAuthError?.message?.toLowerCase().includes('already registered') || adminAuthError?.message?.toLowerCase().includes('already exists')) {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail)
    if (existingUser) {
      userId = existingUser.id
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: 'owner',
        }
      })
    }
  }

  if (!userId) {
    return { error: adminAuthError?.message || 'Failed to create account' }
  }

  // 2. Get or Insert into owners table
  const { data: existingOwner } = await supabaseAdmin.from('owners').select('id, user_id').eq('email', normalizedEmail).maybeSingle()
  let ownerId = existingOwner?.id

  if (!existingOwner) {
    const { data: newOwner, error: dbError } = await supabaseAdmin.from('owners').insert([
      {
        user_id: userId,
        name,
        email: normalizedEmail,
      },
    ]).select('id').single()

    if (dbError) {
      console.error('Failed to create owner record:', dbError)
    } else if (newOwner) {
      ownerId = newOwner.id
    }
  } else {
    // If owner exists but user_id is null (webhook placeholder), link it!
    if (!existingOwner.user_id) {
      const { error: updateError } = await supabaseAdmin
        .from('owners')
        .update({ user_id: userId, name })
        .eq('id', existingOwner.id)
      
      if (updateError) {
        console.error('Failed to link existing owner record:', updateError)
      }
    }
  }

  // Also create a dummy property if propertyName is provided
  if (propertyName && ownerId) {
    // Check if property exists first (for recovering users)
    const { data: existingProp } = await supabaseAdmin.from('properties').select('id').eq('owner_id', ownerId).eq('name', propertyName).maybeSingle()
    if (!existingProp) {
      // Use supabaseAdmin to ensure bypass of RLS on property creation
      await supabaseAdmin.from('properties').insert([
        {
          owner_id: ownerId,
          name: propertyName,
          city: 'Pending',
          type: 'multi-room property',
        }
      ])
    }
  }

  // Sign the user in so their session is active for subsequent steps
  await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  return { 
    success: true, 
    ownerId, 
    userId, 
    email: normalizedEmail 
  }
}

export const registerOwnerAccount = submitOnboarding

