import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function run() {
  const { data, error } = await supabase.from('owner_google_tokens').select('*')
  if (error) {
    console.error('Error fetching tokens:', error)
  } else {
    console.log(JSON.stringify(data, null, 2))
  }
}

run()
