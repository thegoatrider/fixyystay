import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { broadcastPushNotification, sendPushNotificationToUser } from '@/utils/fcm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only superadmin or admin role can broadcast notifications
    if (user.email !== 'superadmin@fixstay.com' && user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { title, message, target = 'all', specificUserId, imageUrl, url = '/guest' } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    const payload = {
      title,
      body: message,
      imageUrl,
      data: {
        url,
        sentAt: new Date().toISOString(),
      },
    }

    let result
    if (specificUserId) {
      result = await sendPushNotificationToUser(specificUserId, payload)
    } else {
      result = await broadcastPushNotification(payload, {
        role: target === 'all' ? undefined : target,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Push notification triggered',
      result,
    })
  } catch (err: any) {
    console.error('[Notifications] Send push error:', err)
    return NextResponse.json({ error: err.message || 'Failed to dispatch push' }, { status: 500 })
  }
}
