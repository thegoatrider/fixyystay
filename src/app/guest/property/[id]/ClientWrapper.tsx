'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { logClick, bookRoom } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, User, Phone, CheckCircle } from 'lucide-react'

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
  
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    const confirmed = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]')
    if (confirmed.includes(property.id)) {
      setIsConfirmed(true)
    }
  }, [property.id])

  const selectedRoom = availableRooms.find(r => r.id === selectedRoomId)
  
  // Real pricing would consider dates. Here we just take today's price or base price.
  const roomPrice = selectedRoom?.currentPrice || selectedRoom?.base_price || 0

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
        <div className="h-64 bg-gray-200 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border">
          <span className="text-gray-400 text-3xl">Property Image Preview</span>
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
              <p className="text-sm text-gray-600">You need to be logged in as a guest to make a reservation.</p>
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
              <Label htmlFor="roomSelection">Select a Room</Label>
              <div className="flex flex-col gap-2">
                {availableRooms.map(room => (
                  <label key={room.id} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedRoomId === room.id ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="roomId" 
                        value={room.id}
                        checked={selectedRoomId === room.id}
                        onChange={() => setSelectedRoomId(room.id)}
                        className="text-blue-600 focus:ring-blue-600"
                      />
                      <div>
                        <div className="font-semibold">{room.name}</div>
                        <div className="text-xs text-gray-500">{room.category}</div>
                      </div>
                    </div>
                    <div className="font-bold text-green-600">₹{room.currentPrice || room.base_price}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkin">Check-in</Label>
                <Input 
                  type="date" 
                  name="checkin" 
                  value={checkin} 
                  onChange={(e) => setCheckin(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout">Check-out</Label>
                <Input 
                  type="date" 
                  name="checkout" 
                  value={checkout} 
                  onChange={(e) => setCheckout(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests">Number of Guests</Label>
              <select 
                name="guests"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4+ Guests</option>
              </select>
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
              {isLoading ? 'Processing...' : `Pay ₹${roomPrice}`}
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
