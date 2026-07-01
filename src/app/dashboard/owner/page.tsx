import { createClient } from '@/utils/supabase/server'
import OwnerDashboardClient from './OwnerDashboardClient'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  
  // 1. Get user & session info on SSR for security and speed
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com' || user?.user_metadata?.role === 'admin'
  
  // 2. Initial owner lookup (fast)
  let { data: owner } = await supabase.from('owners').select('id, created_at').eq('user_id', user?.id).maybeSingle()
  
  if (!owner && user?.email) {
    // Self-healing: if role is owner but not linked to user_id, link by email
    const { data: updatedOwner } = await supabase
      .from('owners')
      .update({ user_id: user.id })
      .eq('email', user.email)
      .select('id, created_at')
      .maybeSingle()
    
    if (updatedOwner) owner = updatedOwner
  }

  // 3. Fetch Google token status
  let hasGoogleDrive = false
  let googleEmail: string | null = null
  if (owner) {
    const { data: googleToken } = await supabase
      .from('owner_google_tokens')
      .select('google_email')
      .eq('owner_id', owner.id)
      .maybeSingle()
    hasGoogleDrive = !!googleToken?.google_email
    googleEmail = googleToken?.google_email || null
  }
  
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
