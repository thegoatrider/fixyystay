type UserLike = {
  id?: string
  email?: string | null
  app_metadata?: Record<string, any>
  user_metadata?: Record<string, any>
} | null | undefined

/**
 * Checks if a user has admin privileges based on app_metadata, user_metadata, or superadmin email.
 */
export function isSuperAdminUser(user: UserLike): boolean {
  if (!user) return false
  const email = (user.email || '').toLowerCase().trim()
  if (email === 'superadmin@fixstay.com' || email === 'superadmin@fixystays.com') return true

  const appRole = (user.app_metadata?.role || '').toLowerCase()
  if (appRole === 'admin' || appRole === 'superadmin') return true

  const userRole = (user.user_metadata?.role || '').toLowerCase()
  if (userRole === 'admin' || userRole === 'superadmin') return true

  return false
}

/**
 * Returns the effective user role.
 * Accurately returns 'admin' when the user has admin privileges.
 */
export function getEffectiveUserRole(user: UserLike): string {
  if (!user) return 'guest'
  if (isSuperAdminUser(user)) return 'admin'

  const appRole = user.app_metadata?.role
  if (appRole) return appRole

  const rawRole = user.user_metadata?.role
  return rawRole || 'guest'
}
