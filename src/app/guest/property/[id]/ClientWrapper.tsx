'use client'

import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { logClick, bookRoom } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, User, Phone, CheckCircle } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

// Simple client wrapper for logging click
function ClickTracker({ propertyId, refId }: { propertyId: string, refId: string }) {
  useEffect(() => {
    if (refId) {
      logClick(propertyId, refId)
    }
  }, [propertyId, refId])
  return null
}

export default function PropertyDetailClient({ 
  property, 
  availableRooms, 
  influencerId,
  initialCheckin,
  initialCheckout,
  initialGuests,
  isLoggedIn
}: { 
  property: any, 
  availableRooms: any[], 
  influencerId: string | null,
  initialCheckin: string | null,
  initialCheckout: string | null,
  initialGuests: string | null,
  isLoggedIn: boolean
}) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(availableRooms[0]?.id || '')
  const [checkin, setCheckin] = useState(initialCheckin || '')
  const [checkout, setCheckout] = useState(initialCheckout || '')
  const [guests, setGuests] = useState(initialGuests || '2')
  const [activeImage, setActiveImage] = useState<string | null>(null)
  
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const confirmed = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]')
    if (confirmed.includes(property.id)) {
      setIsConfirmed(true)
    }
  }, [property.id])

  const selectedRoom = availableRooms.find(r => r.id === selectedRoomId)
  
  // Real pricing would consider dates. Here we just take today's price or base price.
  const roomPrice = selectedRoom?.currentPrice || selectedRoom?.base_price || 0

  // Guest count pricing
  const maxGuests: number = property.max_guests || 0
  const extraPerPax: number = property.extra_per_pax || 0
  const guestCount = parseInt(guests) || 2
  const extraGuests = maxGuests > 0 && guestCount > maxGuests ? guestCount - maxGuests : 0
  const extraCharge = extraGuests * extraPerPax
  const totalPrice = roomPrice + extraCharge

  async function handleBook(formData: FormData) {
    if (!selectedRoomId) return
    setIsLoading(true)
    setError(null)
    
    const guestName = formData.get('guestName') as string
    const guestPhone = formData.get('guestPhone') as string

    try {
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          propertyName: property.name,
          roomId: selectedRoomId,
          roomName: selectedRoom?.name,
          guestName,
          guestPhone,
          influencerId: influencerId || null,
          amount: roomPrice
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white p-12 rounded-xl border border-green-200 text-center flex flex-col items-center gap-4 max-w-lg mx-auto mt-12 shadow-sm">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
        <p className="text-gray-600">Your room at {property.name} has been successfully booked.</p>
        <Button onClick={() => window.location.href='/guest'} className="mt-4">
          Browse More Properties
        </Button>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-[1fr_400px] gap-8">
      {influencerId && <ClickTracker propertyId={property.id} refId={influencerId} />}
      
      {/* Property Details */}
      <div className="flex flex-col gap-6">
        {/* Main Image Gallery */}
        <div className="flex flex-col gap-3">
          <div className="h-[400px] bg-gray-100 rounded-3xl overflow-hidden shadow-sm relative group border-2 border-white ring-1 ring-gray-100">
            {/* Logic to determine main image and gallery images */}
            {(() => {
              const propImages = property.image_urls || []
              const roomImages = property.rooms?.map((r: any) => r.image_url).filter(Boolean) || []
              const allImages = [...propImages, ...roomImages]
              const mainImg = activeImage || allImages[0] || property.image_url
              
              if (mainImg) {
                return (
                  <img 
                    src={mainImg} 
                    alt={property.name} 
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" 
                  />
                )
              }
              return <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">🏨</div>
            })()}
            
            {/* Overlay Tag */}
            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-blue-900 shadow-xl border border-white">
              {property.type}
            </div>
          </div>

          {/* Thumbnails */}
          {(() => {
            const propImages = property.image_urls || []
            const roomImages = property.rooms?.map((r: any) => r.image_url).filter(Boolean) || []
            const allImages = [...new Set([...propImages, ...roomImages])] // Unique images
            
            if (allImages.length > 1) {
              return (
                <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                  {allImages.map((url: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(url)}
                      className={cn(
                        "relative w-24 h-20 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 border-2",
                        (activeImage === url || (!activeImage && i === 0)) 
                          ? "border-blue-600 ring-4 ring-blue-50 scale-95 shadow-lg" 
                          : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"
                      )}
                    >
                      <img src={url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                      <div className={cn(
                        "absolute inset-0 transition-colors",
                        (activeImage === url || (!activeImage && i === 0)) ? "bg-transparent" : "bg-black/10 group-hover:bg-transparent"
                      )} />
                    </button>
                  ))}
                </div>
              )
            }
            return null
          })()}
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">{property.type}</div>
              <h1 className="text-3xl font-extrabold text-gray-900">{property.name}</h1>
            </div>
          </div>
          <p className="text-gray-600 text-lg leading-relaxed mb-6">
            {property.description}
          </p>
          
          <h3 className="font-bold text-lg mb-3">Amenities</h3>
          <div className="flex flex-wrap gap-2 mb-8">
            {property.amenities?.map((amenity: String, i: number) => (
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                {amenity}
              </span>
            ))}
          </div>

          <div className="border-t pt-6">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <MapPin className="text-red-500 w-5 h-5" /> Location
            </h3>
            {isConfirmed ? (
              <div>
                <p className="text-gray-700 font-medium mb-2">{property.city_area}</p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline bg-blue-50 px-4 py-2 rounded-lg border border-blue-100"
                >
                  <MapPin className="w-4 h-4" /> Open Precise Location on Google Maps
                </a>
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed rounded-xl p-4">
                <p className="text-gray-900 font-bold mb-1 uppercase text-xs tracking-wider opacity-50">Rough Area</p>
                <p className="text-gray-700 text-lg mb-3">{property.city_area || 'Location details restricted'}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/50 p-2 rounded-lg italic">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Precise location will be shared automatically after booking confirmation.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Form Sidebar */}
      <div className="bg-white p-6 rounded-xl border shadow-lg sticky top-24 h-fit">
        <h2 className="text-2xl font-bold mb-6">Book your Stay</h2>

        {availableRooms.length === 0 ? (
          <div className="p-4 bg-orange-50 text-orange-800 rounded-lg text-sm border border-orange-200">
            Sorry, no rooms are currently available for this property.
          </div>
        ) : !isLoggedIn ? (
          <div className="flex flex-col gap-6 items-center text-center p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-gray-900">Sign in to Book</h3>
              <p className="text-sm text-gray-600">You need to be logged in to make a reservation.</p>
            </div>
            <Button 
              onClick={() => window.location.href=`/login?role=guest&next=/guest/property/${property.id}`}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg shadow-md"
            >
              Login to Book
            </Button>
            <p className="text-xs text-gray-400">
              New to FixStay? <Link href={`/signup?role=guest&next=/guest/property/${property.id}`} className="text-blue-600 hover:underline">Create an account</Link>
            </p>
          </div>
        ) : (
          <form action={handleBook} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label>Available Room Types</Label>
              <div className="flex flex-col gap-3">
                {availableRooms.map(room => (
                  <label
                    key={room.id}
                    className={`flex gap-4 items-center p-3 rounded-xl border cursor-pointer transition-all ${selectedRoomId === room.id ? 'border-blue-600 bg-blue-50 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}`}
                  >
                    <input
                      type="radio"
                      name="roomId"
                      value={room.id}
                      checked={selectedRoomId === room.id}
                      onChange={() => setSelectedRoomId(room.id)}
                      className="sr-only"
                    />
                    {/* Room image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border">
                      {room.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={room.image_url} alt={room.category} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-bold">No Img</div>
                      )}
                    </div>
                    {/* Room info — no name/number shown */}
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">
                        {room.category} Room
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {room.is_ac === false ? '❄️ Non-AC' : '❄️ AC'} &nbsp;·&nbsp; per night
                      </div>
                    </div>
                    <div className="font-extrabold text-green-600 text-lg shrink-0">
                      ₹{room.currentPrice || room.base_price}
                    </div>
                  </label>
                ))}
              </div>
            </div>
                   <div className="grid grid-cols-2 gap-4 relative" ref={calendarRef}>
              <div className="space-y-2">
                <Label>Check-in</Label>
                <div 
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors items-center font-medium"
                >
                  {checkin ? format(new Date(checkin), 'MMM dd, yyyy') : 'Select date'}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <div 
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors items-center font-medium"
                >
                  {checkout ? format(new Date(checkout), 'MMM dd, yyyy') : 'Select date'}
                </div>
              </div>

              {isCalendarOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white border-2 border-blue-50 shadow-2xl rounded-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                  <Calendar
                    mode="range"
                    selected={{
                      from: checkin ? new Date(checkin) : undefined,
                      to: checkout ? new Date(checkout) : undefined
                    }}
                    onSelect={(range) => {
                      if (range?.from) setCheckin(format(range.from, 'yyyy-MM-dd'))
                      if (range?.to) {
                        setCheckout(format(range.to, 'yyyy-MM-dd'))
                        setIsCalendarOpen(false)
                      } else {
                        setCheckout('')
                      }
                    }}
                    numberOfMonths={1}
                    disabled={{ before: new Date() }}
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests">Number of Guests</Label>
              <select 
                name="guests"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-medium"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                ))}
                <option value="21">21+ Guests</option>
              </select>
            </div>

            {/* Price Breakdown */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  Base price
                  {maxGuests > 0 && (
                    <span className="text-gray-400 ml-1">(up to {maxGuests} guests)</span>
                  )}
                </span>
                <span className="font-bold text-gray-900">₹{roomPrice.toLocaleString()}</span>
              </div>

              {extraGuests > 0 && extraPerPax > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-orange-600">
                    +{extraGuests} extra {extraGuests === 1 ? 'guest' : 'guests'} × ₹{extraPerPax}
                  </span>
                  <span className="font-bold text-orange-600">+₹{extraCharge.toLocaleString()}</span>
                </div>
              )}

              {maxGuests > 0 && guestCount <= maxGuests && extraPerPax > 0 && (
                <p className="text-xs text-green-600 font-medium">✓ Within base guest limit — no extra charge</p>
              )}

              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total per night</span>
                <span className="font-extrabold text-xl text-green-600">₹{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <Label htmlFor="guestName" className="flex items-center gap-1"><User className="w-4 h-4" /> Guest Name</Label>
              <Input name="guestName" placeholder="Full Name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestPhone" className="flex items-center gap-1"><Phone className="w-4 h-4" /> Phone Number</Label>
              <Input name="guestPhone" placeholder="+91 9876543210" required />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded text-sm text-center font-medium border border-red-200">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-2 text-lg" disabled={isLoading}>
              {isLoading ? 'Processing...' : `Pay ₹${totalPrice.toLocaleString()}`}
            </Button>
            
            <p className="text-xs text-center text-gray-500 mt-2">
              You won't be charged yet. This is a demo booking flow.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
