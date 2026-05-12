import { createClient } from '@/utils/supabase/server'
import PoliceDashboardClient from './PoliceDashboardClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PoliceDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || user.user_metadata?.role !== 'police') {
    redirect('/login')
  }

  // Fetch all check-ins with related property and owner data
  const { data: checkins, error } = await supabase
    .from('guest_checkins')
    .select(`
      *,
      properties (
        name,
        city_area,
        helpdesk_number,
        owners (
          name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Police fetch error:', error)
  }

  return (
    <PoliceDashboardClient initialCheckins={checkins || []} />
  )
}
