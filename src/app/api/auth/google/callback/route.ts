import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { exchangeAuthCode, getGoogleEmail } from '@/lib/google-drive'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Redirection back to owner profile/settings page
  const profileUrl = new URL('/dashboard/owner/profile', request.url)

  if (error) {
    console.error('Google OAuth callback returned error:', error)
    profileUrl.searchParams.set('google_sync', 'error')
    profileUrl.searchParams.set('reason', error)
    return NextResponse.redirect(profileUrl)
  }

  if (!code) {
    console.error('Google OAuth callback missing authorization code')
    profileUrl.searchParams.set('google_sync', 'error')
    profileUrl.searchParams.set('reason', 'no_code')
    return NextResponse.redirect(profileUrl)
  }

  // 1. Get logged-in owner's user session
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabaseAdmin = createAdminClient()

  try {
    // 2. Fetch corresponding public.owners.id
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (ownerError || !owner) {
      throw new Error('Owner record not found')
    }

    // 3. Exchange auth code for Google credentials
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const origin = `${protocol}://${host}`

    const tokenData = await exchangeAuthCode(code, origin)
    
    // Ensure we received a refresh token (only returned during the first consent flow)
    if (!tokenData.refresh_token) {
      console.warn('[GOOGLE-CALLBACK] Warning: No refresh token returned. Re-authorization may be required.')
    }

    // 4. Retrieve owner Google account email address
    const googleEmail = await getGoogleEmail(tokenData.access_token)

    // Calculate token expiration timestamp
    const expiryDate = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000)

    // 5. Store Google credentials in database
    const tokenRecord: any = {
      owner_id: owner.id,
      access_token: tokenData.access_token,
      expiry_date: expiryDate.toISOString(),
      google_email: googleEmail,
      updated_at: new Date().toISOString()
    }

    // Only set refresh_token if Google returned it (protects existing refresh_token from being overwritten with null)
    if (tokenData.refresh_token) {
      tokenRecord.refresh_token = tokenData.refresh_token
    }

    const { error: upsertError } = await supabaseAdmin
      .from('owner_google_tokens')
      .upsert(tokenRecord, { onConflict: 'owner_id' })

    if (upsertError) {
      throw upsertError
    }

    console.log(`[GOOGLE-CALLBACK] Google Drive successfully linked for owner ${owner.id} (Email: ${googleEmail})`)
    profileUrl.searchParams.set('google_sync', 'success')
    return NextResponse.redirect(profileUrl)

  } catch (err: any) {
    console.error('[GOOGLE-CALLBACK] Critical callback exception:', err)
    profileUrl.searchParams.set('google_sync', 'error')
    profileUrl.searchParams.set('reason', err.message || 'unknown_callback_error')
    return NextResponse.redirect(profileUrl)
  }
}
