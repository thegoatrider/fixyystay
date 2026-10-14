import { NextResponse } from 'next/server'
import { purgeUserAndRecordsByEmail } from '@/utils/supabase/admin'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const inspect = searchParams.get('inspect')
    if (inspect) {
      const { createAdminClient } = await import('@/utils/supabase/admin')
      const supabaseAdmin = createAdminClient()
      const { data: prop } = await supabaseAdmin.from('properties').select('*, owners(*)').or(`uid.eq.${inspect},name.ilike.%${inspect}%`).maybeSingle()
      let subs: any = null
      let payments: any = null
      let allUnapproved: any = null
      if (prop?.owner_id) {
        const { data: s } = await supabaseAdmin.from('owner_subscriptions').select('*').eq('owner_id', prop.owner_id)
        const { data: p } = await supabaseAdmin.from('owner_payments').select('*').eq('owner_id', prop.owner_id)
        subs = s
        payments = p
      }
      const { data: unapp } = await supabaseAdmin.from('properties').select('id, uid, name, city, approved, owner_id').eq('approved', false)
      allUnapproved = unapp
      return NextResponse.json({ prop, subs, payments, allUnapproved })
    }

    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email query parameter is required (e.g. ?email=user@example.com)' }, { status: 400 })
    }

    const result = await purgeUserAndRecordsByEmail(email)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Purge API Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = body.email

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required in request body' }, { status: 400 })
    }

    const result = await purgeUserAndRecordsByEmail(email)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Purge API Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 })
  }
}
