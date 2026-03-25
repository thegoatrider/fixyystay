'use client'

import { useState } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CitySelectorProps {
  onCityChange?: (city: string) => void
  initialCity?: string
}

export function CitySelector({ onCityChange, initialCity = 'Alibag' }: CitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState(initialCity)

  const cities = [
    { name: 'Alibag', active: true },
    { name: 'Lonavala', active: false },
    { name: 'Khandala', active: false },
    { name: 'Matheran', active: false },
    { name: 'Mahableshwar', active: false },
    { name: 'Mumbai', active: false },
    { name: 'Goa', active: false },
  ]

  const handleSelect = (city: string) => {
    setSelectedCity(city)
    setIsOpen(false)
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
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white border border-gray-100 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="py-2">
              <div className="px-4 py-2 mb-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select Destination</span>
              </div>
              {cities.map((city) => (
                <button
                  key={city.name}
                  disabled={!city.active}
                  onClick={() => handleSelect(city.name)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between",
                    city.active 
                      ? "text-gray-900 hover:bg-blue-50 hover:text-blue-600 group" 
                      : "text-gray-300 cursor-not-allowed italic"
                  )}
                >
                  <span className={cn("font-medium", city.active && "group-hover:translate-x-1 transition-transform")}>
                    {city.name}
                  </span>
                  {!city.active && (
                    <span className="text-[9px] font-bold bg-gray-50 px-1.5 py-0.5 rounded uppercase tracking-tighter text-gray-400">
                      Coming Soon
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
