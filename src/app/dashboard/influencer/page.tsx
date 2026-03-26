import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import InfluencerDashboardClient from './InfluencerDashboardClient'

export default async function InfluencerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com'
  const influencerId = user?.id || ''

  return (
    <InfluencerDashboardClient 
      influencerId={influencerId} 
      isSuperAdmin={isSuperAdmin} 
    />
  )
}
