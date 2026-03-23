import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PropertyDetailClient from './ClientWrapper'
import { format, eachDayOfInterval, subDays } from 'date-fns'

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

  // Calculate stay dates
  const stayDates = checkin && checkout 
    ? eachDayOfInterval({ 
        start: new Date(checkin), 
        end: subDays(new Date(checkout), 1) 
      }).map(d => format(d, 'yyyy-MM-dd'))
    : [format(new Date(), 'yyyy-MM-dd')]
  
  const availableRooms = []
  
  for (const room of property.rooms) {
    let totalStayPrice = 0
    let isRoomAvailable = true

    for (const dateStr of stayDates) {
      // 1. Check if specifically blocked
      const availabilityRecord = room.room_availability?.find((a: any) => a.date === dateStr)
      if (availabilityRecord && !availabilityRecord.available) {
        isRoomAvailable = false
        break
      }
      
      // 2. Check if already booked
      const bookingsOnDate = room.bookings?.filter((b: any) => {
        return format(new Date(b.created_at), 'yyyy-MM-dd') === dateStr
      })
      if (bookingsOnDate && bookingsOnDate.length > 0) {
        isRoomAvailable = false
        break
      }

      // 3. Accumulate Price
      const rateRecord = room.room_rates?.find((r: any) => r.date === dateStr)
      totalStayPrice += rateRecord ? rateRecord.price : room.base_price
    }

    if (isRoomAvailable) {
      availableRooms.push({
        ...room,
        currentPrice: totalStayPrice // Total for the stay
      })
    }
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
