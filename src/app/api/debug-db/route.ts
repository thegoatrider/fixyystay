import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  
  // 1. Check Properties Table
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .limit(5)
  
  // 2. Check Storage
  const { data: files, error: storageError } = await supabase.storage
    .from('property_images')
    .list('', { limit: 10 })
    
  return NextResponse.json({
    properties,
    propError,
    files,
    storageError
  })
}
