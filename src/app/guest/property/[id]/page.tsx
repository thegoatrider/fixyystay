import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PropertyDetailClient from './ClientWrapper'

export default async function PropertyDetailPage(
  props: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ ref?: string, checkin?: string, checkout?: string, guests?: string }>
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { ref: influencerRef, checkin, checkout, guests } = searchParams;
  
  const propertyId = params.id
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  const isLoggedIn = !!session

  const { data: property, error } = await supabase
    .from('properties')
    .select(`
      *,
      rooms (
        id,
        name,
        category,
        base_price,
        room_rates (date, price),
        room_availability (date, available),
        bookings (id, created_at)
      )
    `)
    .eq('id', propertyId)
    .single()

  if (error || !property || !property.approved) {
    redirect('/guest')
  }

  // Calculate specifically available rooms for today
  const todayStr = new Date().toISOString().split('T')[0]
  
  const availableRooms = []
  
  for (const room of property.rooms) {
    // Check if specifically blocked
    const availabilityToday = room.room_availability?.find((a: any) => a.date === todayStr)
    if (availabilityToday && !availabilityToday.available) continue
    
    // Check if already booked
    const bookingsToday = room.bookings?.filter((b: any) => {
      return new Date(b.created_at).toISOString().split('T')[0] === todayStr
    })
    if (bookingsToday && bookingsToday.length > 0) continue

    // Calculate current price
    const rateToday = room.room_rates?.find((r: any) => r.date === todayStr)
    const currentPrice = rateToday ? rateToday.price : room.base_price

    availableRooms.push({
      ...room,
      currentPrice
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/guest" className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Search
      </Link>
      
      <PropertyDetailClient 
        property={property} 
        availableRooms={availableRooms} 
        influencerId={influencerRef || null}
        initialCheckin={checkin || null}
        initialCheckout={checkout || null}
        initialGuests={guests || null}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}
