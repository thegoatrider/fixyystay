import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getActiveAccessToken } from '@/lib/google-drive'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()

  try {
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!owner) {
      return NextResponse.json({ error: 'Owner record not found' }, { status: 404 })
    }

    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('owner_google_tokens')
      .select('*')
      .eq('owner_id', owner.id)
      .maybeSingle()

    if (tokenError) {
      return NextResponse.json({ error: 'Database error reading tokens', details: tokenError }, { status: 500 })
    }

    if (!tokenRecord) {
      return NextResponse.json({ error: 'No owner_google_tokens record found in DB for this owner.' })
    }

    const now = new Date()
    const expiry = new Date(tokenRecord.expiry_date)
    const needsRefresh = now.getTime() >= expiry.getTime() - 5 * 60 * 1000

    const maskedAccessToken = tokenRecord.access_token 
      ? `${tokenRecord.access_token.substring(0, 10)}... (length: ${tokenRecord.access_token.length})` 
      : 'null'

    const maskedRefreshToken = tokenRecord.refresh_token 
      ? `${tokenRecord.refresh_token.substring(0, 10)}... (length: ${tokenRecord.refresh_token.length})` 
      : 'null'

    // Let's attempt the getActiveAccessToken call to see if it succeeds or returns null
    const activeTokenResult = await getActiveAccessToken(owner.id)

    return NextResponse.json({
      serverTime: now.toISOString(),
      tokenExpiryDate: tokenRecord.expiry_date,
      tokenExpiryParsed: expiry.toISOString(),
      diffMs: expiry.getTime() - now.getTime(),
      needsRefresh,
      hasRefreshToken: !!tokenRecord.refresh_token,
      googleEmail: tokenRecord.google_email,
      maskedAccessToken,
      maskedRefreshToken,
      activeTokenResult: activeTokenResult 
        ? `${activeTokenResult.substring(0, 10)}... (length: ${activeTokenResult.length})`
        : 'null'
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
