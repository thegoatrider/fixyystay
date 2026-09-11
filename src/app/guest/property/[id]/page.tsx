import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PropertyDetailClient from './ClientWrapper'
import { format, eachDayOfInterval, subDays, addDays } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(
  props: {
    params: Promise<{ id: string }>
  }
): Promise<Metadata> {
  const params = await props.params
  const propertyId = params.id
  const supabaseAdmin = createAdminClient()

  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('id, name, type, description, city, city_area, image_url, image_urls, amenities')
    .eq('id', propertyId)
    .maybeSingle()

  if (!property) {
    return {
      title: 'Property Not Found | Fixy Stays',
    }
  }

  const mainImage = property.image_url || (property.image_urls && property.image_urls.length > 0 ? property.image_urls[0] : null) || 'https://www.fixystays.com/logo.png'
  const locationText = property.city_area || property.city || 'India'
  const propertyTypeFormatted = property.type === 'villa' ? 'Luxury Villa' : 'Premium Stay'
  const title = `${property.name} - ${propertyTypeFormatted} in ${locationText} | Fixy Stays`
  const description = property.description 
    ? (property.description.length > 160 ? `${property.description.slice(0, 157)}...` : property.description)
    : `Checkout ${property.name} in ${locationText}. Amenities: ${(property.amenities || []).slice(0, 4).join(', ')}. Book now on Fixy Stays!`
  const url = `https://www.fixystays.com/guest/property/${property.id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Fixy Stays',
      type: 'website',
      images: [
        {
          url: mainImage,
          width: 1200,
          height: 630,
          alt: property.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [mainImage],
    },
    alternates: {
      canonical: url,
    },
  }
}

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
        bookings (*)
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
  
  const groupedRooms: Record<string, any> = {}
  
  for (const room of property.rooms) {
    const category = room.category || 'Standard'
    if (!groupedRooms[category]) {
      groupedRooms[category] = {
        name: room.name,
        category: category,
        base_price: room.base_price,
        image_url: room.image_url,
        image_urls: room.image_urls,
        roomIds: [],
        availableRoomIds: [],
        totalStayPrice: 0,
        count: 0
      }
    }

    let isRoomAvailable = true
    const isInRangeBlocked = room.room_availability?.some((a: any) => stayDates.includes(a.date) && !a.available)
    const hasOverlappingBooking = room.bookings?.some((b: any) => {
      if (!b.checkin_date || !b.checkout_date) return false
      const ci = checkin || stayDates[0]
      const co = checkout || format(addDays(new Date(ci), 1), 'yyyy-MM-dd')
      return b.checkin_date < co && b.checkout_date > ci
    })

    if (isInRangeBlocked || hasOverlappingBooking) {
      isRoomAvailable = false
    }

    let roomStayPrice = 0
    for (const dateStr of stayDates) {
      const rateRecord = room.room_rates?.find((r: any) => r.date === dateStr)
      roomStayPrice += rateRecord ? rateRecord.price : room.base_price
    }

    groupedRooms[category].roomIds.push(room.id)
    if (isRoomAvailable) {
      groupedRooms[category].availableRoomIds.push(room.id)
    }
    // We pick the price from the first room as representative
    if (groupedRooms[category].count === 0) {
      groupedRooms[category].totalStayPrice = roomStayPrice
    }
    groupedRooms[category].count++
  }

  const allRooms = Object.values(groupedRooms).map(cat => ({
    ...cat,
    id: cat.availableRoomIds[0] || cat.roomIds[0], // Representative ID for selection logic
    isAvailable: cat.availableRoomIds.length > 0,
    currentPrice: cat.totalStayPrice
  }))

  return (
    <div className="flex flex-col gap-6">
      <Link href="/guest" className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Search
      </Link>
      
      <PropertyDetailClient 
        property={property} 
        availableRooms={allRooms} 
        influencerId={influencerRef || null}
        initialCheckin={checkin || null}
        initialCheckout={checkout || null}
        initialGuests={guests || null}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}
