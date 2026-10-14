'use server'

import { createClient } from '@/utils/supabase/server'
import { isSuperAdminUser } from '@/utils/supabase/auth-roles'

export async function getInfluencerDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const isSuperAdmin = isSuperAdminUser(user)

  const { data, error } = await supabase.rpc('get_influencer_dashboard_data', {
    p_influencer_id: user.id,
    p_is_super_admin: isSuperAdmin
  })

  if (error) {
    console.error('Error fetching influencer dashboard data:', error)
    throw new Error(error.message)
  }

  return data
}
