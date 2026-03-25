'use client'

import { useTransition } from 'react'
import { Star } from 'lucide-react'
import { toggleFeatured } from './actions'

export default function FeaturedToggle({ 
  propertyId, 
  featured 
}: { 
  propertyId: string
  featured: boolean 
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          const result = await toggleFeatured(propertyId, featured)
          if (result?.error) {
            alert(result.error)
          }
        })
      }}
      disabled={isPending}
      title={featured ? 'Remove from featured' : 'Mark as featured'}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all',
        featured
          ? 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
          : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600',
        isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer',
      ].join(' ')}
    >
      <Star className={`w-3.5 h-3.5 ${featured ? 'fill-yellow-400 text-yellow-500' : ''}`} />
      {isPending ? '...' : featured ? 'Featured' : 'Not featured'}
    </button>
  )
}
