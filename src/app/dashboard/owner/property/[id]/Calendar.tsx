'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek,
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  isSameDay, 
  isSameMonth,
  eachDayOfInterval,
  subMonths
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Hash } from 'lucide-react'
import { setRoomAvailability, setRoomRate } from './actions'

type CalendarProps = {
  propertyId: string
  rooms: any[]
  bookings: any[]
  availability: any[]
  rates: any[]
}

export default function BookingCalendar({ propertyId, rooms, bookings, availability, rates }: CalendarProps) {
  const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0]?.id || '')
  const [selectedDateDetails, setSelectedDateDetails] = useState<Date | null>(null)
  
  // Create a 24-month range starting from current month
  const today = new Date()
  const months = Array.from({ length: 24 }).map((_, i) => addMonths(startOfMonth(today), i))
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeMonthIndex, setActiveMonthIndex] = useState(0)

  const scrollToMonth = (index: number) => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current
      const targetScroll = index * el.offsetWidth
      el.scrollTo({ left: targetScroll, behavior: 'smooth' })
      setActiveMonthIndex(index)
    }
  }

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current
      const index = Math.round(el.scrollLeft / el.offsetWidth)
      setActiveMonthIndex(index)
    }
  }

  const handleToggleAvailability = async (date: Date, isCurrentlyAvailable: boolean) => {
    if (!selectedRoom) return;
    const dateStr = format(date, 'yyyy-MM-dd')
    await setRoomAvailability(propertyId, selectedRoom, dateStr, !isCurrentlyAvailable)
  }

  const selectedDateStr = selectedDateDetails ? format(selectedDateDetails, 'yyyy-MM-dd') : null
  const detailsBookings = bookings.filter(b => b.room_id === selectedRoom && format(new Date(b.created_at), 'yyyy-MM-dd') === selectedDateStr)

  let selectedDateCurrentPrice = rooms.find(r => r.id === selectedRoom)?.base_price
  if (selectedDateStr) {
    const srRecord = rates.find(r => r.room_id === selectedRoom && r.date === selectedDateStr)
    if (srRecord) selectedDateCurrentPrice = srRecord.price
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 rounded-xl border">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] font-bold uppercase text-gray-400">Selected Room</Label>
          <select 
            className="border rounded-lg px-3 py-2 text-sm bg-white font-semibold shadow-sm min-w-[280px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={selectedRoom}
            onChange={e => {
              setSelectedRoom(e.target.value)
              setSelectedDateDetails(null)
            }}
            disabled={!rooms.length}
          >
            {rooms.length > 0 ? (
              rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.category})</option>
              ))
            ) : (
              <option value="">No rooms configured...</option>
            )}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center min-w-[140px]">
            <h3 className="text-lg font-bold text-blue-900">{format(months[activeMonthIndex], 'MMMM yyyy')}</h3>
          </div>
          <div className="flex gap-1.5">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-full"
              onClick={() => scrollToMonth(Math.max(0, activeMonthIndex - 1))}
              disabled={activeMonthIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-full"
              onClick={() => scrollToMonth(Math.min(months.length - 1, activeMonthIndex + 1))}
              disabled={activeMonthIndex === months.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Slidable Calendar Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none no-scrollbar rounded-xl border bg-white shadow-sm"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {months.map((monthDate, mIndex) => {
          const start = startOfMonth(monthDate)
          const end = endOfMonth(monthDate)
          const calendarStart = startOfWeek(start)
          const calendarEnd = endOfWeek(end)
          
          const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
          
          return (
            <div key={mIndex} className="min-w-full snap-start p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const isCurrentMonth = isSameMonth(date, monthDate)
                  
                  const roomBookings = bookings.filter(b => b.room_id === selectedRoom && format(new Date(b.created_at), 'yyyy-MM-dd') === dateStr)
                  const bookingHasDate = roomBookings.length > 0
                  
                  const availabilityRecord = availability.find(a => a.room_id === selectedRoom && a.date === dateStr)
                  const isAvailable = availabilityRecord ? availabilityRecord.available : true
                  
                  const rateRecord = rates.find(r => r.room_id === selectedRoom && r.date === dateStr)
                  const basePrice = rooms.find(r => r.id === selectedRoom)?.base_price
                  const calendarDayPrice = rateRecord ? rateRecord.price : basePrice

                  return (
                    <div 
                      key={dateStr}
                      onClick={() => setSelectedDateDetails(date)}
                      className={`
                        min-h-[90px] lg:min-h-[110px] border rounded-lg p-2 flex flex-col transition shadow-sm cursor-pointer relative
                        ${!isCurrentMonth ? 'bg-gray-50/30 border-transparent opacity-20 pointer-events-none' : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md'}
                        ${!isAvailable && isCurrentMonth ? 'bg-red-50/30' : ''}
                        ${selectedDateStr === dateStr ? 'ring-2 ring-blue-500 border-transparent z-10' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`
                          text-xs font-bold 
                          ${isSameDay(date, today) ? 'text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded' : 'text-gray-500'}
                        `}>
                          {format(date, 'd')}
                        </span>
                        {bookingHasDate && isCurrentMonth && (
                          <div className="h-2 w-2 rounded-full bg-purple-600 animate-pulse shadow-[0_0_8px_rgba(147,51,234,0.5)]" title="Booked" />
                        )}
                      </div>

                      {isCurrentMonth && (
                        <div className="mt-auto flex flex-col gap-1.5">
                          <div className="text-[11px] font-extrabold text-green-600 flex items-center justify-between">
                            <span>₹{calendarDayPrice}</span>
                            {rateRecord && <div className="h-1 w-1 rounded-full bg-orange-400" title="Custom Rate" />}
                          </div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAvailability(date, isAvailable);
                            }}
                            className={`
                              text-[9px] py-1 rounded-md font-bold uppercase tracking-tighter transition-colors
                              ${isAvailable 
                                ? 'bg-blue-50 text-blue-600 hover:bg-red-50 hover:text-red-600' 
                                : 'bg-red-100 text-red-700 hover:bg-blue-100 hover:text-blue-600'}
                            `}
                          >
                            {isAvailable ? 'Block' : 'Open'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Date Details Panel */}
      {selectedDateDetails && (
        <div className="border-2 border-blue-500 bg-blue-50/30 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-start mb-6 border-b border-blue-100 pb-4">
            <div>
              <Label className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1 block">Selected Date</Label>
              <h3 className="text-xl font-black text-blue-900">
                {format(selectedDateDetails, 'EEEE, MMMM do, yyyy')}
              </h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDateDetails(null)} className="rounded-full hover:bg-blue-100">✕ Close</Button>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Bookings Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Hash className="w-4 h-4 text-purple-500" /> Active Bookings
              </h4>
              <div className="flex flex-col gap-3">
                {detailsBookings.length > 0 ? (
                  detailsBookings.map(b => (
                    <div key={b.id} className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex justify-between items-center group hover:shadow-md transition-all">
                      <div>
                        <h5 className="font-bold text-gray-900">{b.guest_name}</h5>
                        <p className="text-xs text-blue-500 font-medium">{b.guest_phone}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-green-600">₹{b.amount}</div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">Paid</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white/50 border-2 border-dashed rounded-xl py-8 text-center text-gray-400 italic text-sm">
                    No bookings for this date
                  </div>
                )}
              </div>
            </div>

            {/* Price Override Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center text-[10px]">₹</div> Daily Pricing
              </h4>
              <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-xs text-gray-500 font-bold uppercase">Current active rate</div>
                  <div className="text-2xl font-black text-green-600">₹{selectedDateCurrentPrice}</div>
                </div>
                
                <form action={async (formData) => {
                  const newPrice = Number(formData.get('price'))
                  if (selectedDateStr) {
                    await setRoomRate(propertyId, selectedRoom, selectedDateStr, newPrice)
                  }
                }} className="flex flex-col gap-3">
                  <Label className="text-[10px] font-bold text-gray-400 ml-1">Override Price for this day</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                      <Input 
                        type="number" 
                        name="price" 
                        placeholder="Enter amount" 
                        required 
                        className="pl-7 h-11 border-2 focus:border-blue-500 rounded-xl font-bold"
                      />
                    </div>
                    <Button type="submit" size="lg" className="h-11 px-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                      Update
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
