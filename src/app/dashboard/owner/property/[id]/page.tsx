import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addRoom } from './actions'
import BookingCalendar from './Calendar'
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react'

export default async function PropertyDetailPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const propertyId = params.id
  const supabase = await createClient()

  // Verify owner
  const { data: { user } } = await supabase.auth.getUser()
  const { data: owner } = await supabase.from('owners').select('id').eq('user_id', user?.id).single()

  if (!owner) redirect('/login')

  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .eq('owner_id', owner.id)
    .single()

  if (error || !property) redirect('/dashboard/owner')

  const { data: rooms } = await supabase.from('rooms').select('*').eq('property_id', propertyId)
  const roomIds = rooms?.map(r => r.id) || []
  
  // Fetch calendar needed data
  const { data: bookings } = await supabase.from('bookings').select('*').in('room_id', roomIds)
  const { data: rates } = await supabase.from('room_rates').select('*').in('room_id', roomIds)
  const { data: availability } = await supabase.from('room_availability').select('*').in('room_id', roomIds)

  return (
    <div className="flex flex-col gap-8">
      
      <div>
        <Link href="/dashboard/owner" className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-4 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{property.name}</h1>
            <p className="text-gray-500 capitalize">{property.type} • {property.amenities?.join(', ')}</p>
          </div>
          <div>
            {property.approved ? (
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 border border-green-200">
                <CheckCircle className="w-4 h-4" /> Approved
              </span>
            ) : (
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 border border-orange-200">
                <Clock className="w-4 h-4" /> Pending Approval
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        
        {/* Left: Rooms List & Add Form */}
        <div className="flex flex-col gap-6">
          <div className="bg-white border rounded-lg p-5 shadow-sm">
            <h2 className="text-xl font-bold mb-4">
              {property.type === 'villa' ? 'Villa Configuration' : 'Rooms Configuration'}
            </h2>
            <div className="flex flex-col gap-3">
              {rooms?.map(room => (
                <div key={room.id} className="border p-3 flex justify-between rounded-md bg-gray-50 items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 rounded-md overflow-hidden aspect-square w-12 h-12 flex-shrink-0">
                      {room.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={room.image_url} alt={room.name} className="object-cover w-full h-full" />
                      ) : (
                        <div className="flex w-full h-full items-center justify-center">
                          <span className="text-xs font-bold text-blue-400">R</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <p className="text-xs text-gray-500">{room.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-green-600">₹{room.base_price}</span>
                    <p className="text-[10px] text-gray-400 capitalize">{room.price_bucket} bucket</p>
                  </div>
                </div>
              ))}
              {(!rooms || rooms.length === 0) && (
                <p className="text-sm text-gray-500 italic">No configuration defined yet.</p>
              )}
            </div>
          </div>

          {property.type !== 'villa' && (
            <div className="bg-white border rounded-lg p-5 shadow-sm sticky top-24">
              <h3 className="font-bold mb-4">Add a New Room</h3>
              <form action={addRoom.bind(null, propertyId)} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Room Name / Label</Label>
                  <Input name="name" placeholder="e.g. Room 101" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="acType">AC / Non AC</Label>
                    <select name="acType" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" required>
                      <option value="AC">AC</option>
                      <option value="Non AC">Non AC</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select name="category" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" required>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                      <option value="Deluxe">Deluxe</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price (₹ per night)</Label>
                  <Input type="number" name="basePrice" placeholder="2000" min="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceBucket">Price Cap / Bucket</Label>
                  <select name="priceBucket" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" required>
                    <option value="" disabled selected>Select price bucket...</option>
                    <option value="₹799">₹799</option>
                    <option value="₹999">₹999</option>
                    <option value="₹1299">₹1299</option>
                    <option value="₹1499">₹1499</option>
                    <option value="₹1999">₹1999</option>
                    <option value="₹2499">₹2499</option>
                    <option value="₹2999">₹2999</option>
                    <option value="₹3499">₹3499</option>
                    <option value="₹3999">₹3999</option>
                    <option value="₹6999">₹6999</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Room Photo</Label>
                  <Input type="file" name="image" accept="image/*" />
                </div>
                <Button type="submit" className="w-full">Add Room</Button>
              </form>
            </div>
          )}
        </div>

        {/* Right: Unified Calendar View */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-6">Booking & Availability Calendar</h2>
          <BookingCalendar 
            propertyId={propertyId}
            rooms={rooms || []}
            bookings={bookings || []}
            availability={availability || []}
            rates={rates || []}
          />

          <div className="mt-8 flex gap-4 text-xs text-gray-500 border-t pt-4">
            <div className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-purple-600 inline-block"/> Booked</div>
            <div className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-white border border-blue-300 inline-block"/> Available</div>
            <div className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-gray-200 inline-block"/> Blocked</div>
          </div>
        </div>

      </div>

    </div>
  )
}
