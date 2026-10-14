type UserLike = {
  id?: string
  email?: string | null
  app_metadata?: Record<string, any>
  user_metadata?: Record<string, any>
} | null | undefined

/**
 * Checks if a user has admin privileges based on server-trusted app_metadata or superadmin email.
 * Never trusts user_metadata.role because user_metadata is client-writable in Supabase.
 */
export function isSuperAdminUser(user: UserLike): boolean {
  if (!user) return false
  const email = (user.email || '').toLowerCase().trim()
  if (email === 'superadmin@fixstay.com') return true

  const role = user.app_metadata?.role
  return role === 'admin' || role === 'superadmin'
}

/**
 * Returns the effective user role.
 * Trusts app_metadata.role if present; falls back to user_metadata.role only for non-admin roles (e.g. 'owner', 'influencer', 'guest').
 * Never allows a user_metadata.role of 'admin' or 'superadmin' to grant admin privileges.
 */
export function getEffectiveUserRole(user: UserLike): string {
  if (!user) return 'guest'
  if (isSuperAdminUser(user)) return 'admin'

  const appRole = user.app_metadata?.role
  if (appRole) return appRole

  const rawRole = user.user_metadata?.role
  // Disallow privilege escalation via client-writable user_metadata
  if (rawRole === 'admin' || rawRole === 'superadmin') {
    return 'guest'
  }
  return rawRole || 'guest'
}
