'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient, findAuthUserByEmail } from '@/utils/supabase/admin'
import Razorpay from 'razorpay'
import { addMonths, addYears } from 'date-fns'
import { headers } from 'next/headers'
import { Resend } from 'resend'
import { getCityCode } from '@/lib/india-locations'
import { generatePropertyUid } from '@/app/dashboard/owner/actions'

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

export async function createOwnerOrder(
  planName: string, 
  amount: number, 
  email: string, 
  ownerId?: string,
  propertyDetails?: {
    propertyName?: string | null
    city?: string | null
    cityArea?: string | null
    pincode?: string | null
    state?: string | null
    phone?: string | null
    helpdeskNumber?: string | null
  }
) {
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
    const notes: Record<string, string> = {
      plan: planName,
      email: normalizedEmail
    }
    if (ownerId) {
      notes.owner_id = ownerId
    }
    if (propertyDetails?.propertyName) {
      notes.property_name = propertyDetails.propertyName.slice(0, 40)
    }
    if (propertyDetails?.city) {
      notes.city = propertyDetails.city.slice(0, 40)
    }
    if (propertyDetails?.cityArea) {
      notes.city_area = propertyDetails.cityArea.slice(0, 40)
    }
    if (propertyDetails?.pincode) {
      notes.pincode = propertyDetails.pincode.slice(0, 10)
    }
    if (propertyDetails?.state) {
      notes.state = propertyDetails.state.slice(0, 40)
    }
    const phoneToPass = propertyDetails?.phone || propertyDetails?.helpdeskNumber
    if (phoneToPass) {
      notes.phone = phoneToPass.slice(0, 20)
    }

    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency: "INR",
      receipt: `receipt_owner_${Date.now()}`,
      notes
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
  signupData?: { 
    name?: string
    password?: string
    propertyName?: string
    propertyDetails?: {
      propertyName?: string | null
      city?: string | null
      cityArea?: string | null
      pincode?: string | null
      state?: string | null
      phone?: string | null
      helpdeskNumber?: string | null
    }
  }
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
    const ownerIdFromNotes = (order.notes as any)?.owner_id as string | undefined
    
    // 2. Get owner by ID from notes OR email
    let ownerId: string | null = null
    let ownerName = signupData?.name || ''
    
    let { data: owner } = ownerIdFromNotes 
      ? await supabaseAdmin.from('owners').select('id, user_id, name').eq('id', ownerIdFromNotes).maybeSingle()
      : { data: null }

    if (!owner) {
      const { data: ownerByEmail } = await supabaseAdmin
        .from('owners')
        .select('id, user_id, name')
        .eq('email', normalizedEmail)
        .maybeSingle()
      owner = ownerByEmail
    }

    // If owner exists, check if user_id needs linking
    if (owner) {
      ownerId = owner.id
      ownerName = owner.name || ownerName
      if (!owner.user_id) {
        // Auto-link to existing auth user if present
        const match = await findAuthUserByEmail(supabaseAdmin, normalizedEmail)
        if (match) {
          await supabaseAdmin.from('owners').update({ user_id: match.id }).eq('id', owner.id)
        }
      }
    } else {
      // Owner does not exist yet: check if auth user exists first
      let existingUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail)
      let userId = existingUser?.id || null

      if (!userId) {
        // Create user in Supabase auth
        const defaultPassword = signupData?.password || 'fixystays123'
        const displayName = signupData?.name || normalizedEmail.split('@')[0]
        const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            name: displayName,
            role: 'owner',
          },
        })

        if (!adminAuthError && adminAuthData?.user) {
          userId = adminAuthData.user.id
          ownerName = displayName
        } else {
          console.error('Failed to create auth user in verifyAndUpgrade:', adminAuthError)
        }
      }

      // Create owner record tied to the user
      const displayName = ownerName || signupData?.name || normalizedEmail.split('@')[0]
      const { data: newOwner, error: dbError } = await supabaseAdmin.from('owners').insert([
        {
          user_id: userId,
          name: displayName,
          email: normalizedEmail,
        },
      ]).select('id').single()

      if (dbError || !newOwner) {
        console.error('Failed to create owner record:', dbError)
        return { error: 'Failed to create owner profile during payment verification.' }
      }
      ownerId = newOwner.id
      ownerName = displayName
    }

    if (!ownerId) {
      return { error: 'Could not associate payment with an owner account.' }
    }

    // Ensure initial property is created for this owner upon verified payment
    const { data: existingProperties } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('owner_id', ownerId)
      .limit(1)

    const orderNotes = (order.notes || {}) as Record<string, any>
    const phone = orderNotes.phone || signupData?.propertyDetails?.phone || signupData?.propertyDetails?.helpdeskNumber || null

    if (phone && ownerId) {
      await supabaseAdmin.from('owners').update({ phone }).eq('id', ownerId)
    }

    if (existingProperties && existingProperties.length > 0) {
      if (phone) {
        await supabaseAdmin.from('properties').update({ helpdesk_number: phone }).eq('id', existingProperties[0].id)
      }
    } else {
      const propName = 
        orderNotes.property_name || 
        signupData?.propertyName || 
        signupData?.propertyDetails?.propertyName || 
        `${ownerName || 'Partner'}'s Property`
      const finalCity = orderNotes.city || signupData?.propertyDetails?.city || 'Raigad'
      const finalArea = orderNotes.city_area || signupData?.propertyDetails?.cityArea || null
      const pincode = orderNotes.pincode || signupData?.propertyDetails?.pincode || null
      const state = orderNotes.state || signupData?.propertyDetails?.state || null

      const uid = await generatePropertyUid(supabaseAdmin, finalCity)

      const { data: newProp } = await supabaseAdmin.from('properties').insert([
        {
          owner_id: ownerId,
          name: propName,
          city: finalCity,
          city_area: finalArea,
          area_name: finalArea,
          pincode: pincode || null,
          state: state || null,
          type: 'multi-room property',
          uid,
          helpdesk_number: phone,
          approved: false,
        }
      ]).select('id').single()

      if (newProp?.id) {
        try {
          await supabaseAdmin.from('rooms').insert([
            {
              property_id: newProp.id,
              name: 'Standard Room',
              category: 'Standard',
              base_price: 2500,
              price_bucket: '₹2,500 - ₹5,000',
            }
          ])
        } catch (_) {}
      }
    }

    // Auto-sign in if password was provided and in browser context
    if (signupData?.password) {
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: signupData.password,
      }).catch(() => {})
    }

    // Send welcome email via Resend
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && apiKey !== 're_xxxxxxxxx') {
      const resend = new Resend(apiKey)
      try {
        await resend.emails.send({
          from: 'FixStay Onboarding <onboarding@resend.dev>',
          to: normalizedEmail,
          subject: 'Welcome to FixyStays! Your Owner Account is Activated',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h1 style="color: #4F46E5;">Welcome to FixyStays, ${ownerName || 'Partner'}!</h1>
              <p>Your subscription is active and your property owner dashboard is now fully unlocked.</p>
              <p>Here is what you need to know:</p>
              <ul>
                <li><strong>Dashboard Access:</strong> You can log in at any time to manage properties, bookings, and view earnings.</li>
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
    
    // 3. Calculate Expiry (with bulletproof early renewal preservation)
    const { data: existingSub } = await supabaseAdmin
      .from('owner_subscriptions')
      .select('status, end_date')
      .eq('owner_id', ownerId)
      .maybeSingle()

    let baseDate = new Date()
    if (existingSub && existingSub.status === 'active' && new Date(existingSub.end_date) > new Date()) {
      baseDate = new Date(existingSub.end_date)
    }

    let monthsToAdd = 0
    if (planName.includes('3 Months') || planName.includes('Quarterly')) monthsToAdd = 3
    else if (planName.includes('6 Months')) monthsToAdd = 6
    else if (planName.includes('12 Months') || planName.includes('Yearly')) monthsToAdd = 12
    
    const end_date = monthsToAdd > 0 ? addMonths(baseDate, monthsToAdd).toISOString() : addYears(baseDate, 99).toISOString()

    
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
