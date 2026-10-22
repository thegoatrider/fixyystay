import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSuperAdminUser } from '@/utils/supabase/auth-roles'
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
  
  // 2. Initial owner lookup (fast)
  let { data: owner } = await supabase.from('owners').select('id, created_at, name').eq('user_id', user?.id).maybeSingle()
  
  if (!owner && user?.email) {
    const supabaseAdmin = createAdminClient()
    const lowerEmail = user.email.toLowerCase()
    
    // Link user_id by email if owner record was already created during onboarding
    const { data: updatedOwner, error: linkError } = await supabaseAdmin
      .from('owners')
      .update({ user_id: user.id })
      .eq('email', lowerEmail)
      .select('id, created_at, name')
      .maybeSingle()
    
    if (linkError) {
      console.error('Error linking owner by email:', linkError)
    }

    if (updatedOwner) {
      owner = updatedOwner
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
      ? supabaseAdmin.from('property_subscriptions').select('status, end_date, months, monthly_fee, amount').eq('owner_id', owner.id).order('end_date', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    owner
      ? supabaseAdmin.from('owner_subscriptions').select('plan_name, status, end_date').eq('owner_id', owner.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    owner
      ? supabase.from('owner_google_tokens').select('google_email').eq('owner_id', owner.id).maybeSingle()
      : Promise.resolve({ data: null })
  ])

  const initialSubscription = subResult.data || legacySubResult.data

  if (!isSuperAdmin && owner) {
    const isSubActive = initialSubscription?.status === 'active' && !!initialSubscription?.end_date && new Date(initialSubscription.end_date) > new Date()
    
    if (!isSubActive) {
      // Also allow owners who purchased standalone Guest Hub
      const { data: activeHub } = await supabaseAdmin
        .from('guest_hub_settings')
        .select('id, properties!inner(id, owner_id)')
        .eq('properties.owner_id', owner.id)
        .eq('subscription_status', 'active')
        .limit(1)
        .maybeSingle()

      if (!activeHub) {
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
        initialSubscription={initialSubscription}
      />
    </Suspense>
  )
}
