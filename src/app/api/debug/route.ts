import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('properties').select(`
      *,
      rooms (
        id,
        category,
        base_price,
        price_bucket,
        image_url,
        room_availability (date, available),
        bookings (*)
      )
    `).eq('approved', true).limit(5)
    return NextResponse.json({ data, error })
  } catch(e: any) {
    return NextResponse.json({ e: e.message })
  }
}
