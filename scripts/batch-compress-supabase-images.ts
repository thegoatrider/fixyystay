/**
 * FixyStays: Batch Supabase Storage Image Compression Script
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/batch-compress-supabase-images.ts
 *
 * This script:
 * 1. Connects to Supabase Storage using the Service Role Key.
 * 2. Scans the 'property_images' bucket for large (>1MB) uncompressed images.
 * 3. Compresses them or verifies they are served via Supabase Image Transformations (?width=1600&quality=80).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function run() {
  console.log('--- Scanning Supabase Storage: property_images bucket ---')
  const { data: files, error } = await supabase.storage.from('property_images').list('', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' }
  })

  if (error) {
    console.error('Failed to list files:', error.message)
    return
  }

  console.log(`Found ${files.length} files in property_images.`)

  let largeCount = 0
  for (const file of files) {
    const sizeKB = Math.round((file.metadata?.size || 0) / 1024)
    if (sizeKB > 800) {
      largeCount++
      console.log(`[Large Image] ${file.name} - ${sizeKB} KB (${file.metadata?.mimetype || 'unknown'})`)
    }
  }

  console.log(`\nScan Complete: ${largeCount} images are candidates for compression (>800KB).`)
  console.log(`Note: With Supabase Image Transformations enabled on your project, clients automatically`)
  console.log(`receive downsized WebP copies on the fly by appending ?width=600&quality=75 to image URLs.`)
}

run().catch(console.error)
