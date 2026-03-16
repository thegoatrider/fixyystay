'use client'

import { useState } from 'react'
import { format, addDays, startOfWeek, addWeeks, isSameDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import { setRoomAvailability, setRoomRate } from './actions'

type CalendarProps = {
  propertyId: string
  rooms: any[]
  bookings: any[]
  availability: any[]
  rates: any[]
}

export default function BookingCalendar({ propertyId, rooms, bookings, availability, rates }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0]?.id || '')
  const [selectedDateDetails, setSelectedDateDetails] = useState<Date | null>(null)

  const startDate = startOfWeek(currentDate)
  // Display a full grid of 35 days (5 weeks)
  const days = Array.from({ length: 35 }).map((_, i) => addDays(startDate, i))

  const handleToggleAvailability = async (date: Date, isCurrentlyAvailable: boolean) => {
    if (!selectedRoom) return;
    const dateStr = format(date, 'yyyy-MM-dd')
    await setRoomAvailability(propertyId, selectedRoom, dateStr, !isCurrentlyAvailable)
  }

  const selectedDateStr = selectedDateDetails ? format(selectedDateDetails, 'yyyy-MM-dd') : null
  const detailsBookings = bookings.filter(b => b.room_id === selectedRoom && format(new Date(b.created_at), 'yyyy-MM-dd') === selectedDateStr)

  let selectedDateCurrentPrice = rooms.find(r=>r.id === selectedRoom)?.base_price
  if (selectedDateStr) {
      const srRecord = rates.find(r => r.room_id === selectedRoom && r.date === selectedDateStr)
      if (srRecord) selectedDateCurrentPrice = srRecord.price
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <select 
          className="border rounded-md px-3 py-1.5 text-sm bg-white font-medium shadow-sm w-[250px]"
          value={selectedRoom}
          onChange={e => {
            setSelectedRoom(e.target.value)
            setSelectedDateDetails(null)
          }}
          disabled={!rooms.length}
        >
          {rooms.length > 0 ? (
            rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name} - {r.category}</option>
            ))
          ) : (
            <option value="">No rooms configured...</option>
          )}
        </select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addWeeks(currentDate, -1))}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>Next</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">{day}</div>
        ))}
        {days.map((date, i) => {
          const dateStr = format(date, 'yyyy-MM-dd')
          
          // Data lookups
          const roomBookings = bookings.filter(b => b.room_id === selectedRoom && format(new Date(b.created_at), 'yyyy-MM-dd') === dateStr) 
          // Note: using created_at as booking date for simplicity here, typically booking has a specific target date
          
          const bookingHasDate = roomBookings.length > 0
          
          const availabilityRecord = availability.find(a => a.room_id === selectedRoom && a.date === dateStr)
          const isAvailable = availabilityRecord ? availabilityRecord.available : true // default true

          const rateRecord = rates.find(r => r.room_id === selectedRoom && r.date === dateStr)
          
          // Fallback to base price
          const basePrice = rooms.find(r=>r.id === selectedRoom)?.base_price
          const calendarDayPrice = rateRecord ? rateRecord.price : basePrice
          
          return (
            <div 
              key={dateStr} 
              onClick={() => setSelectedDateDetails(date)}
              className={`min-h-[100px] border rounded-lg p-2 flex flex-col gap-1 transition shadow-sm cursor-pointer ${isAvailable ? 'bg-white hover:border-blue-400 hover:shadow-md' : 'bg-gray-100 opacity-60'} ${selectedDateStr === dateStr ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-medium ${isSameDay(date, new Date()) ? 'text-blue-600 bg-blue-50 px-1 rounded' : ''} ${format(date, 'MMM') !== format(currentDate, 'MMM') ? 'text-gray-400' : ''}`}>
                  {format(date, 'd MMM')}
                </span>
                {bookingHasDate && (
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-600 shadow-sm" title="Booked" />
                )}
              </div>
              
              <div className="mt-auto flex flex-col gap-1">
                {rooms.length > 0 ? (
                  <>
                    <div className="text-xs font-semibold text-green-700">
                      ₹{calendarDayPrice}
                      {rateRecord && <span title="Custom Override" className="ml-1 text-[8px] text-orange-500">●</span>}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAvailability(date, isAvailable);
                      }}
                      className={`text-[10px] py-1 rounded w-full font-medium ${isAvailable ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      {isAvailable ? 'Block' : 'Open'}
                    </button>
                  </>
                ) : (
                  <div className="text-[10px] text-gray-400 text-center">-</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Booking Details Panel */}
      {selectedDateDetails && (
        <div className="mt-4 border border-blue-100 bg-blue-50/50 rounded-lg p-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4 border-b border-blue-100 pb-2">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 inline-block"/>
              Details for {format(selectedDateDetails, 'EEEE, MMMM do, yyyy')}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDateDetails(null)} className="h-8 text-xs text-gray-500">Close</Button>
          </div>
          
          {detailsBookings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {detailsBookings.map(b => (
                <div key={b.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{b.guest_name}</h4>
                    <p className="text-sm text-gray-500">{b.guest_email}</p>
                    <p className="text-xs text-gray-400 mt-1">Guests: {b.guests_count}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-bold text-green-700">₹{b.amount}</span>
                    <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Confirmed</span>
                    <span className="text-xs text-gray-400 block">ID: {b.id.substring(0,8)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic py-4 text-center">
              No bookings active on this date for the selected room.
            </div>
          )}

          {/* Override Rate UI */}
          <div className="mt-4 border-t border-blue-100 pt-4 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-gray-500">Current active rate: </span>
              <span className="font-bold text-green-700">₹{selectedDateCurrentPrice}</span>
              {rates.find(r => r.room_id === selectedRoom && r.date === selectedDateStr) && (
                <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Custom Override</span>
              )}
            </div>
            
            <form action={async (formData) => {
              const newPrice = Number(formData.get('price'))
              if (selectedDateStr) {
                await setRoomRate(propertyId, selectedRoom, selectedDateStr, newPrice)
              }
            }} className="flex gap-2 items-center">
              <input 
                type="number" 
                name="price" 
                placeholder="New ₹ Price" 
                required 
                className="border border-gray-300 rounded px-2 py-1 text-sm w-32 shadow-sm"
              />
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Save Rate</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
