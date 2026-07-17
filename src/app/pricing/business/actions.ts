'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import Razorpay from 'razorpay'
import { addMonths, addYears } from 'date-fns'

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

export async function verifyAndUpgrade(razorpayOrderId: string) {
  try {
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
      .single()
      
    if (!owner) {
      console.log('Owner not found for email:', normalizedEmail, 'Creating placeholder owner record.')
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
