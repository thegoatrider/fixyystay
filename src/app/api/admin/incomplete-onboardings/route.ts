import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Fetch auth users map for phone numbers
    let authUsersMap = new Map<string, any>()
    let authUsersByEmail = new Map<string, any>()
    try {
      const res = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      if (res.data?.users) {
        authUsersMap = new Map(res.data.users.map((u: any) => [u.id, u]))
        res.data.users.forEach((u: any) => {
          if (u.email) authUsersByEmail.set(u.email.toLowerCase().trim(), u)
        })
      }
    } catch (e) {
      console.warn('Auth user list notice:', e)
    }

    // 2. Fetch all properties that are not approved or are in draft status
    const { data: properties, error: propErr } = await supabaseAdmin
      .from('properties')
      .select(`
        id,
        name,
        type,
        city,
        state,
        pincode,
        address,
        room_count,
        approval_status,
        approved,
        helpdesk_number,
        created_at,
        owner_id,
        owners (
          id,
          user_id,
          name,
          email,
          phone
        ),
        property_subscriptions (
          id,
          status,
          end_date
        ),
        owner_payments (
          id,
          status,
          amount,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (propErr) {
      return NextResponse.json({ error: propErr.message }, { status: 500 })
    }

    // 3. Filter for those who filled details but have NO active subscription and NO completed/captured payment
    const now = new Date()
    const incompleteList = (properties || []).filter((prop: any) => {
      // If property is already approved, skip
      if (prop.approved === true || prop.approval_status === 'approved') {
        return false
      }

      // Check for active subscription
      const subs = Array.isArray(prop.property_subscriptions)
        ? prop.property_subscriptions
        : prop.property_subscriptions ? [prop.property_subscriptions] : []
      const hasActiveSub = subs.some(
        (s: any) => s.status === 'active' && s.end_date && new Date(s.end_date) > now
      )
      if (hasActiveSub) return false

      // Check for completed payment
      const payments = Array.isArray(prop.owner_payments)
        ? prop.owner_payments
        : prop.owner_payments ? [prop.owner_payments] : []
      const hasPaid = payments.some(
        (p: any) => p.status === 'paid' || p.status === 'captured' || p.status === 'authorized'
      )
      if (hasPaid) return false

      return true
    })

    // 4. Enrich contact info
    const results = incompleteList.map((prop: any) => {
      const owner = Array.isArray(prop.owners) ? prop.owners[0] : prop.owners
      const ownerEmail = (owner?.email || '').toLowerCase().trim()
      const authUser = (owner?.user_id && authUsersMap.get(owner.user_id))
        || (ownerEmail && authUsersByEmail.get(ownerEmail))
        || null

      const phone = prop.helpdesk_number
        || owner?.phone
        || authUser?.phone
        || authUser?.user_metadata?.phone
        || authUser?.raw_user_meta_data?.phone
        || null

      return {
        propertyId: prop.id,
        propertyName: prop.name,
        propertyType: prop.type,
        city: prop.city,
        state: prop.state,
        pincode: prop.pincode,
        address: prop.address,
        roomCount: prop.room_count,
        approvalStatus: prop.approval_status || 'draft',
        ownerName: owner?.name || authUser?.user_metadata?.name || 'Unknown',
        ownerEmail: owner?.email || authUser?.email || null,
        phone: phone,
        cleanPhone: phone ? phone.replace(/\D/g, '') : null,
        createdAt: prop.created_at,
      }
    })

    return NextResponse.json({
      success: true,
      count: results.length,
      leads: results,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
