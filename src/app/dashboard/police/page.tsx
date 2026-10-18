import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getEffectiveUserRole, isSuperAdminUser } from '@/utils/supabase/auth-roles'
import PoliceDashboardClient from './PoliceDashboardClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PoliceDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isSuperAdmin = isSuperAdminUser(user)
  const role = getEffectiveUserRole(user)
  const isPolice = role === 'police' || 
                   user?.email?.toLowerCase().includes('police') || 
                   user?.user_metadata?.role === 'police' || 
                   user?.app_metadata?.role === 'police'
  
  if (!user || (!isPolice && !isSuperAdmin)) {
    redirect('/login')
  }

  // Self-heal and sync police role in backend if needed
  if (user && isPolice && !isSuperAdmin && (user.user_metadata?.role !== 'police' || user.app_metadata?.role !== 'police')) {
    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role: 'police' },
      app_metadata: { ...user.app_metadata, role: 'police' }
    })
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
