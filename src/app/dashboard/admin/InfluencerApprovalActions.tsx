'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { approveInfluencer, rejectInfluencer } from './actions'

export default function InfluencerApprovalActions({ influencerId }: { influencerId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleApprove = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await approveInfluencer(formData)
      if (result?.error) {
        alert(result.error)
      }
    })
  }

  const handleReject = () => {
    if (!confirm('Are you sure you want to reject this influencer?')) return
    startTransition(async () => {
      const result = await rejectInfluencer(influencerId)
      if (result?.error) {
        alert(result.error)
      }
    })
  }

  return (
    <div className="mt-auto flex flex-col gap-2">
      <form onSubmit={handleApprove} className="flex gap-2">
        <input type="hidden" name="influencerId" value={influencerId} />
        <div className="flex flex-col gap-1 w-1/3">
          <label className="text-[10px] uppercase text-gray-500 font-bold">Comm. %</label>
          <input 
            type="number" 
            name="commissionRate" 
            required 
            min="0" 
            max="100" 
            step="0.5" 
            defaultValue="5" 
            className="border rounded px-2 py-1.5 focus:ring-blue-500 outline-none text-sm w-full font-bold" 
          />
        </div>
        <div className="flex flex-col gap-1 w-full mt-2">
          <label className="text-[10px] uppercase text-gray-500 font-bold tracking-tighter">Link to User UUID (Auth ID)</label>
          <input 
            type="text" 
            name="userId" 
            placeholder="paste uuid from auth.users"
            className="border rounded px-2 py-1.5 focus:ring-blue-500 outline-none text-[10px] font-mono w-full" 
          />
        </div>
        <Button 
          type="submit" 
          size="sm" 
          disabled={isPending}
          className="w-2/3 bg-green-600 hover:bg-green-700 text-white mt-auto h-8"
        >
          {isPending ? '...' : 'Approve'}
        </Button>
      </form>
      <Button 
        type="button" 
        variant="destructive" 
        size="sm" 
        disabled={isPending}
        onClick={handleReject}
        className="w-full h-8"
      >
        Reject
      </Button>
    </div>
  )
}
