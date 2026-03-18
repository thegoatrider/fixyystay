'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteProperty } from './actions'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DeletePropertyButton({ 
  propertyId, 
  propertyName, 
  variant = 'destructive',
  className
}: { 
  propertyId: string, 
  propertyName: string, 
  variant?: any,
  className?: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (confirm(`Are you absolutely sure you want to delete "${propertyName}"? This will remove it from everywhere on the website and delete all its images.`)) {
      setIsLoading(true)
      try {
        await deleteProperty(propertyId)
      } catch (err) {
        console.error(err)
        alert('Failed to delete property. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Button 
      variant={variant} 
      size="sm" 
      onClick={handleDelete} 
      disabled={isLoading}
      className={cn(
        variant === 'destructive' ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-100' : '',
        className
      )}
    >
      {isLoading ? '...' : <><Trash2 className="w-4 h-4 mr-1" /> Delete</>}
    </Button>
  )
}
