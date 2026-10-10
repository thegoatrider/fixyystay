'use client'

import { useState, useMemo } from 'react'
import { MapPin, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALL_POPULAR_CITIES } from '@/lib/india-locations'

interface CitySelectorProps {
  onCityChange?: (city: string) => void
  initialCity?: string
}

export function CitySelector({ onCityChange, initialCity = 'Alibag' }: CitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState(initialCity)
  const [searchQuery, setSearchQuery] = useState('')

  const baseCities = [
    'Alibag', 'Nagothane', 'Pali', 'Roha', 'Kolad', 'Mangaon', 'Goregaon', 'Tala',
    'Mhasla', 'Shrivardhan', 'Dighi Sagari', 'Mahad City', 'Mahad Taluka', 'Mahad MIDC',
    'Poladpur', 'Karjat', 'Neral', 'Matheran', 'Khopoli', 'Khalapur', 'Rasayani',
    'Pen', 'Vadkhal', 'Poynad', 'Dadar Sagari', 'Mandwa Sagari', 'Revdanda', 'Murud',
    'Lonavala', 'Khandala', 'Mahableshwar', 'Mumbai', 'Goa', 'Pune', 'Bengaluru',
    'Delhi', 'Jaipur', 'Udaipur', 'Manali', 'Shimla', 'Rishikesh'
  ]

  const allCities = useMemo(() => {
    const merged = Array.from(new Set([...baseCities, ...ALL_POPULAR_CITIES]))
    const q = searchQuery.trim().toLowerCase()
    if (!q) return merged
    return merged.filter((name) => name.toLowerCase().includes(q))
  }, [searchQuery])

  const handleSelect = (city: string) => {
    setSelectedCity(city)
    setIsOpen(false)
    setSearchQuery('')
    if (onCityChange) onCityChange(city)
  }

  return (
    <div className="relative inline-block text-left mb-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm hover:border-blue-600 transition-all group"
      >
        <MapPin className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600">
          {selectedCity}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setIsOpen(false)
              setSearchQuery('')
            }} 
          />
          <div className="absolute left-0 mt-2 w-64 max-h-[340px] rounded-2xl bg-white border border-gray-100 shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2.5 border-b border-gray-100 bg-gray-50/80">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city..."
                  className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 text-gray-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="py-1.5 overflow-y-auto flex-1">
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select Destination</span>
              </div>
              {allCities.length > 0 ? (
                allCities.map((cityName) => (
                  <button
                    key={cityName}
                    type="button"
                    onClick={() => handleSelect(cityName)}
                    className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between text-gray-900 hover:bg-blue-50 hover:text-blue-600 group"
                  >
                    <span className="font-medium group-hover:translate-x-1 transition-transform">
                      {cityName}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-gray-400 text-center">
                  No matching cities found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
