import { createClient } from '@/utils/supabase/server'
import { getGoogleAuthUrl } from '@/lib/google-drive'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Resolve current origin dynamically (supports dev and Vercel preview environments automatically)
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  try {
    const authUrl = getGoogleAuthUrl(origin)
    return NextResponse.redirect(authUrl)
  } catch (err: any) {
    console.error('Failed to initiate Google OAuth:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
