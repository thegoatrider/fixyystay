import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { reconcileOwnerSubscriptions } from '@/lib/reconciliation'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const email = url.searchParams.get('email') || 'the23villa@gmail.com'
  const token = url.searchParams.get('token')

  if (token !== 'fixy-reconcile-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()
  const { data: owner, error: oErr } = await supabaseAdmin
    .from('owners')
    .select('id, name, email, phone, user_id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (oErr || !owner) {
    return NextResponse.json({ error: 'Owner not found', details: oErr }, { status: 404 })
  }

  const result = await reconcileOwnerSubscriptions(owner.id)

  const { data: properties } = await supabaseAdmin
    .from('properties')
    .select('id, name, approval_status, approved, room_count, property_subscriptions(*)')
    .eq('owner_id', owner.id)

  return NextResponse.json({
    success: true,
    owner,
    reconcileResult: result,
    properties,
  })
}
