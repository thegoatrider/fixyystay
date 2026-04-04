import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!secret || !signature) {
      return NextResponse.json({ error: 'Webhook secret or signature missing' }, { status: 400 })
    }

    // 1. Verify Webhook Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.error('Invalid Razorpay Webhook Signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)
    const supabaseAdmin = createAdminClient()

    console.log('Razorpay Webhook Event:', event.event)

    // 2. Handle Order Paid Event
    if (event.event === 'order.paid') {
      const { id: orderId, notes } = event.payload.order.entity

      // Case A: Guest Booking
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('razorpay_order_id', orderId)
        .maybeSingle()

      if (booking && booking.payment_status !== 'paid') {
        await supabaseAdmin
          .from('bookings')
          .update({ payment_status: 'paid', razorpay_payment_id: event.payload.payment.entity.id })
          .eq('id', booking.id)
        
        // Trigger post-booking logic if not already done by client
        // (Notifications, Wallet splits, Leads are ideally handled in confirmBooking but we can re-run or use DB triggers)
        console.log(`Booking ${booking.id} confirmed via Webhook`)
      }

      // Case B: Owner Standalone Payment
      const { data: ownerPay } = await supabaseAdmin
        .from('owner_payments')
        .select('*')
        .eq('razorpay_order_id', orderId)
        .maybeSingle()

      if (ownerPay && ownerPay.status !== 'paid') {
        await supabaseAdmin
          .from('owner_payments')
          .update({ status: 'paid', razorpay_payment_id: event.payload.payment.entity.id })
          .eq('id', ownerPay.id)
        
        console.log(`Owner payment for ${ownerPay.email} confirmed via Webhook`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
