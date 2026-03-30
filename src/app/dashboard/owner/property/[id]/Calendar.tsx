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
import { ChevronLeft, ChevronRight, Hash, Layers, CheckCircle, XCircle, Info, Save, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { setRoomAvailability, setRoomRate, setMultipleRoomAvailability, setMultipleRoomRates, saveMultipleChanges, saveCategoryChanges } from './actions'

type CalendarProps = {
  propertyId: string
  rooms: any[]
  bookings: any[]
  availability: any[]
  rates: any[]
  propertyType: string
}

const PRICE_BUCKETS = [
  '₹799', '₹999', '₹1299', '₹1499', '₹1999', '₹2499', '₹2999', '₹3499', '₹3999', '₹4499', '₹4999', '₹5499', '₹6999',
  '₹4999', '₹7999', '₹9999', '₹12999', '₹14999', '₹17999', '₹19999', '₹24999', '₹29999', '₹34999', '₹39999', '₹44999', '₹49999'
]

export default function BookingCalendar({ propertyId, rooms, bookings, availability, rates, propertyType }: CalendarProps) {
  const isMultiRoom = propertyType !== 'villa'
  const categories = Array.from(new Set(rooms.map(r => r.category)))
  
  const [selectedRoom, setSelectedRoom] = useState<string>(!isMultiRoom ? rooms[0]?.id || '' : '')
  const [selectedCategory, setSelectedCategory] = useState<string>(isMultiRoom ? categories[0] || '' : '')
  
  const [roomsToUpdateCount, setRoomsToUpdateCount] = useState<number>(1)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  
  const stagedAvailability = useRef<boolean | null>(null)
  const stagedPrice = useRef<number | null>(null)
  const [trigger, setTrigger] = useState(0) // For force re-render on ref change

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

  const totalInSelectedCategory = rooms.filter(r => r.category === selectedCategory).length

  const handleUnifiedSave = async () => {
    if ((isMultiRoom ? !selectedCategory : !selectedRoom) || selectedDates.length === 0) return
    
    setIsUpdating(true)
    try {
      const dateStrings = selectedDates.map(d => format(d, 'yyyy-MM-dd'))
      
      let result
      if (isMultiRoom) {
        result = await saveCategoryChanges(
          propertyId,
          selectedCategory,
          dateStrings,
          roomsToUpdateCount,
          stagedAvailability.current,
          stagedPrice.current
        )
      } else {
        result = await saveMultipleChanges(
          propertyId, 
          selectedRoom, 
          dateStrings, 
          stagedAvailability.current, 
          stagedPrice.current
        )
      }
      
      if (result?.error) {
        alert(result.error)
      } else {
        setSelectedDates([])
        stagedAvailability.current = null
        stagedPrice.current = null
        setTrigger(t => t + 1)
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
    stagedAvailability.current = null
    stagedPrice.current = null
    setTrigger(t => t + 1)
  }

  return (
    <div className={`flex flex-col gap-6 relative ${selectedDates.length > 0 ? 'pb-[400px] md:pb-24' : 'pb-32 md:pb-24'}`}>
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-3 sm:p-4 rounded-xl border">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] font-bold uppercase text-gray-400">
            {isMultiRoom ? 'Selected Category' : 'Selected Room'}
          </Label>
          {isMultiRoom ? (
            <select 
              className="border-2 border-blue-100 rounded-lg px-3 py-2 text-sm bg-white font-bold shadow-sm min-w-[220px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value)
                setRoomsToUpdateCount(1)
                clearSelection()
              }}
            >
              {categories.map(c => (
                <option key={c} value={c}>{c} Rooms</option>
              ))}
            </select>
          ) : (
            <select 
              className="border-2 border-blue-100 rounded-lg px-3 py-2 text-sm bg-white font-bold shadow-sm min-w-[220px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={selectedRoom}
              onChange={e => {
                setSelectedRoom(e.target.value)
                clearSelection()
              }}
              disabled={!rooms.length}
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center min-w-[140px]">
            <h3 className="text-lg font-bold text-blue-900">{format(months[activeMonthIndex], 'MMMM yyyy')}</h3>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-2 border-blue-50" onClick={() => scrollToMonth(Math.max(0, activeMonthIndex - 1))} disabled={activeMonthIndex === 0}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-2 border-blue-50" onClick={() => scrollToMonth(Math.min(months.length - 1, activeMonthIndex + 1))} disabled={activeMonthIndex === months.length - 1}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Multi-Select Bulk Action Bar */}
      {selectedDates.length > 0 && (
        <div className="fixed bottom-[90px] md:bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-3xl animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-white border-2 border-blue-600 shadow-2xl rounded-3xl p-5 flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-200">
                  {selectedDates.length}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 leading-tight">Dates Selected</p>
                  <button onClick={clearSelection} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest mt-0.5">Clear Selection</button>
                </div>
              </div>

              {isMultiRoom && (
                <div className="flex flex-col items-end gap-1">
                  <Label className="text-[9px] font-black uppercase text-gray-400">Rooms to Update</Label>
                  <div className="flex items-center gap-2 bg-gray-50 border rounded-lg p-1">
                     <Button 
                      size="icon" variant="ghost" className="h-7 w-7" 
                      onClick={() => setRoomsToUpdateCount(Math.max(1, roomsToUpdateCount - 1))}
                      disabled={roomsToUpdateCount <= 1}
                     >
                      <Minus className="w-3 h-3" />
                     </Button>
                     <span className="w-8 text-center font-black text-sm">{roomsToUpdateCount}</span>
                     <Button 
                      size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setRoomsToUpdateCount(Math.min(totalInSelectedCategory, roomsToUpdateCount + 1))}
                      disabled={roomsToUpdateCount >= totalInSelectedCategory}
                     >
                      <Plus className="w-3 h-3" />
                     </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                <Button 
                  onClick={() => { stagedAvailability.current = false; setTrigger(t => t + 1); }} 
                  variant={stagedAvailability.current === false ? 'default' : 'outline'}
                  className={`h-11 px-6 text-xs font-black gap-2 transition-all rounded-xl ${stagedAvailability.current === false ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-100 hover:bg-red-50'}`}
                >
                  <XCircle className="w-4 h-4" /> Block
                </Button>
                <Button 
                  onClick={() => { stagedAvailability.current = true; setTrigger(t => t + 1); }} 
                  variant={stagedAvailability.current === true ? 'default' : 'outline'}
                  className={`h-11 px-6 text-xs font-black gap-2 transition-all rounded-xl ${stagedAvailability.current === true ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-100 hover:bg-green-50'}`}
                >
                  <CheckCircle className="w-4 h-4" /> Open
                </Button>
                
                <select
                  onChange={(e) => { stagedPrice.current = parseInt(e.target.value.replace(/[^\d]/g, '')); setTrigger(t => t + 1); }}
                  className="bg-blue-50 border-2 border-blue-100 text-blue-700 h-11 px-4 rounded-xl text-xs font-black focus:ring-2 focus:ring-blue-600 outline-none w-[160px]"
                  value={stagedPrice.current ? `₹${stagedPrice.current}` : ""}
                >
                  <option value="" disabled>Set Price...</option>
                  {PRICE_BUCKETS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <Button 
                onClick={handleUnifiedSave}
                disabled={isUpdating || (stagedAvailability.current === null && stagedPrice.current === null)}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 h-11 px-8 font-black gap-2 rounded-xl shadow-xl shadow-blue-100"
              >
                {isUpdating ? 'Saving...' : 'Apply Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Slidable Calendar Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none no-scrollbar rounded-2xl border bg-white shadow-sm"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {months.map((monthDate, mIndex) => {
          const start = startOfMonth(monthDate)
          const end = endOfMonth(monthDate)
          const calendarStart = startOfWeek(start)
          const calendarEnd = endOfWeek(end)
          
          const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
          
          return (
            <div key={mIndex} className="min-w-full snap-start p-3 sm:p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div key={day} className={`text-center text-[9px] font-black text-gray-300 uppercase tracking-widest py-1`}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const isCurrentMonth = isSameMonth(date, monthDate)
                  
                  // For multi-room, we show a summary in the cell
                  const categoryRooms = rooms.filter(r => r.category === selectedCategory)
                  const roomIds = isMultiRoom ? categoryRooms.map(r => r.id) : [selectedRoom]
                  
                  const dateAvailability = availability.filter(a => roomIds.includes(a.room_id) && a.date === dateStr)
                  const blockedCount = dateAvailability.filter(a => !a.available).length
                  
                  // Subtract actual bookings from room inventory for this date
                  const bookedCount = bookings.filter(b => 
                    roomIds.includes(b.room_id) && 
                    b.checkin_date && b.checkout_date &&
                    dateStr >= b.checkin_date && dateStr < b.checkout_date
                  ).length
                  
                  const availableCount = isMultiRoom 
                    ? Math.max(0, categoryRooms.length - blockedCount - bookedCount) 
                    : (dateAvailability[0]?.available !== false && bookedCount === 0 ? 1 : 0)
                  
                  const dateRates = rates.filter(r => roomIds.includes(r.room_id) && r.date === dateStr)
                  const basePrice = isMultiRoom 
                    ? (categoryRooms[0]?.base_price || 0) 
                    : (rooms.find(r => r.id === selectedRoom)?.base_price || 0)
                  
                  // Show the common price, or the first one if mixed
                  const displayPrice = dateRates[0] ? dateRates[0].price : basePrice

                  const isSelected = selectedDates.some(d => isSameDay(d, date))
                  const isToday = isSameDay(date, today)
                  
                  return (
                    <div 
                      key={dateStr}
                      onClick={() => toggleDateSelection(date)}
                      className={`
                        min-h-[60px] sm:min-h-[80px] border-2 rounded-xl p-2 flex flex-col transition-all cursor-pointer relative group
                        ${!isCurrentMonth ? 'opacity-0 pointer-events-none' : 'bg-white border-gray-50 hover:border-blue-300 hover:shadow-lg'}
                        ${isSelected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100 ring-offset-1' : ''}
                        ${availableCount === 0 && isCurrentMonth ? 'bg-red-50/30' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`
                          text-xs font-black 
                          ${isToday ? 'text-white bg-blue-600 px-1.5 py-0.5 rounded-lg' : isSelected ? 'text-blue-700' : 'text-gray-400'}
                        `}>
                          {format(date, 'd')}
                        </span>
                        {isSelected && (
                          <CheckCircle className="w-3.5 h-3.5 text-blue-600 animate-in zoom-in-50 duration-200" />
                        )}
                        {isMultiRoom && isCurrentMonth && !isSelected && (
                          <div className={`text-[8px] font-black uppercase px-1 rounded ${availableCount > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                            {availableCount}/{categoryRooms.length}
                          </div>
                        )}
                      </div>

                      {isCurrentMonth && (
                        <div className="mt-auto">
                          <div className={`text-[10px] sm:text-xs font-black flex items-baseline gap-0.5 leading-none mb-1.5 ${dateRates.length > 0 ? 'text-orange-600' : isSelected ? 'text-blue-600' : 'text-green-600'}`}>
                            <span className="text-[8px] uppercase">₹</span>
                            <span>{displayPrice.toLocaleString()}</span>
                          </div>
                          <div className={`h-1.5 w-full rounded-full bg-gray-100 overflow-hidden flex`}>
                             <div className={cn(
                               "h-full transition-all duration-500",
                               availableCount === 0 ? "bg-red-500" : "bg-green-500"
                             )} style={{ width: `${(availableCount / roomIds.length) * 100}%` }} />
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

      <div className="bg-white p-6 rounded-2xl border border-dashed flex flex-col md:flex-row gap-6 items-center justify-between text-gray-400">
        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="bg-blue-50 p-2 rounded-lg"><Info className="w-5 h-5 text-blue-600" /></div>
          <span>Select multiple dates to bulk update pricing or inventory for the category.</span>
        </div>
        <div className="flex flex-wrap gap-5 text-[10px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Fully Available</div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Fully Blocked</div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-600" /> Custom Rate</div>
        </div>
      </div>
    </div>
  )
}
