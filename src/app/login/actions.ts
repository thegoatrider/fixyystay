'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?message=Could not authenticate user')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as string // 'guest' | 'owner' | 'influencer'

  if (!email || !password || !name || !role) {
    redirect('/signup?message=All fields are required')
  }

  // Prevent users from signing up as admin
  const allowedRoles = ['guest', 'owner', 'influencer']
  if (!allowedRoles.includes(role)) {
    redirect('/signup?message=Invalid role specified')
  }

  // 1. Sign up user and store role in user_metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
      },
    },
  })

  if (authError || !authData.user) {
    redirect(`/signup?message=${authError?.message || 'Failed to sign up'}`)
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
  
  // Usually, it requires email confirmation, but we will redirect to / (or specific dashboards)
  // If email confirm is on, authData.session is null.
  if (!authData.session) {
    redirect('/login?message=Check your email to continue sign in process')
  } else {
    redirect('/')
  }
}
