'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, isAfter, isBefore, isSameDay } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { Calendar as CalendarIcon, Users } from 'lucide-react'

export function HomeSearch() {
  const router = useRouter()
  const [range, setRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined
  })
  const [guests, setGuests] = useState('2')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (range?.from) params.set('checkin', format(range.from, 'yyyy-MM-dd'))
    if (range?.to) params.set('checkout', format(range.to, 'yyyy-MM-dd'))
    if (guests) params.set('guests', guests)
    
    router.push(`/guest?${params.toString()}`)
  }

  const handleSelectRange = (newRange: DateRange | undefined) => {
    setRange(newRange)
    // If both dates are selected, close the calendar after a short delay
    if (newRange?.from && newRange?.to) {
      setTimeout(() => setIsCalendarOpen(false), 300)
    }
  }

  return (
    <div className="bg-white border shadow-2xl rounded-3xl p-6 w-full max-w-4xl flex flex-col gap-5 relative group" ref={containerRef}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-2 border-gray-100 rounded-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x relative">
        
        {/* Date Selection Trigger */}
        <div 
          className="md:col-span-2 grid grid-cols-2 divide-x cursor-pointer hover:bg-blue-50/30 transition-all group/dates"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        >
          {/* Check-in Display */}
          <div className="px-6 py-4 flex flex-col items-start gap-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
              <CalendarIcon className="w-3 h-3 text-blue-500" /> Check-in
            </label>
            <div className={cn(
              "text-base font-bold transition-colors",
              range?.from ? "text-gray-900" : "text-gray-400"
            )}>
              {range?.from ? format(range.from, 'MMM dd, yyyy') : 'Add date'}
            </div>
          </div>

          {/* Check-out Display */}
          <div className="px-6 py-4 flex flex-col items-start gap-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
              <CalendarIcon className="w-3 h-3 text-blue-500" /> Check-out
            </label>
            <div className={cn(
              "text-base font-bold transition-colors",
              range?.to ? "text-gray-900" : "text-gray-400"
            )}>
              {range?.to ? format(range.to, 'MMM dd, yyyy') : 'Add date'}
            </div>
          </div>
        </div>

        {/* Guest Select */}
        <div className="px-6 py-4 bg-white flex flex-col items-start gap-1 relative md:col-span-1 group/guests hover:bg-blue-50/30 transition-all">
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
            <Users className="w-3 h-3 text-blue-500" /> Guests
          </label>
          <select 
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="text-base font-bold text-gray-900 bg-transparent border-none appearance-none outline-none w-full cursor-pointer focus:ring-0 p-0"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
            ))}
            <option value="11+">11+ Guests</option>
          </select>
        </div>

        {/* Compact Search Button on Desktop */}
        <div className="hidden md:flex items-center justify-center p-2 bg-white">
          <Button 
            onClick={handleSearch}
            className="w-full h-full bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-200 transition-all border-none py-3"
          >
            SEARCH
          </Button>
        </div>
      </div>

      {/* Premium Calendar Popover */}
      {isCalendarOpen && (
        <div className="absolute top-[calc(100%+12px)] left-0 md:left-auto right-0 md:right-auto z-50 bg-white border-2 border-blue-50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl p-4 animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-4 pt-2">
              <h4 className="text-sm font-black uppercase tracking-widest text-blue-900">Select dates</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setRange({ from: undefined, to: undefined })
                }}
                className="text-[10px] font-bold text-gray-400 hover:text-blue-600 uppercase"
              >
                Clear
              </Button>
            </div>
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelectRange}
              numberOfMonths={2}
              disabled={{ before: new Date() }}
              className="rounded-2xl border-none"
            />
          </div>
        </div>
      )}

      {/* Mobile Search Button */}
      <Button 
        onClick={handleSearch}
        size="lg" 
        className="md:hidden w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-[17px] font-black rounded-2xl shadow-xl shadow-blue-200 transition-all border-none"
      >
        Search Properties
      </Button>
    </div>
  )
}
