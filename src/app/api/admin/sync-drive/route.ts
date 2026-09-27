import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { backupCheckinToGoogleDrive } from '@/lib/google-drive'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return handleSync(request)
}

export async function POST(request: NextRequest) {
  return handleSync(request)
}

async function handleSync(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sinceDate = searchParams.get('since') || '2026-08-30'
  const targetOwnerId = searchParams.get('owner_id')
  const secretKey = searchParams.get('secret') || request.headers.get('x-sync-secret')

  const expectedSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET

  // 1. Authorization check: Either valid secret key or authenticated user
  let isAuthorized = false
  if (expectedSecret && secretKey === expectedSecret) {
    isAuthorized = true
  } else {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Authenticated user
        isAuthorized = true
      }
    } catch (e) {}
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()

  try {
    // 2. Fetch owners who have active Google Drive tokens
    let ownersQuery = supabaseAdmin
      .from('owner_google_tokens')
      .select('owner_id, google_email')

    if (targetOwnerId) {
      ownersQuery = ownersQuery.eq('owner_id', targetOwnerId)
    }

    const { data: ownerTokens, error: tokensError } = await ownersQuery

    if (tokensError) {
      return NextResponse.json({ error: 'Database error reading owner tokens', details: tokensError }, { status: 500 })
    }

    if (!ownerTokens || ownerTokens.length === 0) {
      return NextResponse.json({
        message: 'No owners with Google Drive integration found',
        ownersProcessed: 0,
        synced: 0
      })
    }

    const summary: any[] = []
    let totalSynced = 0
    let totalFailed = 0

    // 3. For each connected owner, find check-ins since the given date
    for (const token of ownerTokens) {
      const { data: checkins, error: checkinsError } = await supabaseAdmin
        .from('guest_checkins')
        .select('id, guest_name, uid, created_at')
        .eq('owner_id', token.owner_id)
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: true })

      if (checkinsError) {
        summary.push({
          ownerId: token.owner_id,
          googleEmail: token.google_email,
          error: checkinsError.message
        })
        continue
      }

      const ownerResult = {
        ownerId: token.owner_id,
        googleEmail: token.google_email,
        totalFound: checkins?.length || 0,
        synced: 0,
        failed: 0,
        errors: [] as string[]
      }

      for (const checkin of (checkins || [])) {
        try {
          const res = await backupCheckinToGoogleDrive(checkin.id)
          if (res.success) {
            ownerResult.synced++
            totalSynced++
          } else {
            ownerResult.failed++
            totalFailed++
            ownerResult.errors.push(`${checkin.guest_name} (${checkin.id}): ${res.error || 'Failed'}`)
          }
        } catch (err: any) {
          ownerResult.failed++
          totalFailed++
          ownerResult.errors.push(`${checkin.guest_name} (${checkin.id}): ${err.message}`)
        }
      }

      summary.push(ownerResult)
    }

    return NextResponse.json({
      success: true,
      sinceDate,
      totalSynced,
      totalFailed,
      ownersProcessed: ownerTokens.length,
      details: summary
    })
  } catch (err: any) {
    console.error('[ADMIN-DRIVE-SYNC] Critical error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error during sync' }, { status: 500 })
  }
}
