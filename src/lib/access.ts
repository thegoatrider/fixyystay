import 'server-only'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSuperAdminUser } from '@/utils/supabase/auth-roles'
import { User } from '@supabase/supabase-js'

export interface PropertyAccessResult {
  allowed: boolean
  reason?: 'expired' | 'unpaid' | 'not_found' | 'unauthorized'
  property?: any
  owner?: any
  subscription?: any
  isGuestHubExempt?: boolean
  isSuperAdmin?: boolean
}

export interface OwnerAccessResult {
  hasAccess: boolean
  owner: any
  properties: any[]
  activePropertyIds: string[]
  inactivePropertyIds: string[]
  isSuperAdmin: boolean
  missingPhone: boolean
  propertiesMissingRoomCount: string[]
}

/**
 * Checks per-property access for mutations and detailed views.
 * Access is granted if:
 * 1. User is Superadmin / Admin.
 * 2. Property has a valid, active row in public.property_subscriptions with end_date > now().
 * 3. Property is a Standalone Guest Hub with guest_hub_settings.subscription_status = 'active'.
 */
export async function getPropertyAccess(
  propertyId: string,
  user: User | null
): Promise<PropertyAccessResult> {
  if (!user) {
    return { allowed: false, reason: 'unauthorized' }
  }

  const isSuperAdmin = isSuperAdminUser(user) || user.app_metadata?.role === 'admin'
  const supabaseAdmin = createAdminClient()

  // 1. Fetch Property
  const { data: property, error: propErr } = await supabaseAdmin
    .from('properties')
    .select('*, owners(id, user_id, name, email, phone)')
    .eq('id', propertyId)
    .maybeSingle()

  if (propErr || !property) {
    return { allowed: false, reason: 'not_found' }
  }

  // 2. Ownership Verification
  const owner = property.owners
  if (!isSuperAdmin && owner?.user_id !== user.id) {
    return { allowed: false, reason: 'unauthorized', property }
  }

  if (isSuperAdmin) {
    return { allowed: true, isSuperAdmin: true, property, owner }
  }

  // 3. Standalone Guest Hub Exemption Check
  if (property.is_guest_hub_only) {
    const { data: ghSettings } = await supabaseAdmin
      .from('guest_hub_settings')
      .select('subscription_status')
      .eq('property_id', propertyId)
      .maybeSingle()

    if (ghSettings?.subscription_status === 'active') {
      return { allowed: true, isGuestHubExempt: true, property, owner }
    }
  }

  // 4. Per-Property Subscription Check (Source of Truth)
  const { data: sub } = await supabaseAdmin
    .from('property_subscriptions')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()

  if (!sub) {
    return { allowed: false, reason: 'unpaid', property, owner }
  }

  const isSubActive = sub.status === 'active' && new Date(sub.end_date) > new Date()
  if (!isSubActive) {
    return { allowed: false, reason: 'expired', property, owner, subscription: sub }
  }

  return { allowed: true, property, owner, subscription: sub }
}

/**
 * Checks owner-level access across all their properties.
 * Identifies active vs. inactive properties and flags missing phone/room_count.
 */
export async function getOwnerAccess(user: User | null): Promise<OwnerAccessResult> {
  if (!user) {
    return {
      hasAccess: false,
      owner: null,
      properties: [],
      activePropertyIds: [],
      inactivePropertyIds: [],
      isSuperAdmin: false,
      missingPhone: true,
      propertiesMissingRoomCount: [],
    }
  }

  const isSuperAdmin = isSuperAdminUser(user) || user.app_metadata?.role === 'admin'
  const supabaseAdmin = createAdminClient()

  // 1. Fetch Owner Profile
  const { data: owner } = await supabaseAdmin
    .from('owners')
    .select('id, user_id, name, email, phone')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!owner && !isSuperAdmin) {
    return {
      hasAccess: false,
      owner: null,
      properties: [],
      activePropertyIds: [],
      inactivePropertyIds: [],
      isSuperAdmin: false,
      missingPhone: true,
      propertiesMissingRoomCount: [],
    }
  }

  // 2. Fetch All Properties for this owner
  const { data: properties } = await supabaseAdmin
    .from('properties')
    .select('id, name, city, room_count, approval_status, is_guest_hub_only, created_at')
    .eq('owner_id', owner?.id || '')
    .order('created_at', { ascending: false })

  const propList = properties || []

  if (isSuperAdmin) {
    return {
      hasAccess: true,
      owner,
      properties: propList,
      activePropertyIds: propList.map((p) => p.id),
      inactivePropertyIds: [],
      isSuperAdmin: true,
      missingPhone: false,
      propertiesMissingRoomCount: [],
    }
  }

  // 3. Query Property Subscriptions
  const propIds = propList.map((p) => p.id)
  const { data: subscriptions } = await supabaseAdmin
    .from('property_subscriptions')
    .select('property_id, status, end_date')
    .in('property_id', propIds.length > 0 ? propIds : ['00000000-0000-0000-0000-000000000000'])

  const activeIds: string[] = []
  const inactiveIds: string[] = []
  const missingRoomCount: string[] = []

  const now = new Date()

  for (const prop of propList) {
    if (prop.room_count === null) {
      missingRoomCount.push(prop.id)
    }

    const sub = (subscriptions || []).find((s) => s.property_id === prop.id)
    const isSubActive = sub?.status === 'active' && new Date(sub.end_date) > now

    if (isSubActive) {
      activeIds.push(prop.id)
    } else {
      inactiveIds.push(prop.id)
    }
  }

  // 4. Query Legacy Owner Subscriptions & Standalone Guest Hub Subscriptions
  const [legacySubRes, guestHubRes] = await Promise.all([
    owner?.id
      ? supabaseAdmin
          .from('owner_subscriptions')
          .select('status, end_date')
          .eq('owner_id', owner.id)
          .eq('status', 'active')
          .gt('end_date', now.toISOString())
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    owner?.id
      ? supabaseAdmin
          .from('guest_hub_settings')
          .select('id, subscription_status, subscription_end_date, properties!inner(owner_id)')
          .eq('properties.owner_id', owner.id)
          .eq('subscription_status', 'active')
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ])

  const hasLegacyActive = Boolean(legacySubRes.data?.status === 'active' && new Date(legacySubRes.data.end_date) > now)
  const hasGuestHubActive = Boolean(guestHubRes.data?.subscription_status === 'active' && (!guestHubRes.data.subscription_end_date || new Date(guestHubRes.data.subscription_end_date) > now))

  const missingPhone = !owner?.phone || owner.phone.trim().length === 0

  return {
    hasAccess: activeIds.length > 0 || hasLegacyActive || hasGuestHubActive,
    owner,
    properties: propList,
    activePropertyIds: activeIds,
    inactivePropertyIds: inactiveIds,
    isSuperAdmin: false,
    missingPhone,
    propertiesMissingRoomCount: missingRoomCount,
  }
}
