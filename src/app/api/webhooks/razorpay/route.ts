import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import { activateBulkPropertyPayment } from '@/app/pricing/business/actions'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!secret || !signature) {
      console.warn('[RazorpayWebhook] Missing secret or signature header')
      return NextResponse.json({ error: 'Webhook secret or signature missing' }, { status: 400 })
    }

    // 1. Verify Raw Body HMAC Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.error('[RazorpayWebhook] Invalid Webhook Signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)
    const supabaseAdmin = createAdminClient()

    const eventType = event.event
    console.log('[RazorpayWebhook] Processing event:', eventType)

    // Extract Order & Payment identifiers
    const orderId: string | undefined =
      event.payload?.order?.entity?.id ||
      event.payload?.payment?.entity?.order_id
    const paymentId: string | undefined = event.payload?.payment?.entity?.id

    if (!orderId) {
      console.warn('[RazorpayWebhook] Event missing order ID, ignoring:', eventType)
      return NextResponse.json({ received: true, ignored: true })
    }

    // -------------------------------------------------------------------------
    // CASE A: Guest Booking Flow
    // -------------------------------------------------------------------------
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from('bookings')
      .select('id, payment_status')
      .eq('razorpay_order_id', orderId)
      .maybeSingle()

    if (bookingErr) {
      console.error('[RazorpayWebhook] Error querying bookings:', bookingErr)
    }

    if (booking) {
      if (eventType === 'order.paid' || eventType === 'payment.captured') {
        if (booking.payment_status !== 'paid') {
          await supabaseAdmin
            .from('bookings')
            .update({
              payment_status: 'paid',
              razorpay_payment_id: paymentId || null,
            })
            .eq('id', booking.id)

          console.log(`[RazorpayWebhook] Booking ${booking.id} confirmed via ${eventType}`)
        }
        return NextResponse.json({ received: true, booking_id: booking.id })
      }

      if (eventType === 'payment.failed') {
        if (booking.payment_status === 'pending') {
          await supabaseAdmin
            .from('bookings')
            .update({ payment_status: 'failed' })
            .eq('id', booking.id)
          console.log(`[RazorpayWebhook] Booking ${booking.id} marked failed`)
        }
        return NextResponse.json({ received: true, booking_id: booking.id, failed: true })
      }
    }

    // -------------------------------------------------------------------------
    // CASE B: Property Subscription Payment Flow
    // -------------------------------------------------------------------------
    const { data: ownerPayment, error: payLookupErr } = await supabaseAdmin
      .from('owner_payments')
      .select('id, status, property_id, razorpay_order_id')
      .eq('razorpay_order_id', orderId)
      .maybeSingle()

    if (payLookupErr) {
      console.error('[RazorpayWebhook] Error querying owner_payments:', payLookupErr)
    }

    // Also check payment_ref for legacy orders
    let targetPayment = ownerPayment
    if (!targetPayment) {
      const { data: fallback } = await supabaseAdmin
        .from('owner_payments')
        .select('id, status, property_id, razorpay_order_id')
        .eq('payment_ref', orderId)
        .maybeSingle()
      targetPayment = fallback
    }

    if (targetPayment) {
      // 1. Success events: order.paid or payment.captured
      if (eventType === 'order.paid' || eventType === 'payment.captured') {
        // Idempotency: if already paid, return 200 fast
        if (targetPayment.status === 'paid') {
          console.log(`[RazorpayWebhook] Order ${orderId} already paid; skipping.`)
          return NextResponse.json({ received: true, already_processed: true })
        }

        const notes =
          event.payload?.order?.entity?.notes ||
          event.payload?.payment?.entity?.notes ||
          {}
        const isBulk = notes?.type === 'bulk_property_subscription'

        if (isBulk) {
          const bulkRes = await activateBulkPropertyPayment(orderId, paymentId)
          if (bulkRes.error) {
            console.error('[RazorpayWebhook] Bulk activation error:', bulkRes.error)
            return NextResponse.json({ error: bulkRes.error }, { status: 500 })
          }
          console.log(`[RazorpayWebhook] Bulk order ${orderId} activated for ${bulkRes.count} properties`)
          return NextResponse.json({ received: true, activated: true, bulk: true, result: bulkRes })
        }

        // Atomic activation via DB function for single property
        const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc(
          'activate_property_payment',
          {
            p_order_id: orderId,
            p_payment_id: paymentId || null,
          }
        )

        if (rpcErr) {
          console.error('[RazorpayWebhook] Error in activate_property_payment:', rpcErr)
          return NextResponse.json({ error: rpcErr.message }, { status: 500 })
        }

        console.log(`[RazorpayWebhook] Order ${orderId} successfully activated:`, rpcRes)
        return NextResponse.json({ received: true, activated: true, result: rpcRes })
      }

      // 2. Failure event: payment.failed
      if (eventType === 'payment.failed') {
        if (targetPayment.status === 'created' || targetPayment.status === 'pending') {
          const { error: failErr } = await supabaseAdmin
            .from('owner_payments')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', targetPayment.id)

          if (failErr) {
            console.error('[RazorpayWebhook] Failed to mark payment as failed:', failErr)
          } else {
            console.log(`[RazorpayWebhook] Order ${orderId} marked as failed.`)
          }
        }
        return NextResponse.json({ received: true, failed_recorded: true })
      }
    }

    // -------------------------------------------------------------------------
    // UNRECOGNIZED ORDER
    // -------------------------------------------------------------------------
    console.warn('[RazorpayWebhook] Unknown order ID received:', orderId, 'event:', eventType)
    // Return 200 so Razorpay does not retry unrecognized/external orders indefinitely
    return NextResponse.json({ received: true, warning: 'Unknown order ignored' })
  } catch (err: any) {
    console.error('[RazorpayWebhook] Unhandled error:', err)
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 })
  }
}
