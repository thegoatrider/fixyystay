import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { token, platform = 'android', deviceInfo = {} } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Valid FCM token is required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Upsert the token for this user
    const { error: dbError } = await supabaseAdmin
      .from('user_push_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          platform,
          device_info: deviceInfo,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      )

    if (dbError) {
      console.error('[Notifications] Failed to save push token:', dbError)
      return NextResponse.json({ error: 'Database error saving token' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Push token registered successfully' })
  } catch (err: any) {
    console.error('[Notifications] Register token error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
