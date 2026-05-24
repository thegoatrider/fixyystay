import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import PoliceDashboardClient from './PoliceDashboardClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PoliceDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || user.user_metadata?.role !== 'police') {
    redirect('/login')
  }

  // Fetch all check-ins with related property and owner data using admin client to bypass RLS
  const supabaseAdmin = createAdminClient()
  const { data: checkins, error } = await supabaseAdmin
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
      ),
      identities:guest_identity(*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Police fetch checkins error:', error)
  }

  // Fetch employees
  const { data: employees, error: empError } = await supabaseAdmin
    .from('property_employees')
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
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (empError) {
    console.error('Police fetch employees error:', empError)
  }

  return (
    <PoliceDashboardClient 
      initialCheckins={checkins || []} 
      initialEmployees={employees || []}
    />
  )
}
