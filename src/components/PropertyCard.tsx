'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Home, CheckCircle, Clock, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import React from 'react'

type Property = {
  id: string
  name: string
  type: string
  image_url: string | null
  approved: boolean
  uid: string
  room_count: number
}

export const PropertyCard = React.memo(({ prop }: { prop: Property }) => {
  return (
    <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col group w-full h-full select-none">
      {/* Top Image Container */}
      <div className="bg-blue-50 relative aspect-[16/10] w-full overflow-hidden border-b border-gray-100 flex-shrink-0">
        {prop.image_url ? (
          <Image 
            src={prop.image_url} 
            alt={prop.name} 
            fill 
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={false}
          />
        ) : (
          <div className="flex w-full h-full items-center justify-center text-blue-400 bg-gradient-to-br from-blue-50 to-white">
            <Building className="w-10 h-10 transition-transform duration-300 group-hover:scale-110" />
          </div>
        )}
        
        {/* Absolute Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="text-[10px] font-black text-blue-600 bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg border border-blue-100 shadow-sm uppercase tracking-wider">
            {prop.uid || 'NO-ID'}
          </span>
        </div>

        <div className="absolute top-3 right-3 z-10">
          {prop.approved ? (
            <span className="bg-green-500/90 backdrop-blur text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <CheckCircle className="w-3 h-3" /> Approved
            </span>
          ) : (
            <span className="bg-orange-500/90 backdrop-blur text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Clock className="w-3 h-3" /> Pending
            </span>
          )}
        </div>
      </div>

      {/* Property Details */}
      <div className="p-5 flex flex-col justify-between flex-1 gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition truncate leading-snug">
            {prop.name}
          </h2>
          <p className="text-xs text-gray-400 capitalize font-semibold tracking-wide">
            {prop.type} • {prop.room_count || 0} Rooms
          </p>
          
          {!prop.approved && (
            <div className="mt-2 bg-orange-50/50 border border-orange-100/50 p-2.5 rounded-xl text-center">
              <p className="text-[9px] sm:text-[10px] text-orange-700 font-bold leading-normal">
                📞 Call <span className="underline">7506288907</span> for admin approval
              </p>
            </div>
          )}
        </div>

        {/* Buttons Grid */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-50 flex-shrink-0">
          <Link href={`/dashboard/owner/property/${prop.id}/edit`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-10 font-bold border-gray-200 hover:bg-gray-50 rounded-xl transition text-xs">
              Edit Details
            </Button>
          </Link>
          <Link href={`/dashboard/owner/property/${prop.id}`} className="flex-1">
            <Button variant="default" size="sm" className="w-full h-10 font-bold shadow-md hover:shadow-lg rounded-xl transition text-xs">
              Manage Stay
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
})

PropertyCard.displayName = 'PropertyCard'

