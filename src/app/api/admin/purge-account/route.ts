import { NextResponse } from 'next/server'
import { purgeUserAndRecordsByEmail } from '@/utils/supabase/admin'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email query parameter is required (e.g. ?email=user@example.com)' }, { status: 400 })
    }

    const result = await purgeUserAndRecordsByEmail(email)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Purge API Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = body.email

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required in request body' }, { status: 400 })
    }

    const result = await purgeUserAndRecordsByEmail(email)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Purge API Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 })
  }
}
