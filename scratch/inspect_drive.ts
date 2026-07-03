import { createAdminClient } from '../src/utils/supabase/admin'
import * as fs from 'fs'

// Load .env.local manually
try {
  const envFile = fs.readFileSync('.env.local', 'utf8')
  envFile.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const value = parts.slice(1).join('=').replace(/^"|"$/g, '').trim()
      process.env[key] = value
    }
  })
} catch (e) {
  console.warn('Could not read .env.local file directly')
}

async function runInspect() {
  const supabase = createAdminClient()

  // 1. Fetch latest tokens record
  const { data: tokens, error: tokensError } = await supabase
    .from('owner_google_tokens')
    .select('*')
    .limit(1)

  if (tokensError || !tokens || tokens.length === 0) {
    console.error('No linked Google Drive tokens found in database:', tokensError)
    return
  }

  const token = tokens[0]
  console.log(`Inspecting Google Drive for connected owner ID: ${token.owner_id} (Google Email: ${token.google_email})`)

  let accessToken = token.access_token

  // 2. Query Google Drive to search for any files/folders matching 'Fixy Stays'
  console.log('\nSearching Google Drive files...')
  try {
    const query = "name contains 'Fixy' or name contains 'CheckIn'"
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents,owners,shared,webViewLink)&pageSize=30`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    if (!response.ok) {
      console.error(`Google API request failed: status ${response.status}`, await response.text())
      return
    }

    const data = await response.json()
    const files = data.files || []

    console.log(`Found ${files.length} matching items on Google Drive:`)
    files.forEach((file: any) => {
      console.log(`\n- Name: "${file.name}"`)
      console.log(`  ID: ${file.id}`)
      console.log(`  MimeType: ${file.mimeType}`)
      console.log(`  Parents: ${JSON.stringify(file.parents || [])}`)
      console.log(`  Owners: ${JSON.stringify(file.owners?.map((o: any) => o.emailAddress) || [])}`)
      console.log(`  Link: ${file.webViewLink}`)
    })

  } catch (err: any) {
    console.error('Error querying Google Drive API:', err)
  }
}

runInspect()
