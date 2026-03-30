'use client'

import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { logClick, bookRoom } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, User, Phone, CheckCircle, Share, Copy, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { eachDayOfInterval, isSameDay as isSameDayDate, subDays } from 'date-fns'
import PropertyMap from '@/components/PropertyMap'

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
  const firstAvailable = availableRooms.find(r => r.isAvailable)
  const [selectedRoomId, setSelectedRoomId] = useState<string>(firstAvailable?.id || availableRooms[0]?.id || '')
  const [checkin, setCheckin] = useState(initialCheckin || '')
  const [checkout, setCheckout] = useState(initialCheckout || '')
  const [guests, setGuests] = useState(initialGuests || '2')
  const [activeImage, setActiveImage] = useState<string | null>(null)
  
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [bookingDetails, setBookingDetails] = useState<{name: string, email: string, phone: string, checkin: string, checkout: string} | null>(null)

  const propImages = property.image_urls || []
  const roomImages = property.rooms?.map((r: any) => r.image_url).filter(Boolean) || []
  const allImages = Array.from(new Set([...propImages, ...roomImages])) as string[]

  useEffect(() => {
    if (isLightboxOpen) {
      window.history.pushState({ lightbox: true }, '')
      
      const handlePopState = (e: PopStateEvent) => {
        setIsLightboxOpen(false)
      }
      
      window.addEventListener('popstate', handlePopState)
      return () => {
        window.removeEventListener('popstate', handlePopState)
        // If the component unmounts while lightbox is open (e.g. navigation), 
        // we might want to ensure history is clean, but usually Next.js handles route changes.
      }
    }
  }, [isLightboxOpen])

  const handleCloseLightbox = () => {
    if (window.history.state?.lightbox) {
      window.history.back()
    } else {
      setIsLightboxOpen(false)
    }
  }

  useEffect(() => {
    if (isLightboxOpen) {
      const container = document.getElementById('lightbox-scroll-container')
      if (container) {
        container.scrollTo({
          left: lightboxIndex * container.clientWidth,
          behavior: 'instant'
        })
      }
    }
  }, [isLightboxOpen, lightboxIndex])

  const handleNextLightbox = () => {
    if (lightboxIndex < allImages.length - 1) {
      const newIndex = lightboxIndex + 1
      setLightboxIndex(newIndex)
      setActiveImage(allImages[newIndex])
      const container = document.getElementById('lightbox-scroll-container')
      if (container) container.scrollTo({ left: newIndex * container.clientWidth, behavior: 'smooth' })
    }
  }

  const handlePrevLightbox = () => {
    if (lightboxIndex > 0) {
      const newIndex = lightboxIndex - 1
      setLightboxIndex(newIndex)
      setActiveImage(allImages[newIndex])
      const container = document.getElementById('lightbox-scroll-container')
      if (container) container.scrollTo({ left: newIndex * container.clientWidth, behavior: 'smooth' })
    }
  }
  
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

  // --- Dynamic Pricing & Availability Logic ---
  const selectedRoom = availableRooms.find((r: any) => r.id === selectedRoomId)
  
  // 1. Calculate Stay Interval
  const stayDates = (checkin && checkout && new Date(checkin) < new Date(checkout))
    ? eachDayOfInterval({ 
        start: new Date(checkin), 
        end: subDays(new Date(checkout), 1) 
      }).map(d => format(d, 'yyyy-MM-dd'))
    : []

  const numNights = stayDates.length

  // 2. Multi-night Availability & Base Price Calculation
  let baseStayPrice = 0
  let isRangeAvailable = numNights > 0

  if (selectedRoom && numNights > 0) {
    // If we're using the server-calculated isAvailable flag, we should still re-check if dates changed on client
    // For now, let's keep the client-side check robust.
    
    // Check Manual Blocks
    const isInRangeBlocked = selectedRoom.room_availability?.some((a: any) => {
      return stayDates.includes(a.date) && !a.available
    })

    // Check Overlapping Bookings
    const hasOverlappingBooking = selectedRoom.bookings?.some((b: any) => {
      if (!b.checkin_date || !b.checkout_date) return false
      return b.checkin_date < checkout && b.checkout_date > checkin
    })
    
    if (isInRangeBlocked || hasOverlappingBooking) {
      isRangeAvailable = false
    } else {
      // Accumulate Rate
      for (const d of stayDates) {
        const customRate = selectedRoom.room_rates?.find((r: any) => r.date === d)?.price
        baseStayPrice += customRate !== undefined ? customRate : selectedRoom.base_price
      }
    }
  }

  // 3. Guest Pricing Logic
  const maxGuestsBase: number = property.max_guests || 2 // Free guests
  const maxCapacityGlobal: number = property.max_capacity || 20 // Total limit
  const extraPerPax: number = property.extra_per_pax || 0
  const guestCount = parseInt(guests) || 1

  const extraGuests = guestCount > maxGuestsBase ? guestCount - maxGuestsBase : 0
  const extraChargePerNight = extraGuests * extraPerPax
  const totalExtraCharge = extraChargePerNight * numNights

  const totalPrice = baseStayPrice + totalExtraCharge
  // --- End Logic ---
  
  const handleShare = async () => {
    const shareData = {
      title: property.name,
      text: `Checkout this amazing property in ${property.city_area}!`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 3000)
      }
    } catch (err) {
      console.error('Error sharing:', err)
    }
  }

  async function handleBook(formData: FormData) {
    if (!selectedRoomId) return
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await bookRoom(property.id, selectedRoomId, totalPrice, checkin, checkout, formData)
      
      if (result?.error) {
        setError(result.error)
        return
      }

      try {
        const name = formData.get('guestName') as string
        const email = formData.get('guestEmail') as string
        const phone = formData.get('guestPhone') as string
        
        setBookingDetails({
          name,
          email,
          phone,
          checkin,
          checkout
        })
      } catch (e) {
        console.warn('Could not capture details for confirmation screen', e)
      }
      
      setSuccess(true)
      setIsConfirmed(true)
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white p-8 md:p-12 rounded-2xl border border-green-200 text-center flex flex-col items-center gap-6 max-w-2xl mx-auto mt-12 shadow-xl shadow-green-50 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
          <CheckCircle className="w-12 h-12" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 font-medium">Your stay at <span className="text-gray-900 font-bold">{property.name}</span> is successfully reserved.</p>
        </div>

        {bookingDetails && (
          <div className="w-full bg-gray-50 rounded-2xl p-6 border text-left grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Guest Details</p>
              <p className="text-sm font-bold text-gray-900">{bookingDetails.name}</p>
              <p className="text-xs text-gray-500">{bookingDetails.email}</p>
              <p className="text-xs text-gray-500">{bookingDetails.phone}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Stay Duration</p>
              <p className="text-sm font-bold text-gray-900">
                {format(new Date(bookingDetails.checkin), 'MMM dd')} — {format(new Date(bookingDetails.checkout), 'MMM dd, yyyy')}
              </p>
              <p className="text-xs text-gray-500">
                {Math.ceil((new Date(bookingDetails.checkout).getTime() - new Date(bookingDetails.checkin).getTime()) / (1000 * 60 * 60 * 24))} Nights
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button onClick={() => window.location.href='/guest'} variant="outline" className="flex-1 h-12 rounded-xl font-bold">
            Browse More
          </Button>
          <Button onClick={() => window.print()} className="flex-1 h-12 rounded-xl font-bold bg-green-600 hover:bg-green-700">
            Print Receipt
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
      {influencerId && <ClickTracker propertyId={property.id} refId={influencerId} />}
      
      {/* Left Column: Gallery & Property Information */}
      <div className="flex flex-col gap-8 lg:col-span-8">
        {/* Main Image Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-video lg:aspect-[16/9] bg-gray-100 rounded-3xl overflow-hidden shadow-sm group border-2 border-white ring-1 ring-gray-100">
            {/* Logic to determine main image and gallery images */}
            {(() => {
              const mainImg = activeImage || allImages[0] || property.image_url
              
              if (mainImg) {
                return (
                  <button 
                    onClick={() => {
                      const idx = allImages.indexOf(mainImg)
                      setLightboxIndex(idx >= 0 ? idx : 0)
                      setIsLightboxOpen(true)
                    }}
                    className="w-full h-full text-left"
                  >
                    <img 
                      src={mainImg} 
                      alt={property.name} 
                      className="w-full h-full object-cover transition-all duration-700 hover:scale-105" 
                    />
                  </button>
                )
              }
              return <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">🏨</div>
            })()}
            
            {/* Overlay Tag */}
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <div className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-blue-900 shadow-xl border border-white">
                {property.type}
              </div>
            </div>

            {/* Float Share Button on Image */}
            <button 
              onClick={handleShare}
              className="absolute top-6 right-6 bg-white/90 backdrop-blur-md p-2.5 rounded-full text-blue-900 shadow-xl border border-white hover:bg-blue-600 hover:text-white transition-all duration-300 group"
            >
              {isCopied ? <Copy className="w-5 h-5 animate-in zoom-in-50" /> : <Share className="w-5 h-5" />}
              {isCopied && (
                <span className="absolute right-12 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md animate-in slide-in-from-right-2">
                  Link Copied!
                </span>
              )}
            </button>
          </div>

          {/* Thumbnails */}
          {(() => {
            if (allImages.length > 1) {
              return (
                <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                  {allImages.map((url: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveImage(url)
                        setLightboxIndex(i)
                        setIsLightboxOpen(true)
                      }}
                      className={cn(
                        "relative w-24 h-20 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 border-2",
                        (activeImage === url || (!activeImage && i === 0)) 
                          ? "border-blue-600 ring-4 ring-blue-50 scale-95 shadow-lg" 
                          : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"
                      )}
                    >
                      <img src={url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover bg-gray-50" />
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

        {/* Property Description & Details Card */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">{property.type}</div>
              <h1 className="text-3xl font-extrabold text-gray-900">{property.name}</h1>
            </div>
          </div>
          
          <p className="text-gray-600 text-lg leading-relaxed mb-6">
            {property.description}
          </p>

          {property.house_rules && (
            <div className="mb-8 p-5 bg-orange-50/50 border border-orange-100 rounded-xl">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-orange-900">
                <span className="bg-orange-100 p-1.5 rounded-md">📋</span> House Rules
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {property.house_rules}
              </p>
            </div>
          )}
          
          <h3 className="font-bold text-lg mb-3">Amenities</h3>
          <div className="flex flex-wrap gap-2 mb-8">
            {property.amenities?.map((amenity: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                {amenity}
              </span>
            ))}
          </div>

          <div className="border-t pt-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <MapPin className="text-red-500 w-5 h-5" /> Location
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              <span className="font-semibold text-gray-800">
                {property.area_name || property.city_area || 'Location'} {property.city ? `, ${property.city}` : ''}
              </span>
              {property.pincode && <span className="ml-2 text-gray-400 font-mono text-xs">· {property.pincode}</span>}
            </p>

            <PropertyMap 
              lat={Number(property.latitude)} 
              lng={Number(property.longitude)} 
              isConfirmed={isConfirmed}
              pincode={property.pincode}
              areaName={property.area_name}
              city={property.city}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Sticky Booking Form */}
      <div className="lg:col-span-4">
        <div className="bg-white p-6 rounded-3xl border shadow-xl shadow-blue-900/5 lg:sticky lg:top-24 h-fit">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <span>Book your Stay</span>
            {property.type === 'villa' && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Entire Villa</span>}
          </h2>

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
              <input type="hidden" name="influencerId" value={influencerId || ''} />
              <div className="space-y-2">
                <Label>Room Selection</Label>
                <div className="flex flex-col gap-3">
                  {availableRooms.map(room => {
                    const roomAvailable = room.isAvailable;
                    
                    return (
                      <label
                        key={room.category}
                        className={cn(
                          "flex gap-4 items-center p-3 rounded-xl border cursor-pointer transition-all",
                          selectedRoomId === room.id ? 'border-blue-600 bg-blue-50 shadow-sm' : 'hover:bg-gray-50 border-gray-200',
                          !roomAvailable && "opacity-60 grayscale-[0.5]"
                        )}
                      >
                        <input
                          type="radio"
                          name="roomId"
                          value={room.id}
                          checked={selectedRoomId === room.id}
                          onChange={() => setSelectedRoomId(room.id)}
                          className="sr-only"
                        />
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border relative">
                          {room.image_url ? (
                            <img src={room.image_url} alt={room.category} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-bold">No Img</div>
                          )}
                          {!roomAvailable && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[8px] font-black text-white uppercase tracking-tighter">Sold Out</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {room.category} Room
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400 font-medium">per night</span>
                            {roomAvailable ? (
                              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter animate-pulse">Available</span>
                            ) : (
                              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Sold Out</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <div className={cn(
                            "font-extrabold text-lg",
                            roomAvailable ? "text-green-600" : "text-gray-400 line-through"
                          )}>
                            ₹{(room.currentPrice || room.base_price).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                            upto {property.max_guests || 2} guests
                          </div>
                        </div>
                      </label>
                    );
                  })}
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {Array.from({ length: maxCapacityGlobal }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
                {maxCapacityGlobal > 0 && (
                  <p className="text-[11px] text-gray-400">Max capacity: {maxCapacityGlobal} guests</p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className={`rounded-xl border p-4 space-y-2 transition-all duration-300 ${numNights > 0 ? 'bg-blue-50/30 border-blue-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                {numNights > 0 ? (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">Room Price ({numNights} nights)</span>
                      <span className="font-bold text-gray-900 font-mono">₹{baseStayPrice.toLocaleString()}</span>
                    </div>
                    {extraGuests > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-orange-600 font-medium">Extra Guests ({extraGuests})</span>
                        <span className="font-bold text-orange-600 font-mono">+₹{totalExtraCharge.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-blue-100 pt-2 flex justify-between items-center">
                      <span className="font-black text-gray-900">Total</span>
                      <span className="font-extrabold text-2xl text-blue-700 font-mono">₹{totalPrice.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-400 text-sm py-2">Select dates to see price</p>
                )}
              </div>

              <div className="space-y-2 mt-2">
                <Label htmlFor="guestName" className="flex items-center gap-1 font-bold">
                  <User className="w-4 h-4" /> Guest Name <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <Input name="guestName" placeholder="Full Name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestEmail" className="flex items-center gap-1 font-bold text-gray-500">✉️ Email Address</Label>
                <Input type="email" name="guestEmail" placeholder="your@email.com (optional)" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestPhone" className="flex items-center gap-1 font-bold">
                  <Phone className="w-4 h-4" /> Phone Number <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <Input name="guestPhone" placeholder="+91 9876543210" required />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded text-sm text-center font-medium border border-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full mt-2 text-lg" disabled={isLoading || !isRangeAvailable || numNights === 0}>
                {isLoading ? 'Processing...' : !isRangeAvailable ? 'Sold Out' : numNights === 0 ? 'Select Dates' : `Pay ₹${totalPrice.toLocaleString()}`}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Lightbox Slider */}
      {isLightboxOpen && allImages.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
          <div className="absolute top-0 right-0 p-4 z-10 flex w-full justify-between items-center text-white">
            <div className="px-4 text-sm font-bold opacity-70">{lightboxIndex + 1} / {allImages.length}</div>
            <button onClick={handleCloseLightbox} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div id="lightbox-scroll-container" className="flex-1 flex overflow-x-auto snap-x snap-mandatory hide-scrollbar items-center">
            {allImages.map((src, i) => (
              <div key={i} className="flex-shrink-0 w-full h-full flex items-center justify-center snap-center p-4">
                <img src={src} className="max-w-full max-h-full object-contain" alt={`View ${i + 1}`} />
              </div>
            ))}
          </div>
          {allImages.length > 1 && (
            <>
              <button onClick={handlePrevLightbox} disabled={lightboxIndex === 0} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 text-white rounded-full">
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button onClick={handleNextLightbox} disabled={lightboxIndex === allImages.length - 1} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 text-white rounded-full">
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
