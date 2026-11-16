import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSuperAdminUser } from '@/utils/supabase/auth-roles'
import { reconcileOwnerSubscriptions } from '@/lib/reconciliation'
import OwnerDashboardClient from './OwnerDashboardClient'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  
  // 1. Get user & session info on SSR for security and speed
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = isSuperAdminUser(user)
  
  // 2. Initial owner lookup (fast) with phone number
  let { data: owner } = await supabase.from('owners').select('id, created_at, name, phone').eq('user_id', user?.id).maybeSingle()
  
  if (!owner && user?.email) {
    const supabaseAdmin = createAdminClient()
    const lowerEmail = user.email.toLowerCase()
    
    // Link user_id by email if owner record was already created during onboarding
    const { data: updatedOwner, error: linkError } = await supabaseAdmin
      .from('owners')
      .update({ user_id: user.id })
      .eq('email', lowerEmail)
      .select('id, created_at, name, phone')
      .maybeSingle()
    
    if (linkError) {
      console.error('Error linking owner by email:', linkError)
    }

    if (updatedOwner) {
      owner = updatedOwner
    }
  }

  // Self-heal: ensure phone is populated from auth user metadata if present
  const metaPhone = user?.user_metadata?.phone
  if (owner) {
    if (!owner.phone && metaPhone) {
      const supabaseAdmin = createAdminClient()
      await supabaseAdmin.from('owners').update({ phone: metaPhone }).eq('id', owner.id)
      owner.phone = metaPhone
    }
  }

  // 3. Strict Subscription & Payment Gating + Google Token in Parallel
  if (!isSuperAdmin && !owner) {
    redirect('/renew')
  }

  const supabaseAdmin = createAdminClient()

  // Run property subscription check and Google drive token lookup concurrently
  const [subResult, legacySubResult, googleTokenResult] = await Promise.all([
    owner
      ? supabaseAdmin.from('property_subscriptions').select('*').eq('owner_id', owner.id).order('end_date', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    owner
      ? supabaseAdmin.from('owner_subscriptions').select('plan_name, status, end_date').eq('owner_id', owner.id).order('end_date', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    owner
      ? supabase.from('owner_google_tokens').select('google_email').eq('owner_id', owner.id).maybeSingle()
      : Promise.resolve({ data: null })
  ])

  const now = new Date()
  const isPropSubActive =
    subResult.data?.status === 'active' &&
    !!subResult.data?.end_date &&
    new Date(subResult.data.end_date) > now
  const isLegacySubActive =
    legacySubResult.data?.status === 'active' &&
    !!legacySubResult.data?.end_date &&
    new Date(legacySubResult.data.end_date) > now

  let initialSubscription: any = isPropSubActive
    ? subResult.data
    : isLegacySubActive
      ? legacySubResult.data
      : subResult.data || legacySubResult.data

  if (owner) {
    let isSubActive = isPropSubActive || isLegacySubActive
    const needsSync = !isPropSubActive || !isLegacySubActive

    if (!isSubActive || needsSync) {
      // Reconcile pending/unlinked Razorpay payments and synchronize property_subscriptions <-> owner_subscriptions
      const recon = await reconcileOwnerSubscriptions(owner.id)
      if (recon.activated || !isSubActive) {
        const [{ data: refreshedSub }, { data: refreshedLegacy }] = await Promise.all([
          supabaseAdmin
            .from('property_subscriptions')
            .select('*')
            .eq('owner_id', owner.id)
            .order('end_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseAdmin
            .from('owner_subscriptions')
            .select('plan_name, status, end_date')
            .eq('owner_id', owner.id)
            .order('end_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        const refreshedPropActive =
          refreshedSub?.status === 'active' &&
          !!refreshedSub?.end_date &&
          new Date(refreshedSub.end_date) > now
        const refreshedLegacyActive =
          refreshedLegacy?.status === 'active' &&
          !!refreshedLegacy?.end_date &&
          new Date(refreshedLegacy.end_date) > now

        if (refreshedPropActive) {
          isSubActive = true
          initialSubscription = refreshedSub
        } else if (refreshedLegacyActive) {
          isSubActive = true
          initialSubscription = refreshedLegacy
        }
      }
    }

    if (!isSuperAdmin && !isSubActive) {
      // Also allow owners who purchased standalone Guest Hub
      const { data: activeHub } = await supabaseAdmin
        .from('guest_hub_settings')
        .select('id, subscription_status, subscription_end_date, properties!inner(id, owner_id)')
        .eq('properties.owner_id', owner.id)
        .eq('subscription_status', 'active')
        .limit(1)
        .maybeSingle()

      if (activeHub) {
        initialSubscription = {
          status: 'active',
          end_date: activeHub.subscription_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          plan_name: 'Guest Hub Plan',
        }
      } else {
        redirect('/renew')
      }
    }
  }

  const hasGoogleDrive = !!googleTokenResult.data?.google_email
  const googleEmail = googleTokenResult.data?.google_email || null
  
  // 4. Render the Client Dashboard
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OwnerDashboardClient 
        userId={user.id} 
        email={user.email || ''}
        ownerId={owner?.id || ''} 
        isSuperAdmin={isSuperAdmin} 
        hasGoogleDrive={hasGoogleDrive}
        googleEmail={googleEmail}
        initialOwner={owner}
        userPhone={owner?.phone || user.user_metadata?.phone || ''}
        initialSubscription={initialSubscription}
      />
    </Suspense>
  )
}
