import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { isSuperAdminUser } from '@/utils/supabase/auth-roles'
import { executeSubscriptionRemindersCheck } from '@/utils/subscription-reminders'

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

    // 1. Allow automated Vercel Cron jobs matching CRON_SECRET
    const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`)

    // 2. Allow authenticated superadmins triggering check from Admin Dashboard
    let isSuperAdmin = false
    if (!isCronAuthorized) {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && isSuperAdminUser(user)) {
          isSuperAdmin = true
        }
      } catch (authErr) {
        console.warn('[SubscriptionReminders] Superadmin check failed:', authErr)
      }
    }

    if (!isCronAuthorized && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Superadmin access or valid CRON_SECRET required' },
        { status: 401 }
      )
    }

    const result = await executeSubscriptionRemindersCheck()
    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (err: any) {
    console.error('[SubscriptionCheck] Unexpected error in route handler:', err)
    return NextResponse.json({ error: err.message || 'Error running check' }, { status: 500 })
  }
}

