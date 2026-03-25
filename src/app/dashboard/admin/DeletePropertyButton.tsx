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
        const result = await deleteProperty(propertyId)
        if (result?.error) {
          alert(result.error)
        }
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
      variant="destructive" 
      size="sm" 
      onClick={handleDelete} 
      disabled={isLoading}
      className={cn("flex-shrink-0 gap-1", className)}
    >
      {isLoading ? '...' : <><Trash2 className="w-4 h-4" /> Delete</>}
    </Button>
  )
}
