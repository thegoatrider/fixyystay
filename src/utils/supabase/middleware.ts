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

  // Fast short-circuit: if no Supabase auth token cookie exists, skip remote 250ms auth call
  const allCookies = request.cookies.getAll()
  const hasAuthToken = allCookies.some(c => c.name.includes('-auth-token') || (c.name.startsWith('sb-') && c.name.includes('token')))

  let user = null
  if (hasAuthToken) {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  }

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

  if (user) {
    request.headers.set('x-user-id', user.id)
    request.headers.set('x-user-email', user.email || '')
    request.headers.set('x-user-role', getEffectiveUserRole(user))
    request.headers.set('x-is-admin', String(isSuperAdminUser(user)))
    supabaseResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

  return supabaseResponse
}
