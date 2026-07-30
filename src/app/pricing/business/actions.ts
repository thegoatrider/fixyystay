'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import Razorpay from 'razorpay'
import { addMonths, addYears } from 'date-fns'
import { headers } from 'next/headers'
import { Resend } from 'resend'

export async function createOwnerOrder(planName: string, amount: number, email: string) {
  try {
    const normalizedEmail = email.toLowerCase()

    // 0. Verify Keys
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay keys are missing in environment variables.')
      return { error: 'Payment system is currently unavailable. Please contact support.' }
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    // 1. Create Razorpay Order
    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency: "INR",
      receipt: `receipt_owner_${Date.now()}`,
      notes: {
        plan: planName,
        email: normalizedEmail
      }
    }

    const order = await razorpay.orders.create(options)

    return { 
      orderId: order.id, 
      amount: order.amount, 
      key: process.env.RAZORPAY_KEY_ID 
    }

  } catch (err: any) {
    console.error('Razorpay Error:', err)
    return { error: err.message || 'Failed to create payment order' }
  }
}

export async function verifyAndUpgrade(
  razorpayOrderId: string,
  signupData?: { name: string; password?: string; propertyName?: string }
) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return { error: 'Payment system keys missing.' }
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    
    // 1. Fetch Order from Razorpay (Source of Truth)
    const order = await razorpay.orders.fetch(razorpayOrderId)
    if (!order) {
       return { error: 'Razorpay order not found.' }
    }
    
    const planName = (order.notes as any)?.plan as string
    const email = (order.notes as any)?.email as string
    const amount = (order.amount as number) / 100
    
    if (!planName || !email) {
       return { error: 'Order notes missing plan or email.' }
    }
    
    const normalizedEmail = email.toLowerCase()
    
    // 2. Get owner by email OR create if missing
    let ownerId: string | null = null
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()
      
    if (!owner) {
      // If we don't have signupData, fallback to default placeholder
      if (signupData && signupData.name && signupData.password) {
        console.log('Owner not found for email:', normalizedEmail, 'Performing auth signup and owner/property registration.')
        const origin = (await headers()).get('origin')
        
        // A. Sign up the user in Supabase auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: signupData.password,
          options: {
            data: {
              name: signupData.name,
              role: 'owner',
            },
            emailRedirectTo: `${origin}/auth/callback`,
          },
        })

        if (authError || !authData?.user) {
          console.error('Failed to create auth user:', authError)
          return { error: authError?.message || 'Failed to create account' }
        }

        const userId = authData.user.id

        // B. Insert into owners table
        const { data: newOwner, error: dbError } = await supabaseAdmin.from('owners').insert([
          {
            user_id: userId,
            name: signupData.name,
            email: normalizedEmail,
          },
        ]).select('id').single()

        if (dbError || !newOwner) {
          console.error('Failed to create owner record:', dbError)
          return { error: 'Failed to create owner profile during payment verification.' }
        }
        ownerId = newOwner.id

        // C. Create dummy property if propertyName is provided
        if (signupData.propertyName && ownerId) {
          const { error: propError } = await supabaseAdmin.from('properties').insert([
            {
              owner_id: ownerId,
              name: signupData.propertyName,
              city: 'Pending',
              type: 'multi-room property',
            }
          ])
          if (propError) {
            console.error('Failed to create onboarding property:', propError)
          }
        }

        // D. Send welcome email via Resend
        const apiKey = process.env.RESEND_API_KEY
        if (apiKey && apiKey !== 're_xxxxxxxxx') {
          const resend = new Resend(apiKey)
          try {
            await resend.emails.send({
              from: 'FixStay Onboarding <onboarding@resend.dev>',
              to: normalizedEmail,
              subject: 'Welcome to FixyStays! Your Owner Account is Ready',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h1 style="color: #4F46E5;">Welcome to FixyStays, ${signupData.name}!</h1>
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

        // E. Sign the user in so their session is active
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: signupData.password,
        })

      } else {
        console.log('Owner not found for email:', normalizedEmail, 'Creating default placeholder owner record.')
        const { data: newOwner, error: createError } = await supabaseAdmin
          .from('owners')
          .insert({
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0],
            phone_number: ''
          })
          .select('id')
          .single()
          
        if (createError || !newOwner) {
          console.error('Failed to create placeholder owner:', createError)
          return { error: 'Failed to create owner profile during payment verification.' }
        }
        ownerId = newOwner.id
      }
    } else {
      ownerId = owner.id
    }
    
    // 3. Calculate Expiry
    let monthsToAdd = 0
    if (planName.includes('3 Months') || planName.includes('Quarterly')) monthsToAdd = 3
    else if (planName.includes('6 Months')) monthsToAdd = 6
    else if (planName.includes('12 Months') || planName.includes('Yearly')) monthsToAdd = 12
    
    const end_date = monthsToAdd > 0 ? addMonths(new Date(), monthsToAdd).toISOString() : addYears(new Date(), 99).toISOString()
    
    // 4. Log Payment in DB (Matching exact production schema)
    const { data: existingPayment } = await supabaseAdmin
      .from('owner_payments')
      .select('id')
      .eq('payment_ref', razorpayOrderId)
      .maybeSingle()
      
    if (!existingPayment) {
       await supabaseAdmin.from('owner_payments').insert({
         owner_id: ownerId,
         amount: amount,
         payment_method: 'Razorpay',
         payment_ref: razorpayOrderId,
         plan_duration_months: monthsToAdd || 1
       })
    }
      
    // 5. Upsert Subscription
    const { error: subError } = await supabaseAdmin
      .from('owner_subscriptions')
      .upsert({
        owner_id: ownerId,
        plan_name: planName,
        status: 'active',
        end_date: end_date,
        start_date: new Date().toISOString()
      }, { onConflict: 'owner_id' })
      
    if (subError) {
      console.error('Subscription update failed:', subError)
      return { error: `Failed to update subscription: ${subError.message}` }
    }
    
    return { success: true }
  } catch (err: any) {
    console.error('Verify upgrade error:', err)
    return { error: err.message || 'Verification failed' }
  }
}
