import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations and must not fall back to anon key.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options = {}) =>
        fetch(url, {
          ...options,
          cache: 'no-store',
        }),
    },
  });
}

/**
 * Robust paginated lookup to find an auth user across all pages in Supabase auth.users.
 * Default listUsers() only returns 50 users on page 1, which causes lookups to fail
 * when databases grow beyond 50 users.
 */
export async function findAuthUserByEmail(supabaseAdmin: any, email: string) {
  if (!email) return null
  const target = email.toLowerCase().trim()
  let page = 1
  const perPage = 1000
  while (page <= 25) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error || !data?.users || data.users.length === 0) {
      break
    }
    const found = data.users.find(
      (u: any) => u.email?.toLowerCase().trim() === target
    )
    if (found) return found
    if (!data.nextPage || data.users.length < perPage) break
    page++
  }
  return null
}

/**
 * Purges an email ID, its auth user record, and all associated owner, property,
 * subscription, payment, and influencer records completely from Supabase.
 */
export async function purgeUserAndRecordsByEmail(email: string) {
  const supabaseAdmin = createAdminClient()
  const targetEmail = (email || '').toLowerCase().trim()
  if (!targetEmail) {
    return { success: false, error: 'Email is required' }
  }

  const report = {
    email: targetEmail,
    auth_users_deleted: 0,
    owners_deleted: 0,
    properties_deleted: 0,
    subscriptions_deleted: 0,
    payments_deleted: 0,
    influencers_deleted: 0,
  }

  // 1. Locate auth user(s)
  const userIds: string[] = []
  const authUser = await findAuthUserByEmail(supabaseAdmin, targetEmail)
  if (authUser?.id) {
    userIds.push(authUser.id)
  }

  // 2. Locate owners by email or user_id
  const { data: ownersByEmail } = await supabaseAdmin
    .from('owners')
    .select('id, user_id')
    .ilike('email', targetEmail)

  const ownerIds = new Set<string>()
  ownersByEmail?.forEach((o: any) => {
    ownerIds.add(o.id)
    if (o.user_id && !userIds.includes(o.user_id)) userIds.push(o.user_id)
  })

  for (const uid of userIds) {
    const { data: ownersByUid } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', uid)
    ownersByUid?.forEach((o: any) => ownerIds.add(o.id))
  }

  const ownerIdList = Array.from(ownerIds)

  // 3. For all owners, clean up properties and related cascade tables
  if (ownerIdList.length > 0) {
    // Collect properties
    const { data: props } = await supabaseAdmin
      .from('properties')
      .select('id')
      .in('owner_id', ownerIdList)
    
    const propIds = (props || []).map((p: any) => p.id)

    if (propIds.length > 0) {
      await supabaseAdmin.from('guest_hub_settings').delete().in('property_id', propIds)
      await supabaseAdmin.from('leads').delete().in('property_id', propIds)
      await supabaseAdmin.from('property_rooms').delete().in('property_id', propIds)
      await supabaseAdmin.from('rooms').delete().in('property_id', propIds)
      const { count: propCount } = await supabaseAdmin.from('properties').delete({ count: 'exact' }).in('id', propIds)
      report.properties_deleted = propCount || propIds.length
    }

    // Delete subscriptions
    const { count: subCount } = await supabaseAdmin.from('owner_subscriptions').delete({ count: 'exact' }).in('owner_id', ownerIdList)
    report.subscriptions_deleted = subCount || 0

    // Delete payments
    const { count: payCount } = await supabaseAdmin.from('owner_payments').delete({ count: 'exact' }).in('owner_id', ownerIdList)
    report.payments_deleted = payCount || 0

    // Delete auxiliary owner records
    await supabaseAdmin.from('whatsapp_accounts').delete().in('owner_id', ownerIdList)
    await supabaseAdmin.from('campaigns').delete().in('owner_id', ownerIdList)
    await supabaseAdmin.from('property_employees').delete().in('owner_id', ownerIdList)
    await supabaseAdmin.from('support_messages').delete().in('owner_id', ownerIdList)
    await supabaseAdmin.from('owner_google_tokens').delete().in('owner_id', ownerIdList)

    // Delete owners
    const { count: ownCount } = await supabaseAdmin.from('owners').delete({ count: 'exact' }).in('id', ownerIdList)
    report.owners_deleted = ownCount || ownerIdList.length
  }

  // 4. Delete influencer records
  const { count: infCount } = await supabaseAdmin.from('influencers').delete({ count: 'exact' }).ilike('email', targetEmail)
  report.influencers_deleted = infCount || 0

  for (const uid of userIds) {
    await supabaseAdmin.from('influencers').delete().eq('user_id', uid)
    await supabaseAdmin.from('profiles').delete().eq('id', uid)
    await supabaseAdmin.from('user_push_tokens').delete().eq('user_id', uid)
  }

  // 5. Delete Supabase auth user(s)
  for (const uid of userIds) {
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(uid)
    if (!delErr) {
      report.auth_users_deleted++
    }
  }

  // Double check if any auth user still remains with target email
  const remainingAuth = await findAuthUserByEmail(supabaseAdmin, targetEmail)
  if (remainingAuth?.id) {
    await supabaseAdmin.auth.admin.deleteUser(remainingAuth.id)
    report.auth_users_deleted++
  }

  return { success: true, report }
}
