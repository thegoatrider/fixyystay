import { createClient } from '@/utils/supabase/server'
import OwnerDashboardClient from './OwnerDashboardClient'
import { redirect } from 'next/navigation'

export default async function OwnerDashboard(props: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient()
  
  // 1. Get user & session info on SSR for security and speed
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com'
  
  // 2. Initial owner lookup (fast)
  const { data: owner } = await supabase.from('owners').select('id').eq('user_id', user?.id).single()
  
  // 3. Render the Client Dashboard
  // Parallel fetching happens inside the Client component via React Query + RPC
  return (
    <OwnerDashboardClient 
      userId={user.id} 
      ownerId={owner?.id || ''} 
      isSuperAdmin={isSuperAdmin} 
    />
  )
}
