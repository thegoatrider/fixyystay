import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSuperAdminUser } from '@/utils/supabase/auth-roles'
import { reconcileOwnerSubscriptions } from '@/lib/reconciliation'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = isSuperAdminUser(user) || user?.app_metadata?.role === 'admin'

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
  }

  const url = new URL(req.url)
  const email = url.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Missing email query parameter' }, { status: 400 })
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
