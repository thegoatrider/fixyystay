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

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com'
  
  // 2. Initial owner lookup (fast)
  const { data: owner } = await supabase.from('owners').select('id, created_at').eq('user_id', user?.id).single()
  
  // 3. Render the Client Dashboard
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OwnerDashboardClient 
        userId={user.id} 
        email={user.email || ''}
        ownerId={owner?.id || ''} 
        isSuperAdmin={isSuperAdmin} 
      />
    </Suspense>
  )
}
