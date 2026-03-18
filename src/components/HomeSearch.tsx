'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function HomeSearch() {
  const router = useRouter()
  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')
  const [guests, setGuests] = useState('2')
  
  const checkinRef = useRef<HTMLInputElement>(null)
  const checkoutRef = useRef<HTMLInputElement>(null)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (checkin) params.set('checkin', checkin)
    if (checkout) params.set('checkout', checkout)
    if (guests) params.set('guests', guests)
    
    router.push(`/guest?${params.toString()}`)
  }

  return (
    <div className="bg-white border shadow-xl rounded-2xl p-6 w-full max-w-3xl flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x">
        {/* Check-in */}
        <div 
          className="px-4 py-3 flex flex-col items-start gap-1 relative cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => checkinRef.current?.showPicker()}
        >
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer">Check-in</label>
          <input 
            type="date" 
            ref={checkinRef}
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            className="text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full cursor-pointer"
          />
        </div>

        {/* Check-out */}
        <div 
          className="px-4 py-3 flex flex-col items-start gap-1 relative cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => checkoutRef.current?.showPicker()}
        >
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer">Check-out</label>
          <input 
            type="date" 
            ref={checkoutRef}
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            className="text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full cursor-pointer"
          />
        </div>

        {/* Guests */}
        <div className="px-4 py-3 flex flex-col items-start gap-1 cursor-default">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guests</label>
          <select 
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="text-sm font-medium text-gray-900 bg-transparent border-none appearance-none outline-none w-full cursor-pointer focus:ring-0 p-0"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
            ))}
            <option value="11+">11+ Guests</option>
          </select>
        </div>
      </div>
      
      <Button 
        onClick={handleSearch}
        size="lg" 
        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-[17px] font-semibold rounded-xl shadow-md transition-all border-none"
      >
        Search Properties
      </Button>
    </div>
  )
}
