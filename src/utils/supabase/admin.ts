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
