import { createAdminClient } from '@/utils/supabase/admin'
import { getApps, initializeApp, cert, App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

export interface PushPayload {
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, string>
}

let firebaseApp: App | null = null

function getFirebaseApp(): App | null {
  if (firebaseApp) return firebaseApp

  const existingApps = getApps()
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0]
    return firebaseApp
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson)
        firebaseApp = initializeApp({
          credential: cert(parsed),
        })
        return firebaseApp
      } catch (e) {
        console.error('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e)
      }
    }

    console.warn('[FCM] Firebase Admin credentials missing. Push notifications will be logged/mocked.')
    return null
  }

  // Handle escaped newlines in private key
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  try {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
    return firebaseApp
  } catch (err) {
    console.error('[FCM] Error initializing Firebase Admin:', err)
    return null
  }
}

/**
 * Send push notification to specific FCM device tokens
 */
export async function sendPushNotificationToTokens(tokens: string[], payload: PushPayload) {
  if (!tokens || tokens.length === 0) {
    return { success: false, count: 0, error: 'No tokens provided' }
  }

  const app = getFirebaseApp()
  if (!app) {
    console.log(`[FCM Mock] Push to ${tokens.length} devices: "${payload.title}" - "${payload.body}"`)
    return { success: true, count: tokens.length, mocked: true }
  }

  try {
    const messaging = getMessaging(app)

    const message = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
      },
      data: payload.data || {},
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'fixystays_channel',
          priority: 'max' as const,
          defaultSound: true,
          defaultVibrateTimings: true,
          ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    }

    const response = await messaging.sendEachForMulticast(message)

    // Automatically clean up stale or uninstalled tokens
    const tokensToRemove: string[] = []
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error
        if (
          error?.code === 'messaging/registration-token-not-registered' ||
          error?.code === 'messaging/invalid-registration-token'
        ) {
          tokensToRemove.push(tokens[idx])
        }
      }
    })

    if (tokensToRemove.length > 0) {
      const supabaseAdmin = createAdminClient()
      await supabaseAdmin.from('user_push_tokens').delete().in('token', tokensToRemove)
      console.log(`[FCM] Cleaned up ${tokensToRemove.length} expired device tokens`)
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    }
  } catch (err: any) {
    console.error('[FCM] Error sending multicast message:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Send push notification to a specific user (all their active registered devices)
 */
export async function sendPushNotificationToUser(userId: string, payload: PushPayload) {
  try {
    const supabaseAdmin = createAdminClient()
    const { data: tokenRecords, error } = await supabaseAdmin
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', userId)

    if (error || !tokenRecords || tokenRecords.length === 0) {
      console.log(`[FCM] No push tokens registered for user ${userId}`)
      return { success: false, count: 0, reason: 'no_tokens' }
    }

    const tokens = tokenRecords.map((r: any) => r.token)
    return await sendPushNotificationToTokens(tokens, payload)
  } catch (err: any) {
    console.error(`[FCM] Error sending notification to user ${userId}:`, err)
    return { success: false, error: err.message }
  }
}

/**
 * Send broadcast push notification (e.g. Swiggy-style weekend alerts or promotions)
 */
export async function broadcastPushNotification(payload: PushPayload, filter?: { role?: 'owner' | 'guest' }) {
  try {
    const supabaseAdmin = createAdminClient()

    let query = supabaseAdmin.from('user_push_tokens').select('token, user_id')

    // If filtered by role, query users with matching role
    if (filter?.role === 'owner') {
      const { data: owners } = await supabaseAdmin.from('owners').select('user_id').not('user_id', 'is', null)
      const ownerUserIds = owners?.map((o: any) => o.user_id) || []
      query = query.in('user_id', ownerUserIds)
    }

    const { data: tokenRecords, error } = await query
    if (error || !tokenRecords || tokenRecords.length === 0) {
      return { success: false, count: 0, reason: 'no_tokens' }
    }

    const tokens = Array.from(new Set(tokenRecords.map((r: any) => r.token)))
    return await sendPushNotificationToTokens(tokens, payload)
  } catch (err: any) {
    console.error('[FCM] Error broadcasting notification:', err)
    return { success: false, error: err.message }
  }
}
