import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Direct HTTP API route for uploading property photos.
 * Bypasses Next.js Server Action body parsing and avoids cryptic
 * "An error occurred in the Server Components render" framework exceptions on mobile.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 })
    }

    // Reject extremely large files that slipped through client compression
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size exceeds 12MB limit. Please select a smaller photo.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()
    const rawExt = file.name && file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const fileExt = (rawExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
    const fileName = `onboard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('property_images')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload/property-image] Storage error:', uploadError)
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('property_images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    })
  } catch (err: any) {
    console.error('[upload/property-image] Internal error:', err)
    return NextResponse.json(
      { error: err?.message || 'Server error while processing image upload.' },
      { status: 500 }
    )
  }
}
