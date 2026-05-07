import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Standardize default redirect to the home page (/)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!sessionError && user) {
      // 1. Dynamic Role Detection (Highest Priority)
      // Check if this email exists in owners or influencers table
      const { data: owner } = await supabase.from('owners').select('id').eq('email', user.email).maybeSingle()
      const { data: influencer } = await supabase.from('influencers').select('id').eq('email', user.email).maybeSingle()

      let role = user.user_metadata?.role
      
      // If metadata role is missing OR if we found a verified business role in DB, upgrade it
      if (!role || (owner && role !== 'owner') || (influencer && role !== 'influencer' && role !== 'owner')) {
        role = owner ? 'owner' : (influencer ? 'influencer' : 'guest')
        
        // Use admin client if needed or just public client if allowed (signup typically allows this)
        await supabase.auth.updateUser({
          data: { role }
        })
      }

      // 2. Redirect based on detected role if next is still home
      let finalNext = next
      if (next === '/') {
        if (role === 'owner') finalNext = '/dashboard/owner'
        else if (role === 'influencer') finalNext = '/dashboard/influencer'
      }

      return NextResponse.redirect(`${origin}${finalNext}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
