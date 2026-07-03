import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getActiveAccessToken, refreshAccessToken } from '@/lib/google-drive'
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

    // Replicate getActiveAccessToken step-by-step
    let refreshAttemptStatus = "skipped"
    let refreshAttemptError: any = null
    let refreshResultObject: any = null
    let dbUpdateStatus = "skipped"
    let dbUpdateError: any = null

    if (needsRefresh) {
      refreshAttemptStatus = "started"
      try {
        const refreshResult = await refreshAccessToken(tokenRecord.refresh_token)
        refreshAttemptStatus = "success"
        refreshResultObject = {
          expires_in: refreshResult.expires_in,
          has_access_token: !!refreshResult.access_token,
          token_length: refreshResult.access_token?.length || 0
        }

        dbUpdateStatus = "started"
        const newExpiryDate = new Date(now.getTime() + (refreshResult.expires_in || 3600) * 1000)
        const { error: updateError } = await supabaseAdmin
          .from('owner_google_tokens')
          .update({
            access_token: refreshResult.access_token,
            expiry_date: newExpiryDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('owner_id', owner.id)

        if (updateError) {
          dbUpdateStatus = "failed"
          dbUpdateError = updateError
        } else {
          dbUpdateStatus = "success"
        }
      } catch (err: any) {
        refreshAttemptStatus = "failed"
        refreshAttemptError = err.message || String(err)
      }
    }

    // Call actual production helper to see final output
    const productionHelperToken = await getActiveAccessToken(owner.id)

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
      diagnostics: {
        refreshAttemptStatus,
        refreshAttemptError,
        refreshResultObject,
        dbUpdateStatus,
        dbUpdateError
      },
      productionHelperToken: productionHelperToken
        ? `${productionHelperToken.substring(0, 10)}... (length: ${productionHelperToken.length})`
        : 'null'
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
