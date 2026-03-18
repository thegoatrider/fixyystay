import { createAdminClient } from './src/utils/supabase/admin'

async function debug() {
  const supabase = createAdminClient()
  
  // Try to get one property and print all its keys
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error fetching property:', error)
    return
  }
  
  if (!data || data.length === 0) {
    console.log('No properties found in database.')
    return
  }

  const p = data[0]
  console.log('--- Property Debug ---')
  console.log('ID:', p.id)
  console.log('Name:', p.name)
  console.log('Columns found in record:', Object.keys(p).join(', '))
  console.log('image_url value:', p.image_url)
  console.log('image_urls value:', JSON.stringify(p.image_urls))
  console.log('----------------------')
}

debug()
