'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSuperAdminUser } from '@/utils/supabase/auth-roles'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { calculateMonthlyFee } from '@/lib/pricing'

export interface CreatePropertyOrderResult {
  orderId?: string
  amount?: number
  currency?: string
  key?: string
  propertyId?: string
  months?: number
  roomCount?: number
  monthlyFee?: number
  totalAmount?: number
  propertyName?: string
  userEmail?: string
  error?: string
  contactUs?: boolean
}

/**
 * Creates a Razorpay order for a property subscription based on effective room count & DB pricing tiers.
 * Snapshot is persisted into public.owner_payments with status 'created'.
 */
export async function createPropertySubscriptionOrder(
  propertyId: string,
  months: number
): Promise<CreatePropertyOrderResult> {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('[createPropertySubscriptionOrder] Razorpay API keys missing in environment')
      return { error: 'Payment gateway is currently unavailable. Please contact support.' }
    }

    const validMonths = [1, 3, 6, 12]
    if (!validMonths.includes(months)) {
      return { error: 'Invalid subscription duration. Please select 1, 3, 6, or 12 months.' }
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return { error: 'You must be logged in to initiate a subscription payment.' }
    }

    const supabaseAdmin = createAdminClient()

    // 1. Fetch Property and verify ownership
    const { data: property, error: propErr } = await supabaseAdmin
      .from('properties')
      .select('id, owner_id, name, room_count, city, state, pincode')
      .eq('id', propertyId)
      .maybeSingle()

    if (propErr) {
      console.error('[createPropertySubscriptionOrder] Property query error:', propErr)
      return { error: `Database error: ${propErr.message}` }
    }
    if (!property) {
      return { error: 'Property not found.' }
    }

    const { data: owner, error: ownerErr } = await supabaseAdmin
      .from('owners')
      .select('id, user_id, email, name')
      .eq('id', property.owner_id)
      .maybeSingle()

    if (ownerErr) {
      console.error('[createPropertySubscriptionOrder] Owner query error:', ownerErr)
      return { error: `Database error: ${ownerErr.message}` }
    }

    const isAdmin = isSuperAdminUser(user) || user.app_metadata?.role === 'admin'
    if (!isAdmin && owner?.user_id !== user.id) {
      return { error: 'Unauthorized: You do not own this property.' }
    }

    // 2. Compute Effective Room Count: greatest(properties.room_count, count of property_rooms)
    const { count: physicalRoomsCount, error: roomsCountErr } = await supabaseAdmin
      .from('property_rooms')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)

    if (roomsCountErr) {
      console.error('[createPropertySubscriptionOrder] Room count query error:', roomsCountErr)
    }

    const declaredRooms = property.room_count || 0
    const physicalRooms = physicalRoomsCount || 0
    const effectiveRooms = Math.max(declaredRooms, physicalRooms)

    if (effectiveRooms < 1) {
      return {
        error: 'Please declare the number of rentable rooms for this property before renewing.',
      }
    }

    if (effectiveRooms > 100) {
      return {
        error: 'Properties with more than 100 rooms require manual onboarding. Please contact support.',
        contactUs: true,
      }
    }

    // 3. Compute subscription fee based on effective rooms and location
    const feeRes = calculateMonthlyFee({
      roomCount: effectiveRooms,
      city: property.city,
      state: property.state,
      pincode: property.pincode,
    })

    if (feeRes.overLimit || !feeRes.monthlyFee) {
      return {
        error: feeRes.error || 'Properties with more than 100 rooms require manual onboarding. Please contact support.',
        contactUs: true,
      }
    }

    const monthlyFee = feeRes.monthlyFee
    const totalAmount = monthlyFee * months // Prices are INCLUSIVE of GST; server computes amount

    // 4. Create Order in Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const options = {
      amount: Math.round(totalAmount * 100), // Razorpay requires paise
      currency: 'INR',
      receipt: `prop_${propertyId.slice(0, 8)}_${Date.now()}`.slice(0, 40),
      notes: {
        property_id: propertyId,
        owner_id: property.owner_id,
        months: String(months),
        room_count: String(effectiveRooms),
        monthly_fee: String(monthlyFee),
        type: 'property_subscription',
      },
    }

    const order = await razorpay.orders.create(options)

    // 5. Persist snapshot into owner_payments with status 'created'
    const { error: paymentErr } = await supabaseAdmin.from('owner_payments').insert({
      owner_id: property.owner_id,
      property_id: propertyId,
      amount: totalAmount,
      months: months,
      room_count: effectiveRooms,
      monthly_fee: monthlyFee,
      payment_method: 'Razorpay',
      payment_ref: order.id,
      razorpay_order_id: order.id,
      status: 'created',
      plan_duration_months: months,
    })

    if (paymentErr) {
      console.error('[createPropertySubscriptionOrder] Payment snapshot insertion failed:', paymentErr)
      return { error: `Failed to initialize payment record: ${paymentErr.message}` }
    }

    return {
      orderId: order.id,
      amount: order.amount as number,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      propertyId,
      months,
      roomCount: effectiveRooms,
      monthlyFee,
      totalAmount,
      propertyName: property.name,
      userEmail: owner?.email || user.email,
    }
  } catch (err: any) {
    console.error('[createPropertySubscriptionOrder] Unexpected error:', err)
    return { error: err.message || 'Failed to initialize subscription payment' }
  }
}

/**
 * Verifies property payment and executes atomic activation via activate_property_payment SQL function.
 * May ONLY call activate_property_payment; never creates users, owners, properties, or rooms.
 */
export async function verifyPropertyPayment(params: {
  orderId: string
  paymentId?: string
  signature?: string
}) {
  try {
    const { orderId, paymentId, signature } = params
    if (!orderId) {
      return { error: 'Order ID is required' }
    }

    const secret = process.env.RAZORPAY_KEY_SECRET
    if (signature && paymentId && secret) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex')

      if (generatedSignature !== signature) {
        console.error('[verifyPropertyPayment] Signature mismatch:', { orderId, paymentId })
        return { error: 'Invalid payment signature from payment gateway.' }
      }
    }

    const supabaseAdmin = createAdminClient()

    // Call the atomic SECURITY DEFINER DB function
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'activate_property_payment',
      {
        p_order_id: orderId,
        p_payment_id: paymentId || null,
      }
    )

    if (rpcError) {
      console.error('[verifyPropertyPayment] activate_property_payment RPC error:', rpcError)
      return { error: `Payment activation failed: ${rpcError.message}` }
    }

    if (!rpcResult?.success) {
      console.warn('[verifyPropertyPayment] activate_property_payment returned failure:', rpcResult)
      return { error: rpcResult?.error || 'Payment verification could not activate subscription.' }
    }

    return {
      success: true,
      alreadyProcessed: Boolean(rpcResult.already_processed),
      propertyId: rpcResult.property_id,
      newEndDate: rpcResult.new_end_date,
    }
  } catch (err: any) {
    console.error('[verifyPropertyPayment] Exception:', err)
    return { error: err.message || 'Payment verification failed' }
  }
}

/**
 * Checks the database state for a given Razorpay order ID.
 * Used by /onboarding/success to poll for genuine DB activation without trusting browser callbacks.
 */
export async function checkPaymentActivation(orderId: string) {
  try {
    if (!orderId) return { status: 'not_found' }

    const supabaseAdmin = createAdminClient()

    // 1. Fetch payment row
    const { data: payment, error: payErr } = await supabaseAdmin
      .from('owner_payments')
      .select('id, status, property_id, amount, months')
      .eq('razorpay_order_id', orderId)
      .maybeSingle()

    if (payErr) {
      console.error('[checkPaymentActivation] DB error querying payment:', payErr)
      return { status: 'error', message: payErr.message }
    }

    // Fallback: check by payment_ref for legacy orders
    let targetPayment = payment
    if (!targetPayment) {
      const { data: fallback } = await supabaseAdmin
        .from('owner_payments')
        .select('id, status, property_id, amount, months')
        .eq('payment_ref', orderId)
        .maybeSingle()
      targetPayment = fallback
    }

    if (!targetPayment) {
      return { status: 'not_found' }
    }

    if (targetPayment.status === 'failed') {
      return { status: 'failed', propertyId: targetPayment.property_id }
    }

    // 2. Check property subscription status
    if (targetPayment.property_id) {
      const { data: sub, error: subErr } = await supabaseAdmin
        .from('property_subscriptions')
        .select('status, end_date')
        .eq('property_id', targetPayment.property_id)
        .maybeSingle()

      if (!subErr && sub && sub.status === 'active' && new Date(sub.end_date) > new Date()) {
        return {
          status: 'active',
          propertyId: targetPayment.property_id,
          endDate: sub.end_date,
        }
      }
    }

    // If payment row marked paid but sub not yet populated
    if (targetPayment.status === 'paid') {
      return { status: 'paid_activating', propertyId: targetPayment.property_id }
    }

    return { status: 'pending', propertyId: targetPayment.property_id }
  } catch (err: any) {
    console.error('[checkPaymentActivation] Exception:', err)
    return { status: 'error', message: err.message }
  }
}

/**
 * Deprecated backward-compatible bridge for existing onboarding flow until Phase 3 rewrite.
 * Strictly calls activate_property_payment; never creates users, owners, properties, or rooms.
 */
export async function verifyAndUpgrade(orderId: string, _legacyData?: any) {
  return verifyPropertyPayment({ orderId })
}

/**
 * Deprecated backward-compatible bridge for existing onboarding form until Phase 3 rewrite.
 */
export async function createOwnerOrder(
  planName: string,
  amount: number,
  email: string,
  ownerId?: string,
  propertyDetails?: any
) {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return { error: 'Payment gateway unavailable' }
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const propId = propertyDetails?.propertyId || null
    let months = 1
    if (planName.includes('3 Month')) months = 3
    else if (planName.includes('6 Month')) months = 6
    else if (planName.includes('12 Month')) months = 12

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `onboard_${Date.now()}`.slice(0, 40),
      notes: {
        plan: planName,
        email: email.toLowerCase(),
        owner_id: ownerId || '',
        property_id: propId || '',
        months: String(months),
      },
    }

    const order = await razorpay.orders.create(options)

    if (ownerId) {
      const supabaseAdmin = createAdminClient()
      await supabaseAdmin.from('owner_payments').insert({
        owner_id: ownerId,
        property_id: propId,
        amount: amount,
        months: months,
        payment_method: 'Razorpay',
        payment_ref: order.id,
        razorpay_order_id: order.id,
        status: 'created',
        plan_duration_months: months,
      })
    }

    return {
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID,
    }
  } catch (err: any) {
    console.error('[createOwnerOrder] Deprecated fallback error:', err)
    return { error: err.message || 'Failed to create order' }
  }
}
