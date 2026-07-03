import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getActiveAccessToken } from '@/lib/google-drive'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 1. Authenticate user
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()

  try {
    // 2. Fetch owner's google credentials
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!owner) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    const currentAccessToken = await getActiveAccessToken(owner.id)
    if (!currentAccessToken) {
      return NextResponse.json({ error: 'Google tokens not found or expired for this owner' }, { status: 404 })
    }

    const { data: token } = await supabaseAdmin
      .from('owner_google_tokens')
      .select('*')
      .eq('owner_id', owner.id)
      .single()

    // 3. Search for files on Google Drive containing "Fixy" or "CheckIn"
    const query = "name contains 'Fixy' or name contains 'CheckIn'"
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents,owners,shared,webViewLink)&pageSize=50`,
      {
        headers: { Authorization: `Bearer ${currentAccessToken}` }
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: `Google API rejected request: ${response.status}`, details: errText })
    }

    const data = await response.json()
    return NextResponse.json({
      googleEmail: token.google_email,
      rootFolderId: token.root_folder_id,
      files: data.files || []
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
