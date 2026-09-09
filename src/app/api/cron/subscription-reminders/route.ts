import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendPushNotificationToUser } from '@/utils/fcm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return handleSubscriptionReminders(req)
}

export async function POST(req: NextRequest) {
  return handleSubscriptionReminders(req)
}

async function handleSubscriptionReminders(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Allow call if CRON_SECRET matches or if called by authorized admin
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If header doesn't match secret, check if request is from superadmin
      const { createClient } = await import('@/utils/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email !== 'superadmin@fixstay.com' && user?.user_metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabaseAdmin = createAdminClient()
    const now = new Date()

    // 1. Fetch active subscriptions joined with owner details
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('owner_subscriptions')
      .select('id, owner_id, plan_name, status, end_date, owners ( id, user_id, name, email )')
      .eq('status', 'active')

    if (subError) {
      console.error('[SubscriptionCheck] Failed to fetch subscriptions:', subError)
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }

    const results = {
      totalActive: subscriptions?.length || 0,
      reminders3DaySent: 0,
      reminders1DaySent: 0,
      expiredMarked: 0,
      trialRemindersSent: 0,
      logs: [] as any[],
    }

    for (const sub of subscriptions || []) {
      const owner = (sub as any).owners
      if (!owner || !owner.user_id) continue

      const endDate = new Date(sub.end_date)
      const diffMs = endDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      // Check if already expired
      if (diffMs <= 0) {
        // Mark as expired in DB
        await supabaseAdmin
          .from('owner_subscriptions')
          .update({ status: 'expired' })
          .eq('id', sub.id)

        results.expiredMarked++

        // Check if expired push was already sent
        const { data: alreadyLogged } = await supabaseAdmin
          .from('subscription_reminder_logs')
          .select('id')
          .eq('owner_id', owner.id)
          .eq('reminder_type', 'expired')
          .maybeSingle()

        if (!alreadyLogged) {
          // Push notification for expired (NO EMAILS)
          await sendPushNotificationToUser(owner.user_id, {
            title: '🔒 FixyStays Subscription Expired',
            body: 'Your partner plan has expired. Lead & guest details are now restricted. Tap to renew.',
            data: {
              url: '/pricing/starter',
              type: 'subscription_expired',
            },
          })

          await supabaseAdmin.from('subscription_reminder_logs').insert({
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
        const { data: alreadyLogged } = await supabaseAdmin
          .from('subscription_reminder_logs')
          .select('id')
          .eq('owner_id', owner.id)
          .eq('reminder_type', 'expiring_in_1_day')
          .maybeSingle()

        if (!alreadyLogged) {
          // Push notification 1 day before (NO EMAILS)
          await sendPushNotificationToUser(owner.user_id, {
            title: '🚨 Final Reminder: Plan Expires Tomorrow',
            body: `Your FixyStays ${sub.plan_name || 'Partner'} subscription ends tomorrow. Tap to recharge and avoid interruptions.`,
            data: {
              url: '/pricing/starter',
              type: 'expiring_in_1_day',
            },
          })

          await supabaseAdmin.from('subscription_reminder_logs').insert({
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
        const { data: alreadyLogged } = await supabaseAdmin
          .from('subscription_reminder_logs')
          .select('id')
          .eq('owner_id', owner.id)
          .eq('reminder_type', 'expiring_in_3_days')
          .maybeSingle()

        if (!alreadyLogged) {
          // Push notification 3 days before (NO EMAILS)
          await sendPushNotificationToUser(owner.user_id, {
            title: '⏳ Subscription Expiring in 3 Days',
            body: `Your FixyStays subscription expires in ${diffDays} days. Tap here to renew early without losing active time.`,
            data: {
              url: '/pricing/starter',
              type: 'expiring_in_3_days',
            },
          })

          await supabaseAdmin.from('subscription_reminder_logs').insert({
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
        const { data: alreadyLogged } = await supabaseAdmin
          .from('subscription_reminder_logs')
          .select('id')
          .eq('owner_id', owner.id)
          .eq('reminder_type', 'trial_ending_soon')
          .maybeSingle()

        if (!alreadyLogged) {
          await sendPushNotificationToUser(owner.user_id, {
            title: '⚡ Your 7-Day Free Trial Ends Soon',
            body: 'Upgrade to a Partner plan to keep viewing direct leads, guest check-ins, and analytics.',
            data: {
              url: '/pricing/starter',
              type: 'trial_ending_soon',
            },
          })

          await supabaseAdmin.from('subscription_reminder_logs').insert({
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

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: results,
    })
  } catch (err: any) {
    console.error('[SubscriptionCheck] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Error running check' }, { status: 500 })
  }
}
