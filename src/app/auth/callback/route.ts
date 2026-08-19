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
        const appUrl = `com.fixystays.myapp://auth/callback?code=${code}&next=${encodeURIComponent(finalNext)}`
        const webUrl = `${origin}${finalNext}`

        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <title>Redirecting to FixyStays...</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f9fafb;
                  color: #111827;
                  padding: 24px;
                  box-sizing: border-box;
                  text-align: center;
                }
                .card {
                  background: white;
                  padding: 36px 24px;
                  border-radius: 20px;
                  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(0, 0, 0, 0.04);
                  max-width: 420px;
                  width: 100%;
                }
                .logo {
                  font-size: 28px;
                  font-weight: 900;
                  color: #2563eb;
                  letter-spacing: -0.025em;
                  margin-bottom: 24px;
                }
                .loader {
                  border: 3px solid #f3f3f3;
                  border-top: 3px solid #2563eb;
                  border-radius: 50%;
                  width: 32px;
                  height: 32px;
                  animation: spin 0.8s linear infinite;
                  margin: 24px auto;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .title {
                  font-size: 20px;
                  font-weight: 700;
                  margin: 0 0 8px 0;
                }
                .desc {
                  color: #4b5563;
                  font-size: 14px;
                  line-height: 1.5;
                  margin: 0 0 24px 0;
                }
                .btn {
                  display: block;
                  background-color: #2563eb;
                  color: white;
                  padding: 14px 24px;
                  border-radius: 12px;
                  text-decoration: none;
                  font-weight: 700;
                  font-size: 14px;
                  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.12), 0 2px 4px -1px rgba(37, 99, 235, 0.08);
                  transition: all 0.2s;
                }
                .btn:hover {
                  background-color: #1d4ed8;
                  transform: translateY(-1px);
                }
                .btn:active {
                  transform: translateY(0);
                }
                .fallback {
                  margin-top: 24px;
                  padding-top: 20px;
                  border-top: 1px solid #f3f3f4;
                  font-size: 13px;
                  color: #6b7280;
                  font-weight: 500;
                }
                .fallback a {
                  color: #2563eb;
                  text-decoration: none;
                  font-weight: 700;
                }
                .fallback a:hover {
                  text-decoration: underline;
                }
              </style>
              <script>
                window.onload = function() {
                  window.location.href = "${appUrl}";
                }
              </script>
            </head>
            <body>
              <div class="card">
                <div class="logo">FixyStays</div>
                <h3 class="title">Opening FixyStays...</h3>
                <div class="loader"></div>
                <p class="desc">We're redirecting you back to the mobile app to securely finalize your login.</p>
                <a href="${appUrl}" class="btn">Open Mobile App</a>
                <div class="fallback">
                  Can't open the app? <a href="${webUrl}">Continue in browser</a>
                </div>
              </div>
            </body>
          </html>`,
          {
            headers: {
              'Content-Type': 'text/html',
            },
          }
        )
      }

      return NextResponse.redirect(`${origin}${finalNext}`)
    }
  }

  // return the user to an error page with instructions
  if (source === 'app') {
    const errorUrl = `com.fixystays.myapp://auth/auth-code-error`
    const webErrorUrl = `${origin}/auth/auth-code-error`

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f9fafb;
              color: #111827;
              padding: 24px;
              box-sizing: border-box;
              text-align: center;
            }
            .card {
              background: white;
              padding: 36px 24px;
              border-radius: 20px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(0, 0, 0, 0.04);
              max-width: 420px;
              width: 100%;
            }
            .logo {
              font-size: 28px;
              font-weight: 900;
              color: #dc2626;
              letter-spacing: -0.025em;
              margin-bottom: 24px;
            }
            .title {
              font-size: 20px;
              font-weight: 700;
              margin: 0 0 8px 0;
            }
            .desc {
              color: #4b5563;
              font-size: 14px;
              line-height: 1.5;
              margin: 0 0 24px 0;
            }
            .btn {
              display: block;
              background-color: #dc2626;
              color: white;
              padding: 14px 24px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 700;
              font-size: 14px;
              box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.12), 0 2px 4px -1px rgba(220, 38, 38, 0.08);
              transition: all 0.2s;
            }
            .btn:hover {
              background-color: #b91c1c;
              transform: translateY(-1px);
            }
            .fallback {
              margin-top: 24px;
              padding-top: 20px;
              border-top: 1px solid #f3f3f4;
              font-size: 13px;
              color: #6b7280;
              font-weight: 500;
            }
            .fallback a {
              color: #dc2626;
              text-decoration: none;
              font-weight: 700;
            }
          </style>
          <script>
            window.onload = function() {
              window.location.href = "${errorUrl}";
            }
          </script>
        </head>
        <body>
          <div class="card">
            <div class="logo">FixyStays</div>
            <h3 class="title">Authentication Failed</h3>
            <p class="desc">There was an issue verifying your login. Please try again.</p>
            <a href="${errorUrl}" class="btn">Return to App</a>
            <div class="fallback">
              Or <a href="${webErrorUrl}">view error in browser</a>
            </div>
          </div>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  }
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
