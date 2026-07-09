'use client'

import { useState } from 'react'
import { CitySelector } from '@/components/CitySelector'
import { HomeSearch } from '@/components/HomeSearch'

export function Hero({ title1 = "Find your perfect stay,", title2 = "or host your own." }: { title1?: string, title2?: string }) {
  const [selectedCity, setSelectedCity] = useState('Alibag')

  return (
    <div className="flex flex-col gap-10 items-center text-center w-full">
      <div className="flex flex-col items-center sm:items-start w-full max-w-4xl px-4">
        <CitySelector onCityChange={setSelectedCity} initialCity={selectedCity} />
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-4 text-center sm:text-left w-full">
          {title1} <br className="hidden sm:block" />
          <span className="text-blue-600">{title2}</span>
        </h1>
      </div>

      <HomeSearch selectedCity={selectedCity} />
    </div>
  )
}
