import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  const email = 'fixytester@gmail.com'
  
  try {
    // 1. Get Owner ID
    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .select('id')
      .eq('email', email)
      .single()

    if (ownerError || !owner) {
      return NextResponse.json({ error: 'Owner not found', details: ownerError }, { status: 404 })
    }

    // 2. Update Subscription to expired (past date)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { error: subError } = await supabase
      .from('owner_subscriptions')
      .update({ 
        end_date: yesterday.toISOString(),
        status: 'expired' 
      })
      .eq('owner_id', owner.id)

    if (subError) {
      return NextResponse.json({ error: 'Failed to expire subscription', details: subError }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully expired 7-day trial for ${email}`,
      ownerId: owner.id,
      newEndDate: yesterday.toISOString()
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
