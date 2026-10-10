import { NextResponse } from 'next/server'
import { lookupIndianPincode } from '@/lib/india-locations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const result = await lookupIndianPincode(code)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to detect location' },
      { status: 500 }
    )
  }
}
