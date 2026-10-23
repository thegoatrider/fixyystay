import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { calculateMonthlyFee } from '@/lib/pricing'
import { getEffectiveMonthlyFee } from '@/app/pricing/business/actions'
import RenewClient from './RenewClient'

export const metadata = {
  title: 'Renew Property Subscription | FixyStays',
  description: 'Renew your FixyStays property subscription based on room count tiers.',
}

export default async function RenewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const supabaseAdmin = createAdminClient()

  // 1. Fetch Owner record
  const { data: owner } = await supabaseAdmin
    .from('owners')
    .select('id, name, email, phone')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!owner) {
    redirect('/onboarding')
  }

  // 2. Fetch Owner's Properties
  const { data: properties } = await supabaseAdmin
    .from('properties')
    .select('id, name, city, state, pincode, room_count, approval_status')
    .eq('owner_id', owner.id)
    .order('created_at', { ascending: false })

  // 3. For each property, calculate effective rooms, fee, and subscription status
  const propertiesWithSubs = await Promise.all(
    (properties || []).map(async (prop) => {
      // Physical rooms count
      const { count: physicalRoomsCount } = await supabaseAdmin
        .from('property_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', prop.id)

      const declaredRooms = prop.room_count || 0
      const physicalRooms = physicalRoomsCount || 0
      const effectiveRooms = Math.max(declaredRooms, physicalRooms, 1)

      // Active tier fee based on DB pricing_tiers (1-6: 100, 7-12: 150, etc.)
      const monthlyFee = await getEffectiveMonthlyFee(
        supabaseAdmin,
        effectiveRooms,
        prop.city,
        prop.state,
        prop.pincode
      )

      // Property subscription
      const { data: sub } = await supabaseAdmin
        .from('property_subscriptions')
        .select('status, end_date, months, plan_name')
        .eq('property_id', prop.id)
        .maybeSingle()

      return {
        id: prop.id,
        name: prop.name,
        city: prop.city || 'Alibag',
        declared_room_count: prop.room_count,
        physical_rooms_count: physicalRooms,
        effective_rooms: effectiveRooms,
        monthly_fee: monthlyFee,
        subscription: sub || null,
        approval_status: prop.approval_status || 'draft',
      }
    })
  )

  return <RenewClient owner={owner} properties={propertiesWithSubs} />
}
