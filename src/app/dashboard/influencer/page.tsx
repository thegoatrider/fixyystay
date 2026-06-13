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

  // Self-healing: if role is influencer but profile user_id is not set, link by email
  if (user?.email) {
    const normalizedEmail = user.email.toLowerCase()
    const { data: influencer } = await supabase
      .from('influencers')
      .select('id, user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!influencer) {
      const { data: byEmail } = await supabase
        .from('influencers')
        .select('id, user_id')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (byEmail) {
        await supabase
          .from('influencers')
          .update({ user_id: user.id })
          .eq('id', byEmail.id)
      }
    }
  }

  return (
    <InfluencerDashboardClient 
      influencerId={influencerId} 
      isSuperAdmin={isSuperAdmin} 
    />
  )
}
