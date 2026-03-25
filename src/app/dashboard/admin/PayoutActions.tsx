'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { processPayout } from './actions'

export default function PayoutActions({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleAction = (status: 'approve' | 'reject') => {
    if (status === 'reject' && !confirm('Are you sure you want to reject this payout request?')) return

    startTransition(async () => {
      const result = await processPayout(requestId, status)
      if (result?.error) {
        alert(result.error)
      }
    })
  }

  return (
    <div className="flex justify-end gap-2">
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        disabled={isPending}
        onClick={() => handleAction('reject')}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        Reject
      </Button>
      <Button 
        type="button" 
        size="sm" 
        disabled={isPending}
        onClick={() => handleAction('approve')}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        {isPending ? '...' : 'Mark Paid'}
      </Button>
    </div>
  )
}
