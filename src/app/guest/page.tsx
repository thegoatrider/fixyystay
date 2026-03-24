import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import { format, eachDayOfInterval, subDays, isSameDay } from 'date-fns'

// Note: To determine "real-time room inventory" we conceptually check if a property has at least 1 room
// that isn't completely blocked or booked out. Given the constraints, a simple query 
// checks if the property is approved and has rooms. For availability, we fetch properties and perform filtering.
export default async function GuestBrowsePage(props: { searchParams: Promise<{ bucket?: string, checkin?: string, checkout?: string, guests?: string }> }) {
  const searchParams = await props.searchParams;
  const { bucket: selectedBucket, checkin, checkout, guests } = searchParams;
  
  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const combined = { bucket: selectedBucket, checkin, checkout, guests, ...newParams }
    const urlParams = new URLSearchParams()
    Object.entries(combined).forEach(([key, value]) => {
      if (value) urlParams.set(key, value)
    })
    return `/guest?${urlParams.toString()}`
  }

  const buildPropertyUrl = (id: string) => {
    const urlParams = new URLSearchParams()
    if (checkin) urlParams.set('checkin', checkin)
    if (checkout) urlParams.set('checkout', checkout)
    if (guests) urlParams.set('guests', guests)
    const qs = urlParams.toString()
    return `/guest/property/${id}${qs ? `?${qs}` : ''}`
  }

  const supabase = await createClient()

  // Find approved properties and their rooms
  const { data: properties, error } = await supabase
    .from('properties')
    .select(`
      *,
      rooms (
        id,
        category,
        base_price,
        price_bucket,
        image_url,
        room_availability (date, available),
        bookings (id, created_at)
      )
    `)
    .eq('approved', true)

  const { data: { user } } = await supabase.auth.getUser()
  const isInfluencer = user?.user_metadata?.role === 'influencer'

  // Prepare simple helper for image fallbacks
  const getPropImage = (prop: any) => {
    if (prop.image_urls && prop.image_urls.length > 0) return prop.image_urls[0];
    if (prop.image_url) return prop.image_url;
    if (prop.rooms && prop.rooms.length > 0) {
      const roomWithImg = prop.rooms.find((r: any) => r.image_url);
      if (roomWithImg) return roomWithImg.image_url;
    }
    return null;
  };

  // Filter properties logic: available_rooms > 0
  const stayDates = checkin && checkout 
    ? eachDayOfInterval({ 
        start: new Date(checkin), 
        end: subDays(new Date(checkout), 1) // stay ends morning of checkout
      }).map(d => format(d, 'yyyy-MM-dd'))
    : [format(new Date(), 'yyyy-MM-dd')] // default to today only

  let availableProperties = properties?.map(prop => {
    let available_rooms = 0

    prop.rooms.forEach((room: any) => {
      // For each room, it must be available for ALL stayDates
      const isRoomAvailable = stayDates.every(dateStr => {
        // 1. Check if specifically blocked
        const availabilityRecord = room.room_availability?.find((a: any) => a.date === dateStr)
        if (availabilityRecord && !availabilityRecord.available) return false
        
        // 2. Check if already booked
        // (Note: This is a simplification; in a real app bookings might have start/end dates)
        // Here we assume bookings track specific check-in dates.
        const bookingsOnDate = room.bookings?.filter((b: any) => {
          return format(new Date(b.created_at), 'yyyy-MM-dd') === dateStr
        })
        if (bookingsOnDate && bookingsOnDate.length > 0) return false

        return true
      })

      if (isRoomAvailable) available_rooms++
    })

    return {
      ...prop,
      available_rooms
    }
  }).filter(p => p.available_rooms > 0) || []

  // Apply Price Bucket Filter or See All Types
  if (selectedBucket === 'See All Rooms') {
    availableProperties = availableProperties.filter(prop => prop.type === 'multi-room property')
  } else if (selectedBucket === 'See All Villas') {
    availableProperties = availableProperties.filter(prop => prop.type === 'villa')
  } else if (selectedBucket) {
    availableProperties = availableProperties.filter(prop =>
      prop.rooms.some((r: any) => r.price_bucket === selectedBucket)
    )
  } else {
    // No bucket selected — show only featured properties on homepage
    availableProperties = availableProperties.filter(p => p.featured)
  }

  const roomBuckets = ['₹799', '₹999', '₹1299', '₹1499', '₹1999', '₹2499', '₹2999', '₹3499', '₹3999', '₹6999', 'See All Rooms']
  const villaBuckets = ['₹4999', '₹7999', '₹9999', '₹14999', '₹19999', '₹24999', '₹29999', '₹39999', '₹49999', 'See All Villas']

  // Group by area — only when a specific price bucket is active (not See All)
  const propertiesByArea: Record<string, typeof availableProperties> = {}
  if (selectedBucket && selectedBucket !== 'See All Rooms' && selectedBucket !== 'See All Villas') {
    availableProperties.forEach(prop => {
      const area = prop.city_area || 'Other'
      if (!propertiesByArea[area]) propertiesByArea[area] = []
      propertiesByArea[area].push(prop)
    })
  }
  const sortedAreas = Object.keys(propertiesByArea).sort()

  // Shared card component (inline)
  const PropertyCard = (prop: any) => (
    <Link href={buildPropertyUrl(prop.id)} key={prop.id} className="group flex flex-col bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="h-56 bg-gradient-to-tr from-blue-100 to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
        {getPropImage(prop) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getPropImage(prop)} alt={prop.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <span className="text-5xl relative z-10 group-hover:scale-110 transition-transform duration-300">🏨</span>
        )}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-blue-800 shadow-sm">
          {prop.type}
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{prop.name}</h3>
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {prop.city_area || 'Alibag Region'}
        </p>
        <p className="text-gray-500 text-sm line-clamp-2 mb-6 leading-relaxed">{prop.description}</p>
        <div className="mt-auto flex justify-between items-end pt-4 border-t border-gray-100">
          <div className="text-sm font-medium text-gray-500">
            {prop.type === 'villa' ? 'Entire Villa' : `${prop.available_rooms} Rooms`}
          </div>
          <div className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100/50">
            {prop.type === 'villa' ? 'Bookable' : `${prop.available_rooms} Available`}
          </div>
        </div>
      </div>
    </Link>
  )

  return (
    <div className="flex flex-col gap-10">
      
      {/* Price Bucket Filters */}
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center justify-between">
            Rooms under
            {selectedBucket && <Link href="/guest" className="text-sm font-normal text-blue-600 hover:underline">Clear filter</Link>}
          </h3>
          <div className="flex flex-wrap gap-3">
            {roomBuckets.map(b => (
              <Link key={b} href={buildUrl({ bucket: b })}
                className={`px-6 py-2 rounded-xl border font-medium text-sm transition-all ${selectedBucket === b ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900 hover:text-gray-900'}`}
              >{b}</Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Villas under</h3>
          <div className="flex flex-wrap gap-3">
            {villaBuckets.map(b => (
              <Link key={b} href={buildUrl({ bucket: b })}
                className={`px-6 py-2 rounded-xl border font-medium text-sm transition-all ${selectedBucket === b ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900 hover:text-gray-900'}`}
              >{b}</Link>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Star className="text-yellow-500" />
          {selectedBucket ? `Properties under ${selectedBucket}` : 'Featured Properties'}
        </h2>

        {availableProperties.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
            <p className="text-gray-500 text-lg">No properties found matching your selection.</p>
            {selectedBucket && (
              <Link 
                href={buildUrl({ bucket: roomBuckets.includes(selectedBucket) ? 'See All Rooms' : 'See All Villas' })} 
                className="inline-block mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
              >
                Show all {roomBuckets.includes(selectedBucket) ? 'rooms' : 'villas'}
              </Link>
            )}
          </div>
        ) : selectedBucket && selectedBucket !== 'See All Rooms' && selectedBucket !== 'See All Villas' ? (
          /* Grouped by area when bucket is active */
          <div className="flex flex-col gap-10">
            {sortedAreas.map(area => (
              <div key={area}>
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <h3 className="text-xl font-bold text-gray-800">{area}</h3>
                  <span className="text-sm text-gray-400 font-medium">
                    {propertiesByArea[area].length} {propertiesByArea[area].length === 1 ? 'property' : 'properties'}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {propertiesByArea[area].map(prop => PropertyCard(prop))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat grid when no bucket selected */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableProperties.map(prop => PropertyCard(prop))}
          </div>
        )}
      </div>
    </div>
  )
}
