import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  const email = 'fixytester@gmail.com'
  
  try {
    // 1. Get Owner
    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .select('id, email, created_at')
      .eq('email', email)
      .single()

    if (ownerError || !owner) {
      return NextResponse.json({ error: 'Owner not found', email }, { status: 404 })
    }

    // 2. SHIFT CREATED_AT BACK BY 10 DAYS
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

    const { data: updated, error: updateError } = await supabase
      .from('owners')
      .update({ 
        created_at: tenDaysAgo.toISOString()
      })
      .eq('id', owner.id)
      .select()

    // 3. ALSO ENSURE NO ACTIVE PAID SUBSCRIPTION
    await supabase
      .from('owner_subscriptions')
      .update({ 
        status: 'expired',
        end_date: tenDaysAgo.toISOString()
      })
      .eq('owner_id', owner.id)

    return NextResponse.json({ 
      success: true, 
      oldCreatedAt: owner.created_at,
      newCreatedAt: tenDaysAgo.toISOString(),
      updatedOwner: updated,
      error: updateError
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
