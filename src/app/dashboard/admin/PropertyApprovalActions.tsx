'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { approveProperty } from './actions'

export default function PropertyApprovalActions({ propertyId }: { propertyId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveProperty(propertyId)
      if (result?.error) {
        alert(result.error)
      }
    })
  }

  return (
    <Button 
      type="button" 
      disabled={isPending}
      onClick={handleApprove}
      className="w-full bg-green-600 hover:bg-green-700 text-white"
    >
      {isPending ? '...' : 'Approve'}
    </Button>
  )
}
