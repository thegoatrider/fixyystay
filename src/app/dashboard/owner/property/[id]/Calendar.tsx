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
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Hash, Layers, CheckCircle, XCircle, Info, Save } from 'lucide-react'
import { setRoomAvailability, setRoomRate, setMultipleRoomAvailability, setMultipleRoomRates, saveMultipleChanges } from './actions'

type CalendarProps = {
  propertyId: string
  rooms: any[]
  bookings: any[]
  availability: any[]
  rates: any[]
}

const PRICE_BUCKETS = [
  '₹799', '₹999', '₹1299', '₹1499', '₹1999', '₹2499', '₹2999', '₹3499', '₹3999', '₹6999',
  '₹4999', '₹7999', '₹9999', '₹14999', '₹19999', '₹24999', '₹29999', '₹39999', '₹49999'
]

export default function BookingCalendar({ propertyId, rooms, bookings, availability, rates }: CalendarProps) {
  const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0]?.id || '')
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Staging area for changes
  const [stagedAvailability, setStagedAvailability] = useState<boolean | null>(null)
  const [stagedPrice, setStagedPrice] = useState<number | null>(null)
  
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

  const toggleDateSelection = (date: Date) => {
    setSelectedDates(prev => {
      const exists = prev.find(d => isSameDay(d, date))
      if (exists) {
        return prev.filter(d => !isSameDay(d, date))
      }
      return [...prev, date]
    })
  }

  const handleUnifiedSave = async () => {
    if (!selectedRoom || selectedDates.length === 0) return
    if (stagedAvailability === null && stagedPrice === null) {
      alert("Please choose an availability status or a price first.")
      return
    }

    setIsUpdating(true)
    try {
      const dateStrings = selectedDates.map(d => format(d, 'yyyy-MM-dd'))
      const result = await saveMultipleChanges(
        propertyId, 
        selectedRoom, 
        dateStrings, 
        stagedAvailability, 
        stagedPrice
      )
      
      if (result?.error) {
        alert(result.error)
      } else {
        setSelectedDates([])
        setStagedAvailability(null)
        setStagedPrice(null)
      }
    } catch (err) {
      console.error(err)
      alert('An unexpected error occurred.')
    } finally {
      setIsUpdating(false)
    }
  }

  const clearSelection = () => {
    setSelectedDates([])
    setStagedAvailability(null)
    setStagedPrice(null)
  }

  // Selection state helpers
  const singleSelectedDateStr = selectedDates.length === 1 ? format(selectedDates[0], 'yyyy-MM-dd') : null
  const dayBookings = singleSelectedDateStr ? bookings.filter(b => b.room_id === selectedRoom && format(new Date(b.created_at), 'yyyy-MM-dd') === singleSelectedDateStr) : []

  return (
    <div className={`flex flex-col gap-6 relative ${selectedDates.length > 0 ? 'pb-[400px] md:pb-24' : 'pb-32 md:pb-24'}`}>
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-3 sm:p-4 rounded-xl border">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] font-bold uppercase text-gray-400">Selected Room</Label>
          <select 
            className="border rounded-lg px-3 py-2 text-sm bg-white font-semibold shadow-sm min-w-[220px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={selectedRoom}
            onChange={e => {
              setSelectedRoom(e.target.value)
              clearSelection()
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

      {/* Multi-Select Bulk Action Bar (Floating at bottom if selection exists) */}
      {selectedDates.length > 0 && (
        <div className="fixed bottom-[90px] md:bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-2xl animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-white border-2 border-blue-600 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-4 flex flex-col items-stretch gap-4">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black animate-pulse">
                  {selectedDates.length}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 leading-none">Dates Selected</p>
                  <button onClick={clearSelection} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest mt-1">Clear Selection</button>
                </div>
              </div>
              
              <Button 
                onClick={handleUnifiedSave}
                disabled={isUpdating || (stagedAvailability === null && stagedPrice === null)}
                className="bg-blue-600 hover:bg-blue-700 h-10 px-6 font-bold gap-2 shadow-lg shadow-blue-200"
              >
                {isUpdating ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4" /> Save All Changes
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                <Button 
                  onClick={() => setStagedAvailability(false)} 
                  variant={stagedAvailability === false ? 'default' : 'outline'}
                  disabled={isUpdating}
                  className={`h-10 px-4 text-xs font-bold gap-2 flex-shrink-0 transition-all ${stagedAvailability === false ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                >
                  <XCircle className="w-4 h-4" /> Block
                </Button>
                <Button 
                  onClick={() => setStagedAvailability(true)} 
                  variant={stagedAvailability === true ? 'default' : 'outline'}
                  disabled={isUpdating}
                  className={`h-10 px-4 text-xs font-bold gap-2 flex-shrink-0 transition-all ${stagedAvailability === true ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                >
                  <CheckCircle className="w-4 h-4" /> Open
                </Button>
                
                <div className="flex-shrink-0">
                  <select
                    disabled={isUpdating}
                    onChange={(e) => setStagedPrice(parseInt(e.target.value.replace(/[^\d]/g, '')))}
                    className="bg-blue-50 border-2 border-blue-100 text-blue-700 h-10 px-3 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none w-[140px]"
                    value={stagedPrice ? `₹${stagedPrice}` : ""}
                  >
                    <option value="" disabled>Set Price...</option>
                    {PRICE_BUCKETS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(stagedAvailability !== null || stagedPrice !== null) && (
                <p className="text-[10px] font-bold text-orange-500 animate-pulse italic">
                  Changes staged. Don't forget to click Save!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
            <div key={mIndex} className="min-w-full snap-start p-2">
              <div className="grid grid-cols-7 gap-px sm:gap-0.5 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div key={day} className={`text-center text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-wider py-1 ${idx === 0 || idx === 6 ? 'text-red-300' : ''}`}>
                    {day.substring(0, 3)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px sm:gap-0.5">
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

                  const isSelected = selectedDates.some(d => isSameDay(d, date))
                  
                  const effectiveAvailability = (isSelected && stagedAvailability !== null) ? stagedAvailability : isAvailable
                  const effectivePrice = (isSelected && stagedPrice !== null) ? stagedPrice : calendarDayPrice

                  return (
                    <div 
                      key={dateStr}
                      onClick={() => toggleDateSelection(date)}
                      className={`
                        min-h-[50px] sm:min-h-[68px] border rounded-sm sm:rounded-md p-1 sm:p-1.5 flex flex-col transition cursor-pointer relative
                        ${!isCurrentMonth ? 'bg-gray-50/10 border-transparent opacity-0 pointer-events-none' : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md'}
                        ${!effectiveAvailability && isCurrentMonth ? 'bg-red-50/20' : ''}
                        ${isSelected ? 'ring-1 sm:ring-2 ring-blue-600 border-transparent z-10 bg-blue-50/50' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`
                          text-xs font-bold 
                          ${isSameDay(date, today) ? 'text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded' : 'text-gray-500'}
                        `}>
                          {format(date, 'd')}
                        </span>
                        <div className="flex gap-1">
                          {!effectiveAvailability && isCurrentMonth && <div className="h-1.5 w-1.5 rounded-full bg-red-500" title="Blocked" />}
                          {bookingHasDate && isCurrentMonth && (
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-pulse shadow-[0_0_8px_rgba(147,51,234,0.5)]" title="Booked" />
                          )}
                        </div>
                      </div>

                      {isCurrentMonth && (
                        <div className="mt-auto">
                          <div className={`text-[8px] sm:text-[10px] font-black flex items-baseline gap-0.5 leading-none mb-1 overflow-hidden ${rateRecord || (isSelected && stagedPrice) ? 'text-orange-600' : 'text-green-600'}`}>
                            <span className="text-[6px] sm:text-[8px]">₹</span>
                            <span className="truncate tracking-tighter">{effectivePrice}</span>
                          </div>
                          <div className={`h-0.5 sm:h-1 w-full rounded-full ${effectiveAvailability ? 'bg-green-100' : 'bg-red-100'}`} />
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="absolute top-1 right-1">
                          <div className="h-3 w-3 bg-blue-600 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-2 h-2 text-white" />
                          </div>
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

      {/* Single Date Details (Booking View Only) */}
      {selectedDates.length === 1 && dayBookings.length > 0 && (
        <div className="bg-gray-50 rounded-2xl p-6 border-2 border-purple-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-purple-500" /> Active Bookings on {format(selectedDates[0], 'MMM do')}
          </h4>
          <div className="flex flex-col gap-3">
             {dayBookings.map(b => (
                <div key={b.id} className="bg-white p-4 rounded-xl shadow-sm border border-purple-50 flex justify-between items-center group hover:shadow-md transition-all">
                  <div>
                    <h5 className="font-bold text-gray-900">{b.guest_name}</h5>
                    <p className="text-xs text-blue-500 font-medium">{b.guest_phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-green-600">₹{b.amount}</div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">Confirmed</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-xl border border-dashed flex flex-col md:flex-row gap-4 items-center justify-between text-gray-500">
        <div className="flex items-center gap-2 text-xs">
          <Info className="w-4 h-4 text-blue-500" />
          <span>Click multiple dates to bulk edit availability or pricing.</span>
        </div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /> Open</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Blocked</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-600" /> Booked</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-600" /> Custom Rate</div>
        </div>
      </div>
    </div>
  )
}
