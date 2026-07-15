'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { Resend } from 'resend'

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

  // 1. Sign up the user as an owner
  const origin = (await headers()).get('origin')
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name,
        role: 'owner',
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Failed to create account' }
  }

  const userId = authData.user.id

  // 2. Insert into owners table
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

  // Also create a dummy property if propertyName is provided
  if (propertyName) {
    await supabase.from('properties').insert([
      {
        owner_id: userId,
        name: propertyName,
        city: 'Pending',
        type: 'hotel',
      }
    ])
  }

  // 3. Send the Welcome Email via Resend
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey && apiKey !== 're_xxxxxxxxx') {
    const resend = new Resend(apiKey)
    try {
      await resend.emails.send({
        from: 'FixStay Onboarding <onboarding@resend.dev>', // Update with real domain if available
        to: normalizedEmail,
        subject: 'Welcome to FixyStays! Your Owner Account is Ready',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h1 style="color: #4F46E5;">Welcome to FixyStays, ${name}!</h1>
            <p>Your property owner account has been successfully created.</p>
            <p>Here is what you need to know:</p>
            <ul>
              <li><strong>Dashboard Access:</strong> You can log in at any time to view your properties, bookings, and revenue.</li>
              <li><strong>Support:</strong> If you need any help setting up, please contact us.</li>
            </ul>
            <p>Thank you for partnering with us!</p>
            <br />
            <p>Best regards,<br/>The FixyStays Team</p>
          </div>
        `
      })
    } catch (e) {
      console.error('Failed to send welcome email:', e)
    }
  }

  // Also sign the user in so their session is active
  await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  return { success: true }
}
