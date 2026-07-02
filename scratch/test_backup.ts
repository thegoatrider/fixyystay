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

async function runDiagnostics() {
  const supabase = createAdminClient()

  console.log('--- DIAGNOSTICS START ---')

  // 1. Fetch all owner_google_tokens records
  const { data: tokens, error: tokensError } = await supabase
    .from('owner_google_tokens')
    .select('*')
  
  if (tokensError) {
    console.error('Error fetching owner_google_tokens:', tokensError)
  } else {
    console.log(`\nFound ${tokens.length} records in owner_google_tokens:`)
    tokens.forEach((t: any) => {
      console.log(`- Owner ID: ${t.owner_id}, Email: ${t.google_email}, Has Access Token: ${!!t.access_token}, Has Refresh Token: ${!!t.refresh_token}`)
    })
  }

  // 2. Fetch all owners records
  const { data: owners, error: ownersError } = await supabase
    .from('owners')
    .select('id, email, user_id')

  if (ownersError) {
    console.error('Error fetching owners:', ownersError)
  } else {
    console.log(`\nFound ${owners.length} records in owners:`)
    owners.forEach((o: any) => {
      console.log(`- Owner ID: ${o.id}, Email: ${o.email}, Auth User ID (user_id): ${o.user_id}`)
    })
  }

  // 3. Fetch latest guest checkins
  const { data: checkins, error: checkinsError } = await supabase
    .from('guest_checkins')
    .select('id, guest_name, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (checkinsError) {
    console.error('Error fetching guest_checkins:', checkinsError)
  } else {
    console.log(`\nLatest 5 check-ins in guest_checkins:`)
    checkins.forEach((c: any) => {
      console.log(`- Check-in ID: ${c.id}, Guest: ${c.guest_name}, Owner ID: ${c.owner_id}, Created At: ${c.created_at}`)
    })
  }

  console.log('\n--- DIAGNOSTICS END ---')
}

runDiagnostics()
