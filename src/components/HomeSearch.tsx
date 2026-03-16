'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function HomeSearch() {
  const router = useRouter()
  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')
  const [guests, setGuests] = useState('2')

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
        <div className="px-4 py-3 flex flex-col items-start gap-1 relative">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-in</label>
          <input 
            type="date" 
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            className="text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full cursor-pointer"
          />
        </div>

        {/* Check-out */}
        <div className="px-4 py-3 flex flex-col items-start gap-1 relative">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-out</label>
          <input 
            type="date" 
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            className="text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full cursor-pointer"
          />
        </div>

        {/* Guests */}
        <div className="px-4 py-3 flex flex-col items-start gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guests</label>
          <select 
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="text-sm font-medium text-gray-900 bg-transparent border-none appearance-none outline-none w-full cursor-pointer focus:ring-0 p-0"
          >
            <option value="1">1 Guest</option>
            <option value="2">2 Guests</option>
            <option value="3">3 Guests</option>
            <option value="4">4+ Guests</option>
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
