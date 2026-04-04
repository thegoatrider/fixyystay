'use server'

import { createClient } from '@/utils/supabase/server'
import Razorpay from 'razorpay'

// Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function createOwnerOrder(planName: string, amount: number, email: string) {
  try {
    const supabase = await createClient()

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
