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

  // 1. Fetch all check-ins using pagination to ensure no rows are capped by PostgREST limits
  const supabaseAdmin = createAdminClient()
  let allCheckins: any[] = []
  let from = 0
  const step = 1000
  let hasMore = true

  while (hasMore) {
    const { data: batch, error } = await supabaseAdmin
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
      .range(from, from + step - 1)

    if (error) {
      console.error('Police fetch checkins error:', error)
      break
    }

    if (batch && batch.length > 0) {
      allCheckins = allCheckins.concat(batch)
      if (batch.length < step) {
        hasMore = false
      } else {
        from += step
      }
    } else {
      hasMore = false
    }
  }

  // 2. Fetch any standalone confirmed bookings that may not yet have a guest_checkins entry
  try {
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        guest_name,
        guest_phone,
        checkin_date,
        checkout_date,
        num_guests,
        property_id,
        created_at,
        status,
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
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (bookings && bookings.length > 0) {
      const existingKeys = new Set(
        allCheckins.map(c => 
          `${(c.guest_name || '').toLowerCase().trim()}_${(c.guest_phone || '').replace(/\D/g, '')}`
        )
      )

      for (const b of bookings) {
        const key = `${(b.guest_name || '').toLowerCase().trim()}_${(b.guest_phone || '').replace(/\D/g, '')}`
        if (!existingKeys.has(key)) {
          allCheckins.push({
            id: b.id,
            property_id: b.property_id,
            guest_name: b.guest_name,
            guest_phone: b.guest_phone || '—',
            num_people: b.num_guests || 1,
            checkin_date: b.checkin_date ? String(b.checkin_date).slice(0, 10) : null,
            checkout_date: b.checkout_date ? String(b.checkout_date).slice(0, 10) : null,
            status: 'confirmed',
            source: 'Online Booking',
            uid: 'BKG-' + b.id.slice(0, 8).toUpperCase(),
            created_at: b.created_at,
            properties: b.properties,
            identities: [],
            id_documents: []
          })
        }
      }
    }
  } catch (err) {
    console.error('Police fetch bookings fallback error:', err)
  }

  // 3. Fetch any standalone hub_stays not yet linked to guest_checkins
  try {
    const { data: hubStays } = await supabaseAdmin
      .from('hub_stays')
      .select(`
        id,
        property_id,
        guest_name,
        guest_phone,
        checkin_at,
        access_ends_at,
        ended_at,
        created_at,
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
      .is('guest_checkin_id', null)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (hubStays && hubStays.length > 0) {
      const existingKeys = new Set(
        allCheckins.map(c => 
          `${(c.guest_name || '').toLowerCase().trim()}_${(c.guest_phone || '').replace(/\D/g, '')}`
        )
      )

      for (const s of hubStays) {
        const key = `${(s.guest_name || '').toLowerCase().trim()}_${(s.guest_phone || '').replace(/\D/g, '')}`
        if (!existingKeys.has(key)) {
          allCheckins.push({
            id: s.id,
            property_id: s.property_id,
            guest_name: s.guest_name,
            guest_phone: s.guest_phone || '—',
            num_people: 1,
            checkin_date: s.checkin_at ? String(s.checkin_at).slice(0, 10) : null,
            checkout_date: s.access_ends_at ? String(s.access_ends_at).slice(0, 10) : null,
            status: s.ended_at ? 'checked_out' : 'completed',
            source: 'Guest Hub Stay',
            uid: 'HUB-' + s.id.slice(0, 8).toUpperCase(),
            created_at: s.created_at,
            properties: s.properties,
            identities: [],
            id_documents: []
          })
        }
      }
    }
  } catch (err) {
    console.error('Police fetch hubStays fallback error:', err)
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
      initialCheckins={allCheckins || []} 
      initialEmployees={employees || []}
    />
  )
}
