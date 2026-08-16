'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  const next = formData.get('next') as string || '/'

  if (error) {
    redirect(`/login?message=Could not authenticate user&next=${encodeURIComponent(next)}`)
  }

  // Robustness: Verify and sync role metadata on login
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const normalizedEmail = user.email ? user.email.toLowerCase() : ''
    const { data: owner } = await supabase.from('owners').select('id, user_id').eq('email', normalizedEmail).maybeSingle()
    const { data: influencer } = await supabase.from('influencers').select('id, user_id').eq('email', normalizedEmail).maybeSingle()

    if (owner && owner.user_id !== user.id) {
      await supabase.from('owners').update({ user_id: user.id }).eq('id', owner.id)
    }
    if (influencer && influencer.user_id !== user.id) {
      await supabase.from('influencers').update({ user_id: user.id }).eq('id', influencer.id)
    }

    let role = user.user_metadata?.role
    if (!role || (owner && role !== 'owner') || (influencer && role !== 'influencer' && role !== 'owner' && role !== 'agent')) {
      role = owner ? 'owner' : (influencer ? 'influencer' : 'guest')
      await supabase.auth.updateUser({
        data: { role }
      })
    }
    
    // If they are logging in without a 'next' param, redirect them to their dashboard
    if (next === '/') {
      if (role === 'owner') return redirect('/dashboard/owner')
      if (role === 'influencer') return redirect('/dashboard/influencer')
      if (role === 'admin') return redirect('/dashboard/admin')
      if (role === 'autowala' || role === 'agent') return redirect('/dashboard/agent')
      if (role === 'police') return redirect('/dashboard/police')
    }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as string // 'guest' | 'owner' | 'influencer'
  const next = formData.get('next') as string || '/'

  if (!email || !password || !name || !role) {
    redirect(`/signup?message=All fields are required&next=${encodeURIComponent(next)}`)
  }

  const normalizedEmail = email.toLowerCase()

  // Prevent users from signing up as admin
  const allowedRoles = ['guest', 'owner', 'influencer']
  if (!allowedRoles.includes(role)) {
    redirect(`/signup?message=Invalid role specified&next=${encodeURIComponent(next)}`)
  }

  // 1. Sign up user and store role in user_metadata
  const origin = (await headers()).get('origin')
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name,
        role,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (authError || !authData.user) {
    redirect(`/signup?message=${authError?.message || 'Failed to sign up'}&next=${encodeURIComponent(next)}`)
  }

  const userId = authData.user.id

  const supabaseAdmin = createAdminClient()

  // 2. Insert into respective tables based on role
  if (role === 'owner') {
    const { error: dbError } = await supabaseAdmin.from('owners').insert([
      {
        user_id: userId,
        name,
        email: normalizedEmail,
      },
    ])
    if (dbError) {
      console.error('Failed to create owner record:', dbError)
    }
  } else if (role === 'influencer') {
    const { error: dbError } = await supabaseAdmin.from('influencers').insert([
      {
        id: userId,
        user_id: userId,
        name,
        email: normalizedEmail,
      },
    ])
    if (dbError) {
      console.error('Failed to create influencer record:', dbError)
    }
  }

  revalidatePath('/', 'layout')

  // Immediately sign the user in — don't rely on authData.session (unreliable even with email confirm off)
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError) {
    // Account created but auto-login failed — send to login with a helpful message
    redirect(`/login?message=Account created! Please log in.&role=${role}&next=${encodeURIComponent(next)}`)
  }

  revalidatePath('/', 'layout')

  // Redirect to role-specific dashboard
  if (next && next !== '/') {
    redirect(next)
  } else if (role === 'owner') {
    redirect('/dashboard/owner')
  } else if (role === 'influencer') {
    redirect('/dashboard/influencer')
  } else {
    redirect('/')
  }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  const userAgent = (await headers()).get('user-agent') || ''
  const isApp = userAgent.includes('FixyStaysApp')

  const redirectUrl = isApp 
    ? `${origin}/auth/callback?next=/&source=app`
    : `${origin}/auth/callback?next=/`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  })

  if (error) {
    console.error('Google sign in error:', error)
    return redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const origin = (await headers()).get('origin')

  if (!email) {
    redirect('/login?message=Please enter your email to reset password')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/dashboard/owner/profile`,
  })

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  redirect('/login?message=Check your email for a reset link')
}
