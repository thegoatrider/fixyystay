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
  reminderType: string,
  propertySubscriptionId?: string
): Promise<boolean> {
  try {
    let query = supabaseAdmin
      .from('subscription_reminder_logs')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('reminder_type', reminderType)

    if (propertySubscriptionId) {
      query = query.eq('property_subscription_id', propertySubscriptionId)
    }

    const { data, error } = await query.maybeSingle()

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
    property_subscription_id?: string
    reminder_type: string
    channel?: string
    details?: any
  }
) {
  try {
    const insertData: any = {
      owner_id: payload.owner_id,
      reminder_type: payload.reminder_type,
      channel: payload.channel || 'push',
      details: payload.details || {},
    }
    if (payload.property_subscription_id) {
      insertData.property_subscription_id = payload.property_subscription_id
    }
    if (payload.subscription_id) {
      insertData.subscription_id = payload.subscription_id
    }

    const { error } = await supabaseAdmin
      .from('subscription_reminder_logs')
      .insert(insertData)
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

  // 1. Process active property_subscriptions
  try {
    const { data: propSubs, error: propSubError } = await supabaseAdmin
      .from('property_subscriptions')
      .select('id, property_id, owner_id, status, end_date, properties ( id, name ), owners ( id, user_id, name, email )')
      .eq('status', 'active')

    if (propSubError) {
      console.error('[SubscriptionCheck] Failed to fetch property_subscriptions:', propSubError)
    } else if (propSubs) {
      results.totalActive += propSubs.length

      for (const sub of propSubs) {
        const rawOwner = (sub as any).owners
        let owner = Array.isArray(rawOwner) ? rawOwner[0] : rawOwner
        const rawProp = (sub as any).properties
        const property = Array.isArray(rawProp) ? rawProp[0] : rawProp
        const propName = property?.name || 'Your property'

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

        if (diffMs <= 0) {
          await supabaseAdmin
            .from('property_subscriptions')
            .update({ status: 'expired' })
            .eq('id', sub.id)

          results.expiredMarked++

          const alreadyLogged = await isReminderAlreadyLogged(supabaseAdmin, owner.id, 'expired', sub.id)
          if (!alreadyLogged) {
            await sendPushNotificationToUser(owner.user_id, {
              title: `🔒 Subscription Expired: ${propName}`,
              body: `Your FixyStays subscription for ${propName} has expired. Tap to renew and keep guest check-ins and direct leads active.`,
              data: {
                url: '/renew',
                type: 'subscription_expired',
              },
            })

            await logReminder(supabaseAdmin, {
              owner_id: owner.id,
              property_subscription_id: sub.id,
              reminder_type: 'expired',
              channel: 'push',
              details: { endDate: sub.end_date, propertyId: sub.property_id, propertyName: propName },
            })

            results.logs.push({ owner: owner.email, event: `prop_expired_${propName}` })
          }
          continue
        }

        if (diffDays <= 1) {
          const alreadyLogged = await isReminderAlreadyLogged(supabaseAdmin, owner.id, 'expiring_in_1_day', sub.id)
          if (!alreadyLogged) {
            await sendPushNotificationToUser(owner.user_id, {
              title: `🚨 Final Reminder: ${propName} Subscription Expires Tomorrow`,
              body: `Your FixyStays subscription for ${propName} ends tomorrow. Tap to renew now.`,
              data: {
                url: '/renew',
                type: 'expiring_in_1_day',
              },
            })

            await logReminder(supabaseAdmin, {
              owner_id: owner.id,
              property_subscription_id: sub.id,
              reminder_type: 'expiring_in_1_day',
              channel: 'push',
              details: { endDate: sub.end_date, propertyId: sub.property_id, propertyName: propName, diffDays },
            })

            results.reminders1DaySent++
            results.logs.push({ owner: owner.email, event: `prop_1_day_${propName}` })
          }
          continue
        }

        if (diffDays <= 3) {
          const alreadyLogged = await isReminderAlreadyLogged(supabaseAdmin, owner.id, 'expiring_in_3_days', sub.id)
          if (!alreadyLogged) {
            await sendPushNotificationToUser(owner.user_id, {
              title: `⏳ Subscription Expiring in 3 Days: ${propName}`,
              body: `Your FixyStays subscription for ${propName} expires in ${diffDays} days. Tap here to renew early.`,
              data: {
                url: '/renew',
                type: 'expiring_in_3_days',
              },
            })

            await logReminder(supabaseAdmin, {
              owner_id: owner.id,
              property_subscription_id: sub.id,
              reminder_type: 'expiring_in_3_days',
              channel: 'push',
              details: { endDate: sub.end_date, propertyId: sub.property_id, propertyName: propName, diffDays },
            })

            results.reminders3DaySent++
            results.logs.push({ owner: owner.email, event: `prop_3_day_${propName}` })
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[SubscriptionCheck] Error checking property_subscriptions:', err)
  }

  // 2. Process legacy owner_subscriptions
  try {
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('owner_subscriptions')
      .select('id, owner_id, plan_name, status, end_date, owners ( id, user_id, name, email )')
      .eq('status', 'active')

    if (subError) {
      console.warn('[SubscriptionCheck] Legacy owner_subscriptions fetch:', subError.message)
    } else if (subscriptions) {
      results.totalActive += subscriptions.length

      for (const sub of subscriptions) {
        const rawOwner = (sub as any).owners
        let owner = Array.isArray(rawOwner) ? rawOwner[0] : rawOwner

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
              body: 'Your partner plan has expired. Tap to renew and restore access.',
              data: {
                url: '/renew',
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

            results.logs.push({ owner: owner.email, event: 'legacy_expired_push_sent' })
          }
          continue
        }

        if (diffDays <= 1) {
          const alreadyLogged = await isReminderAlreadyLogged(supabaseAdmin, owner.id, 'expiring_in_1_day')
          if (!alreadyLogged) {
            await sendPushNotificationToUser(owner.user_id, {
              title: '🚨 Final Reminder: Plan Expires Tomorrow',
              body: `Your FixyStays subscription ends tomorrow. Tap to renew and avoid interruptions.`,
              data: {
                url: '/renew',
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
            results.logs.push({ owner: owner.email, event: 'legacy_1_day_reminder' })
          }
          continue
        }

        if (diffDays <= 3) {
          const alreadyLogged = await isReminderAlreadyLogged(supabaseAdmin, owner.id, 'expiring_in_3_days')
          if (!alreadyLogged) {
            await sendPushNotificationToUser(owner.user_id, {
              title: '⏳ Subscription Expiring in 3 Days',
              body: `Your FixyStays subscription expires in ${diffDays} days. Tap here to renew early.`,
              data: {
                url: '/renew',
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
            results.logs.push({ owner: owner.email, event: 'legacy_3_day_reminder' })
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[SubscriptionCheck] Error checking legacy owner_subscriptions:', err)
  }

  return {
    success: true,
    timestamp: now.toISOString(),
    summary: results,
  }
}
