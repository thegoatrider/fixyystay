import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()

  try {
    // 1. Fetch the owner ID
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (ownerError || !owner) {
      return NextResponse.json({ error: 'Owner record not found' }, { status: 404 })
    }

    // 2. Delete Google OAuth credentials mapping
    const { error: deleteError } = await supabaseAdmin
      .from('owner_google_tokens')
      .delete()
      .eq('owner_id', owner.id)

    if (deleteError) {
      throw deleteError
    }

    console.log(`[GOOGLE-DISCONNECT] Google Drive successfully unlinked for owner ${owner.id}`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[GOOGLE-DISCONNECT] Error during unlinking:', err)
    return NextResponse.json({ error: err.message || 'Unlinking failed' }, { status: 500 })
  }
}
