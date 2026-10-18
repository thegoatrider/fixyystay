import { createAdminClient } from '@/utils/supabase/admin'
import { sendPushNotificationToUser } from '@/utils/fcm'

export interface SubscriptionCheckResult {
  success: boolean
  timestamp: string
  summary: {
    totalActive: number
    reminders3DaySent: number
    reminders1DaySent: number
    expiredMarked: number
    trialRemindersSent: number
    logs: Array<{ owner: string; event: string }>
  }
  error?: string
}

async function isReminderAlreadyLogged(
  supabaseAdmin: any,
  ownerId: string,
  reminderType: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_reminder_logs')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('reminder_type', reminderType)
      .maybeSingle()

    if (error) {
      return false
    }
    return Boolean(data?.id)
  } catch {
    return false
  }
}

async function logReminder(
  supabaseAdmin: any,
  payload: {
    owner_id: string
    subscription_id?: string
    reminder_type: string
    channel?: string
    details?: any
  }
) {
  try {
    const { error } = await supabaseAdmin
      .from('subscription_reminder_logs')
      .insert({
        owner_id: payload.owner_id,
        subscription_id: payload.subscription_id,
        reminder_type: payload.reminder_type,
        channel: payload.channel || 'push',
        details: payload.details || {},
      })
    if (error) {
      console.warn('[SubscriptionReminders] Could not log reminder:', error.message)
    }
  } catch (err) {
    console.warn('[SubscriptionReminders] Exception logging reminder:', err)
  }
}

export async function executeSubscriptionRemindersCheck(): Promise<SubscriptionCheckResult> {
  const supabaseAdmin = createAdminClient()
  const now = new Date()

  const results = {
    totalActive: 0,
    reminders3DaySent: 0,
    reminders1DaySent: 0,
    expiredMarked: 0,
    trialRemindersSent: 0,
    logs: [] as Array<{ owner: string; event: string }>,
  }

  // 1. Fetch active subscriptions joined with owner details
  const { data: subscriptions, error: subError } = await supabaseAdmin
    .from('owner_subscriptions')
    .select('id, owner_id, plan_name, status, end_date, owners ( id, user_id, name, email )')
    .eq('status', 'active')

  if (subError) {
    console.error('[SubscriptionCheck] Failed to fetch subscriptions:', subError)
    return {
      success: false,
      timestamp: now.toISOString(),
      summary: results,
      error: subError.message,
    }
  }

  results.totalActive = subscriptions?.length || 0

  for (const sub of subscriptions || []) {
    const rawOwner = (sub as any).owners
    let owner = Array.isArray(rawOwner) ? rawOwner[0] : rawOwner

    // Fallback: fetch owner directly if relation didn't populate user_id
    if ((!owner || !owner.user_id) && sub.owner_id) {
      const { data: directOwner } = await supabaseAdmin
        .from('owners')
        .select('id, user_id, name, email')
        .eq('id', sub.owner_id)
        .maybeSingle()
      if (directOwner) owner = directOwner
    }

    if (!owner || !owner.user_id) continue

    const endDate = new Date(sub.end_date)
    const diffMs = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    // Check if already expired
    if (diffMs <= 0) {
      await supabaseAdmin
        .from('owner_subscriptions')
        .update({ status: 'expired' })
        .eq('id', sub.id)

      results.expiredMarked++

      const alreadyLogged = await isReminderAlreadyLogged(supabaseAdmin, owner.id, 'expired')
      if (!alreadyLogged) {
        await sendPushNotificationToUser(owner.user_id, {
          title: '🔒 FixyStays Subscription Expired',
          body: 'Your partner plan has expired. Lead & guest details are now restricted. Tap to renew.',
          data: {
            url: '/pricing/starter',
            type: 'subscription_expired',
          },
        })

        await logReminder(supabaseAdmin, {
          owner_id: owner.id,
          subscription_id: sub.id,
          reminder_type: 'expired',
          channel: 'push',
          details: { endDate: sub.end_date, planName: sub.plan_name },
        })

        results.logs.push({ owner: owner.email, event: 'expired_push_sent' })
      }
      continue
    }

    // Check 1-Day Expiry Reminder
    if (diffDays <= 1) {
      const alreadyLogged = await isReminderAlreadyLogged(supabaseAdmin, owner.id, 'expiring_in_1_day')
      if (!alreadyLogged) {
        await sendPushNotificationToUser(owner.user_id, {
          title: '🚨 Final Reminder: Plan Expires Tomorrow',
          body: `Your FixyStays ${sub.plan_name || 'Partner'} subscription ends tomorrow. Tap to recharge and avoid interruptions.`,
          data: {
            url: '/pricing/starter',
            type: 'expiring_in_1_day',
          },
        })

        await logReminder(supabaseAdmin, {
          owner_id: owner.id,
          subscription_id: sub.id,
          reminder_type: 'expiring_in_1_day',
          channel: 'push',
          details: { endDate: sub.end_date, planName: sub.plan_name, diffDays },
        })

        results.reminders1DaySent++
        results.logs.push({ owner: owner.email, event: '1_day_reminder_push_sent' })
      }
      continue
    }

    // Check 3-Days Expiry Reminder
    if (diffDays <= 3) {
      const alreadyLogged = await isReminderAlreadyLogged(supabaseAdmin, owner.id, 'expiring_in_3_days')
      if (!alreadyLogged) {
        await sendPushNotificationToUser(owner.user_id, {
          title: '⏳ Subscription Expiring in 3 Days',
          body: `Your FixyStays subscription expires in ${diffDays} days. Tap here to renew early without losing active time.`,
          data: {
            url: '/pricing/starter',
            type: 'expiring_in_3_days',
          },
        })

        await logReminder(supabaseAdmin, {
          owner_id: owner.id,
          subscription_id: sub.id,
          reminder_type: 'expiring_in_3_days',
          channel: 'push',
          details: { endDate: sub.end_date, planName: sub.plan_name, diffDays },
        })

        results.reminders3DaySent++
        results.logs.push({ owner: owner.email, event: '3_day_reminder_push_sent' })
      }
    }
  }

  // 2. Check 7-Day Free Trial owners who haven't subscribed
  const { data: trialOwners } = await supabaseAdmin
    .from('owners')
    .select('id, user_id, name, email, created_at')
    .not('user_id', 'is', null)

  for (const owner of trialOwners || []) {
    if (!owner.created_at || !owner.user_id) continue

    // Check if they have an active paid subscription
    const { data: hasPaidSub } = await supabaseAdmin
      .from('owner_subscriptions')
      .select('id')
      .eq('owner_id', owner.id)
      .eq('status', 'active')
      .maybeSingle()

    if (hasPaidSub) continue

    const createdAt = new Date(owner.created_at)
    const trialEndDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    const trialDiffDays = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (trialDiffDays <= 1 && trialDiffDays >= 0) {
      const alreadyLogged = await isReminderAlreadyLogged(supabaseAdmin, owner.id, 'trial_ending_soon')
      if (!alreadyLogged) {
        await sendPushNotificationToUser(owner.user_id, {
          title: '⚡ Your 7-Day Free Trial Ends Soon',
          body: 'Upgrade to a Partner plan to keep viewing direct leads, guest check-ins, and analytics.',
          data: {
            url: '/pricing/starter',
            type: 'trial_ending_soon',
          },
        })

        await logReminder(supabaseAdmin, {
          owner_id: owner.id,
          reminder_type: 'trial_ending_soon',
          channel: 'push',
          details: { trialEndDate: trialEndDate.toISOString(), trialDiffDays },
        })

        results.trialRemindersSent++
        results.logs.push({ owner: owner.email, event: 'trial_ending_push_sent' })
      }
    }
  }

  return {
    success: true,
    timestamp: now.toISOString(),
    summary: results,
  }
}
