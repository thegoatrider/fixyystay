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
  let { data: owner } = await supabase.from('owners').select('id, created_at, free_tier_enabled').eq('user_id', user?.id).maybeSingle()
  
  if (!owner && user?.email) {
    const supabaseAdmin = createAdminClient()
    const lowerEmail = user.email.toLowerCase()
    
    // Self-healing step 1: try to link by email if row exists
    const { data: updatedOwner } = await supabaseAdmin
      .from('owners')
      .update({ user_id: user.id })
      .eq('email', lowerEmail)
      .select('id, created_at, free_tier_enabled')
      .maybeSingle()
    
    if (updatedOwner) {
      owner = updatedOwner
    } else {
      // Self-healing step 2: row doesn't exist at all, create it!
      const { data: newOwner } = await supabaseAdmin
        .from('owners')
        .insert({
          user_id: user.id,
          email: lowerEmail,
          name: user.user_metadata?.name || user.email.split('@')[0],
          phone: user.user_metadata?.phone || ''
        })
        .select('id, created_at, free_tier_enabled')
        .single()
        
      if (newOwner) owner = newOwner
    }
  }

  // 3. Strict Subscription & Payment Gating + Google Token in Parallel
  if (!isSuperAdmin && !owner) {
    redirect('/onboarding?step=payment&reason=unpaid')
  }

  const isFreeTier = (owner as any)?.free_tier_enabled === true

  // Run subscription check and Google drive token lookup concurrently
  const [subResult, googleTokenResult] = await Promise.all([
    !isSuperAdmin && owner && !isFreeTier
      ? supabase.from('owner_subscriptions').select('status, end_date').eq('owner_id', owner.id).maybeSingle()
      : Promise.resolve({ data: null }),
    owner
      ? supabase.from('owner_google_tokens').select('google_email').eq('owner_id', owner.id).maybeSingle()
      : Promise.resolve({ data: null })
  ])

  if (!isSuperAdmin && owner && !isFreeTier) {
    const sub = subResult.data
    const isSubActive = sub?.status === 'active' && new Date(sub.end_date) > new Date()
    
    if (!isSubActive) {
      // Also allow owners who purchased standalone Guest Hub (₹20/room/month)
      // Single query inner join through FK (guest_hub_settings.property_id -> properties.id)
      const supabaseAdmin = createAdminClient()
      const { data: activeHub } = await supabaseAdmin
        .from('guest_hub_settings')
        .select('id, properties!inner(id, owner_id)')
        .eq('properties.owner_id', owner.id)
        .eq('subscription_status', 'active')
        .limit(1)
        .maybeSingle()

      if (!activeHub) {
        redirect('/onboarding?step=payment&reason=unpaid')
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
      />
    </Suspense>
  )
}
