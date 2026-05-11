import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  const email = 'fixytester@gmail.com'
  
  try {
    // 1. Get Owner
    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .select('id, email')
      .eq('email', email)
      .single()

    if (ownerError || !owner) {
      return NextResponse.json({ error: 'Owner not found', email }, { status: 404 })
    }

    // 2. Get ALL subscriptions for this owner
    const { data: subs, error: subsError } = await supabase
      .from('owner_subscriptions')
      .select('*')
      .eq('owner_id', owner.id)

    // 3. FORCE EXPIRE ALL OF THEM
    const wayPastDate = new Date('2020-01-01').toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('owner_subscriptions')
      .update({ 
        end_date: wayPastDate,
        status: 'expired' 
      })
      .eq('owner_id', owner.id)
      .select()

    return NextResponse.json({ 
      success: true, 
      owner,
      existingSubs: subs,
      updatedTo: updated,
      error: updateError
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
