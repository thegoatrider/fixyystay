'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import Razorpay from 'razorpay'
import { addMonths, addYears } from 'date-fns'

export async function createOwnerOrder(planName: string, amount: number, email: string) {
  try {
    const supabase = await createClient()

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
        email: email
      }
    }

    const order = await razorpay.orders.create(options)

    // 2. Log payment request in DB (Manual Onboarding tracking)
    const { error } = await supabase.from('owner_payments').insert([{
      email,
      plan_name: planName,
      amount,
      razorpay_order_id: order.id,
      status: 'pending'
    }])

    if (error) {
       console.error('Failed to log owner payment request', error)
       // We still return the order so the user can pay
    }

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
    
    // 1. Get payment record
    const { data: payment, error: pError } = await supabaseAdmin
      .from('owner_payments')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .single()
      
    if (pError || !payment) {
      console.error('Payment record not found:', razorpayOrderId, pError)
      return { error: 'Payment record not found.' }
    }
    
    // 2. Get owner by email
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('email', payment.email)
      .single()
      
    if (!owner) {
      console.error('Owner not found for email:', payment.email)
      return { error: 'Owner profile not found for this email.' }
    }
    
    // 3. Calculate Expiry
    let monthsToAdd = 0
    if (payment.plan_name.includes('Monthly')) monthsToAdd = 1
    else if (payment.plan_name.includes('Quarterly')) monthsToAdd = 3
    else if (payment.plan_name.includes('6 Months')) monthsToAdd = 6
    else if (payment.plan_name.includes('Yearly')) monthsToAdd = 12
    
    const end_date = monthsToAdd > 0 ? addMonths(new Date(), monthsToAdd).toISOString() : addYears(new Date(), 99).toISOString()
    
    // 4. Update Payment Status
    await supabaseAdmin
      .from('owner_payments')
      .update({ status: 'completed' })
      .eq('id', payment.id)
      
    // 5. Upsert Subscription
    const { error: subError } = await supabaseAdmin
      .from('owner_subscriptions')
      .upsert({
        owner_id: owner.id,
        plan_name: payment.plan_name,
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
