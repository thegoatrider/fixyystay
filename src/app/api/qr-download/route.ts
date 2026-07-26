import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const filename = searchParams.get('filename') || 'qr-code.jpg'

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    // Generate a high quality 600x600 QR code in JPEG format
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=jpeg&qzone=2&data=${encodeURIComponent(url)}`
    
    const response = await fetch(qrApiUrl)
    if (!response.ok) {
      throw new Error('Failed to generate QR code')
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0'
      }
    })
  } catch (err: any) {
    console.error('QR Generator Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
