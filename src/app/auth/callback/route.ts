import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Standardize default redirect to the home page (/)
  const next = searchParams.get('next') ?? '/'
  const source = searchParams.get('source')

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!sessionError && user) {
      // 1. Dynamic Role Detection (Highest Priority)
      // 1. Check if this email exists in owners or influencers table
      const normalizedEmail = user.email ? user.email.toLowerCase() : ''
      const supabaseAdmin = createAdminClient()
      const { data: owner } = await supabaseAdmin.from('owners').select('id, user_id').eq('email', normalizedEmail).maybeSingle()
      const { data: influencer } = await supabaseAdmin.from('influencers').select('id, user_id').eq('email', normalizedEmail).maybeSingle()

      if (owner && owner.user_id !== user.id) {
        await supabaseAdmin.from('owners').update({ user_id: user.id }).eq('id', owner.id)
      }
      if (influencer && influencer.user_id !== user.id) {
        await supabaseAdmin.from('influencers').update({ user_id: user.id }).eq('id', influencer.id)
      }

      let role = user.user_metadata?.role
      
      // If metadata role is missing OR if we found a verified business role in DB, upgrade it
      if (!role || (owner && role !== 'owner') || (influencer && role !== 'influencer' && role !== 'owner')) {
        role = owner ? 'owner' : (influencer ? 'influencer' : 'guest')
        
        // Use admin client if needed or just public client if allowed (signup typically allows this)
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: { role }
        })
      }

      // 2. Redirect based on detected role if next is still home
      let finalNext = next
      if (next === '/') {
        if (role === 'owner') finalNext = '/dashboard/owner'
        else if (role === 'influencer') finalNext = '/dashboard/influencer'
      }

      if (source === 'app') {
        return NextResponse.redirect(`com.fixystays.myapp://auth/callback?code=${code}&next=${encodeURIComponent(finalNext)}`)
      }

      return NextResponse.redirect(`${origin}${finalNext}`)
    }
  }

  // return the user to an error page with instructions
  if (source === 'app') {
    return NextResponse.redirect(`com.fixystays.myapp://auth/auth-code-error`)
  }
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
