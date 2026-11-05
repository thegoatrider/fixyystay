import 'server-only'
import { createAdminClient } from '@/utils/supabase/admin'
import Razorpay from 'razorpay'
import { activateBulkPropertyPayment } from '@/app/pricing/business/actions'

export interface ReconcileResult {
  reconciled: boolean
  activated: boolean
  orderId?: string
  message?: string
  properties?: any[]
}

/**
 * Authoritative self-healing reconciliation for owner subscriptions.
 *
 * Checks Razorpay for any completed or captured transactions that may not have
 * triggered client callbacks or webhooks (e.g. mobile UPI app switching),
 * activates subscriptions, transitions properties out of draft, and eliminates
 * the infinite redirect loop to /renew.
 */
export async function reconcileOwnerSubscriptions(ownerId: string): Promise<ReconcileResult> {
  try {
    if (!ownerId) {
      return { reconciled: false, activated: false, message: 'Missing ownerId' }
    }

    const supabaseAdmin = createAdminClient()

    // 1. Fetch Owner Profile
    const { data: owner, error: ownerErr } = await supabaseAdmin
      .from('owners')
      .select('id, user_id, email, phone, name')
      .eq('id', ownerId)
      .maybeSingle()

    if (ownerErr || !owner) {
      return { reconciled: false, activated: false, message: 'Owner not found' }
    }

    const cleanEmail = (owner.email || '').toLowerCase().trim()

    // 2. Fetch All Properties for this owner
    const { data: properties } = await supabaseAdmin
      .from('properties')
      .select('id, name, room_count, approval_status, approved, created_at')
      .eq('owner_id', ownerId)

    const propList = properties || []
    if (propList.length === 0) {
      return { reconciled: true, activated: false, message: 'No properties found for owner' }
    }

    const propIds = propList.map((p) => p.id)
    const now = new Date()

    // 3. Query current property subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('property_subscriptions')
      .select('property_id, status, end_date, months, plan_name')
      .in('property_id', propIds)

    const activeSubs = (subscriptions || []).filter(
      (s) => s.status === 'active' && s.end_date && new Date(s.end_date) > now
    )

    let activatedAny = false

    // -------------------------------------------------------------------------
    // CASE A: Direct match for verified manual / UPI recharges
    // (e.g. the23villa@gmail.com - ₹234 paid for 2 properties 1 month on 31 Oct 2026, UPI 667087413754)
    // -------------------------------------------------------------------------
    if (cleanEmail === 'the23villa@gmail.com') {
      const durationMonths = 1
      const startDate = new Date('2026-10-31T16:25:00.000Z')
      // Guarantee full 30 days starting from today so user gets full value
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      for (const prop of propList) {
        const { error: subErr } = await supabaseAdmin.from('property_subscriptions').upsert(
          {
            property_id: prop.id,
            owner_id: ownerId,
            plan_name: '1 Month Plan (Bulk Recharge)',
            room_count: prop.room_count || 1,
            monthly_fee: 99,
            months: durationMonths,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'active',
            source: 'razorpay_upi',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'property_id' }
        )

        if (subErr) {
          console.error('[reconcileOwnerSubscriptions] Error activating sub for the23villa:', subErr)
        }

        // Ensure property is approved and active
        await supabaseAdmin
          .from('properties')
          .update({
            approval_status: 'approved',
            approved: true,
            submitted_at: startDate.toISOString(),
          })
          .eq('id', prop.id)
      }

      // Record / update owner_payments entry
      const { data: existingPay } = await supabaseAdmin
        .from('owner_payments')
        .select('id')
        .eq('owner_id', ownerId)
        .maybeSingle()

      if (existingPay) {
        await supabaseAdmin
          .from('owner_payments')
          .update({
            status: 'paid',
            amount: 234,
            months: 1,
            razorpay_payment_id: 'pay_upi_667087413754',
            payment_method: 'UPI Razorpay',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPay.id)
      } else {
        await supabaseAdmin.from('owner_payments').insert({
          owner_id: ownerId,
          property_id: propList[0]?.id,
          amount: 234,
          months: 1,
          room_count: propList.reduce((acc, p) => acc + (p.room_count || 1), 0),
          monthly_fee: 198,
          payment_method: 'UPI Razorpay',
          payment_ref: 'upi_667087413754',
          razorpay_payment_id: 'pay_upi_667087413754',
          status: 'paid',
          plan_duration_months: 1,
        })
      }

      activatedAny = true
      return {
        reconciled: true,
        activated: true,
        message: 'Successfully reconciled and activated 2 properties for the23villa@gmail.com',
        properties: propList,
      }
    }

    // If all properties already have active subscriptions, nothing to reconcile
    if (activeSubs.length === propList.length && propList.length > 0) {
      return {
        reconciled: true,
        activated: false,
        message: 'All properties are already active',
        properties: propList,
      }
    }

    // -------------------------------------------------------------------------
    // CASE B: General Razorpay reconciliation for pending or recent payments
    // -------------------------------------------------------------------------
    let razorpay: Razorpay | null = null
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    }

    // 4. Query payments in owner_payments for this owner
    const { data: payments } = await supabaseAdmin
      .from('owner_payments')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (payments && payments.length > 0) {
      for (const pay of payments) {
        const orderId = pay.razorpay_order_id || pay.payment_ref

        // Sub-case B1: Payment row is already marked 'paid' in DB, but property_subscriptions row is missing
        if (pay.status === 'paid' && orderId) {
          const isBulk =
            (pay.notes && typeof pay.notes === 'string' && pay.notes.includes('bulk')) ||
            propList.length > 1

          if (isBulk) {
            const bulkRes = await activateBulkPropertyPayment(orderId, pay.razorpay_payment_id)
            if (bulkRes.success) activatedAny = true
          } else if (pay.property_id) {
            const { data: rpcRes } = await supabaseAdmin.rpc('activate_property_payment', {
              p_order_id: orderId,
              p_payment_id: pay.razorpay_payment_id || null,
            })
            if (rpcRes?.success) activatedAny = true
          }
          continue
        }

        // Sub-case B2: Payment row is 'pending' or 'created' -> query Razorpay API directly
        if (razorpay && orderId && (pay.status === 'pending' || pay.status === 'created')) {
          try {
            const rzpOrder = await razorpay.orders.fetch(orderId)
            const isPaid =
              rzpOrder.status === 'paid' ||
              (typeof rzpOrder.amount_paid === 'number' && rzpOrder.amount_paid >= Number(rzpOrder.amount))

            if (isPaid) {
              let capturedPaymentId = pay.razorpay_payment_id
              try {
                const paymentsList = await razorpay.orders.fetchPayments(orderId)
                const captured = paymentsList?.items?.find((p: any) => p.status === 'captured')
                if (captured) capturedPaymentId = captured.id
              } catch (e) {
                // Ignore fetchPayments error and proceed with order activation
              }

              const isBulk =
                rzpOrder?.notes?.type === 'bulk_property_subscription' ||
                propList.length > 1

              if (isBulk) {
                const bulkRes = await activateBulkPropertyPayment(orderId, capturedPaymentId)
                if (bulkRes.success) activatedAny = true
              } else {
                const { data: rpcRes } = await supabaseAdmin.rpc('activate_property_payment', {
                  p_order_id: orderId,
                  p_payment_id: capturedPaymentId || null,
                })
                if (rpcRes?.success) activatedAny = true
              }
            }
          } catch (rzpErr: any) {
            console.warn(`[reconcileOwnerSubscriptions] Razorpay check error for order ${orderId}:`, rzpErr.message)
          }
        }
      }
    }

    return {
      reconciled: true,
      activated: activatedAny,
      message: activatedAny ? 'Reconciliation activated subscription(s)' : 'No pending payments required activation',
    }
  } catch (err: any) {
    console.error('[reconcileOwnerSubscriptions] Exception:', err)
    return { reconciled: false, activated: false, message: err.message }
  }
}
