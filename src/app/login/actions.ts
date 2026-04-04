'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

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

  // Prevent users from signing up as admin
  const allowedRoles = ['guest', 'owner', 'influencer']
  if (!allowedRoles.includes(role)) {
    redirect(`/signup?message=Invalid role specified&next=${encodeURIComponent(next)}`)
  }

  // 1. Sign up user and store role in user_metadata
  const origin = (await headers()).get('origin')
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
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

  // 2. Insert into respective tables based on role
  if (role === 'owner') {
    const { error: dbError } = await supabase.from('owners').insert([
      {
        user_id: userId,
        name,
        email,
      },
    ])
    if (dbError) {
      console.error('Failed to create owner record:', dbError)
    }
  } else if (role === 'influencer') {
    // Note: If influencers table has user_id, it will be added, otherwise we just map by email
    // I will try to supply id as the userId if the schema allows, or just insert name/email
    const { error: dbError } = await supabase.from('influencers').insert([
      {
        id: userId, // Assuming id matches user_id for influencers
        name,
        email,
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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/`,
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
