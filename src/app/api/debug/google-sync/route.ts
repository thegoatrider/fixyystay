import { createClient } from '@/utils/supabase/server'
import { backupCheckinToGoogleDrive } from '@/lib/google-drive'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const checkinId = searchParams.get('checkin_id')

  if (!checkinId) {
    return NextResponse.json({ error: 'Missing checkin_id parameter' }, { status: 400 })
  }

  // 1. Authenticate requester
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Execute sync synchronously and return detailed trace
    const result = await backupCheckinToGoogleDrive(checkinId)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      checkinId,
      result
    })
  } catch (err: any) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      checkinId,
      error: err.message || 'Unknown error occurred during sync'
    }, { status: 500 })
  }
}
