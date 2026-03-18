import { createAdminClient } from './src/utils/supabase/admin'

async function debugStorage() {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.storage
    .from('property_images')
    .list('', { limit: 10 })
  
  if (error) {
    console.error('Error listing storage:', error)
    return
  }
  
  console.log('--- Storage Debug ---')
  console.log('Files found in bucket:', data?.length || 0)
  data?.forEach(f => {
    console.log(`- ${f.name} (${f.metadata?.size} bytes)`)
  })
  console.log('----------------------')
}

debugStorage()
