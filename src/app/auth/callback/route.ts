import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!sessionError && user) {
      // Ensure user has a default role if they signed up via OAuth
      if (!user.user_metadata?.role) {
        await supabase.auth.updateUser({
          data: { role: 'guest' }
        })
      }
      return NextResponse.redirect(`${origin}/auth/confirm-success`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
