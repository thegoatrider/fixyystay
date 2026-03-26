'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Home, CheckCircle, Clock } from 'lucide-react'
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
    <div className="bg-white border rounded-xl p-3 sm:p-5 hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 group w-full">
      <div className="flex items-start gap-3 sm:gap-4 w-full md:w-auto overflow-hidden">
        <div className="bg-blue-100 text-blue-600 rounded-lg overflow-hidden flex-shrink-0 relative w-14 h-14 sm:w-20 sm:h-20">
          {prop.image_url ? (
            <Image 
              src={prop.image_url} 
              alt={prop.name} 
              fill 
              className="object-cover"
              sizes="(max-width: 640px) 56px, 80px"
              priority={false}
            />
          ) : (
            <div className="flex w-full h-full items-center justify-center">
              <Home className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-xl font-bold group-hover:text-blue-600 transition truncate">{prop.name}</h2>
            <span className="text-[10px] sm:text-xs font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
              {prop.uid || 'NO-ID'}
            </span>
          </div>
          <p className="text-[10px] sm:text-sm text-gray-400 capitalize truncate font-medium">{prop.type} • {prop.room_count || 0} Rooms</p>
          <div className="flex items-center gap-1 mt-1 sm:mt-2 text-[9px] sm:text-xs font-bold uppercase tracking-wider">
            {prop.approved ? (
              <span className="text-green-600 flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded"><CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> Approved</span>
            ) : (
              <span className="text-orange-500 flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded"><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> Pending</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex w-full md:w-auto items-center gap-2 pt-2 md:pt-0 border-t md:border-0 border-gray-50">
        <Link href={`/dashboard/owner/property/${prop.id}/edit`} className="flex-1 md:flex-none">
          <Button variant="outline" size="sm" className="w-full h-9 sm:h-10 font-bold border-gray-200">Edit</Button>
        </Link>
        <Link href={`/dashboard/owner/property/${prop.id}`} className="flex-1 md:flex-none">
          <Button variant="default" size="sm" className="w-full h-9 sm:h-10 font-bold shadow-md">Manage</Button>
        </Link>
      </div>
    </div>
  )
})

PropertyCard.displayName = 'PropertyCard'
