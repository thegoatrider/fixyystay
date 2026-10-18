import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSuperAdminUser, getEffectiveUserRole } from '@/utils/supabase/auth-roles'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Server-trusted role verification
    const isSuperAdmin = isSuperAdminUser(user)
    const role = getEffectiveUserRole(user)

    if (request.nextUrl.pathname.startsWith('/dashboard/admin') && !isSuperAdmin) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    
    if (request.nextUrl.pathname.startsWith('/dashboard/owner') && role !== 'owner' && !isSuperAdmin) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (request.nextUrl.pathname.startsWith('/dashboard/influencer') && role !== 'influencer' && !isSuperAdmin) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (request.nextUrl.pathname.startsWith('/dashboard/police') && role !== 'police' && !isSuperAdmin) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Prevent logged in users from seeing login/signup
  if (
    user &&
    (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')
  ) {
    const isSuperAdmin = isSuperAdminUser(user)
    const role = getEffectiveUserRole(user)
    if (isSuperAdmin || role === 'admin') url.pathname = '/dashboard/admin'
    else if (role === 'police') url.pathname = '/dashboard/police'
    else if (role === 'owner') url.pathname = '/dashboard/owner'
    else if (role === 'influencer') url.pathname = '/dashboard/influencer'
    else if (role === 'autowala' || role === 'agent') url.pathname = '/dashboard/agent'
    else url.pathname = '/guest'
    
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
