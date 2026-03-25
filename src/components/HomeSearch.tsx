'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { Calendar as CalendarIcon, Users, X } from 'lucide-react'

export function HomeSearch({ selectedCity = 'Alibag' }: { selectedCity?: string }) {
  const router = useRouter()
  const [range, setRange] = useState<DateRange | undefined>({ from: undefined, to: undefined })
  const [guests, setGuests] = useState('2')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect screen size for responsive calendar
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
    if (selectedCity) params.set('city', selectedCity)
    router.push(`/guest?${params.toString()}`)
  }

  const handleSelectRange = (newRange: DateRange | undefined) => {
    setRange(newRange)
    if (newRange?.from && newRange?.to) {
      setTimeout(() => setIsCalendarOpen(false), 300)
    }
  }

  return (
    <div className="bg-white border shadow-2xl rounded-3xl p-6 w-full max-w-4xl flex flex-col gap-5 relative" ref={containerRef}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-2 border-gray-100 rounded-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x relative">
        
        {/* Date Selection Trigger */}
        <div
          className="md:col-span-2 grid grid-cols-2 divide-x cursor-pointer hover:bg-blue-50/30 transition-all"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        >
          {/* Check-in */}
          <div className="px-6 py-4 flex flex-col items-start gap-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5 pointer-events-none">
              <CalendarIcon className="w-3 h-3 text-blue-500" /> Check-in
            </label>
            <div className={cn("text-base font-bold transition-colors", range?.from ? "text-gray-900" : "text-gray-400")}>
              {range?.from ? format(range.from, 'MMM dd, yyyy') : 'Add date'}
            </div>
          </div>

          {/* Check-out */}
          <div className="px-6 py-4 flex flex-col items-start gap-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5 pointer-events-none">
              <CalendarIcon className="w-3 h-3 text-blue-500" /> Check-out
            </label>
            <div className={cn("text-base font-bold transition-colors", range?.to ? "text-gray-900" : "text-gray-400")}>
              {range?.to ? format(range.to, 'MMM dd, yyyy') : 'Add date'}
            </div>
          </div>
        </div>

        {/* Guest Select */}
        <div className="px-6 py-4 bg-white flex flex-col items-start gap-1 relative md:col-span-1 hover:bg-blue-50/30 transition-all">
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

        {/* Search Button (Desktop) */}
        <div className="hidden md:flex items-center justify-center p-2 bg-white">
          <Button
            onClick={handleSearch}
            className="w-full h-full bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-200 transition-all border-none py-3"
          >
            SEARCH
          </Button>
        </div>
      </div>

      {/* Calendar Popover — fixed positioning for mobile */}
      {isCalendarOpen && (
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-100",
          "shadow-[0_-5px_40px_rgba(0,0,0,0.15)] rounded-3xl", // Adjusted shadow for upward visual
          "animate-in fade-in zoom-in-95 duration-200 origin-bottom md:origin-top",
          // Mobile: anchor above the panel (opens up) | Desktop: anchor below the panel (opens down)
          "bottom-[calc(100%+12px)] md:bottom-auto md:top-[calc(100%+12px)]",
          // Mobile: almost full width, capped; Desktop: auto width
          "w-[calc(100vw-32px)] max-w-[700px]",
        )}>
          {/* Header */}
          <div className="flex justify-between items-center px-5 pt-4 pb-2 border-b border-gray-50">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-900">Select Dates</h4>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setRange({ from: undefined, to: undefined })}
                className="text-[11px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wider transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setIsCalendarOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors ml-2"
                aria-label="Close calendar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar — 1 month on mobile, 2 on desktop */}
          <div className="overflow-x-auto">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelectRange}
              numberOfMonths={isMobile ? 1 : 2}
              disabled={{ before: new Date() }}
              className="rounded-2xl border-none p-4"
            />
          </div>

          {/* Mobile Done button */}
          {isMobile && (
            <div className="px-4 pb-4">
              <Button
                onClick={() => setIsCalendarOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl"
              >
                Done
              </Button>
            </div>
          )}
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
