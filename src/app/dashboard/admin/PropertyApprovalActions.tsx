'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { approveProperty, rejectProperty } from './actions'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export default function PropertyApprovalActions({ propertyId }: { propertyId: string }) {
  const [isPending, startTransition] = useTransition()
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleApprove = () => {
    setErrorMessage(null)
    startTransition(async () => {
      const result = await approveProperty(propertyId)
      if (result?.error) {
        setErrorMessage(result.error)
      }
    })
  }

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setErrorMessage('A rejection reason is required.')
      return
    }
    setErrorMessage(null)
    startTransition(async () => {
      const result = await rejectProperty(propertyId, rejectionReason.trim())
      if (result?.error) {
        setErrorMessage(result.error)
      } else {
        setIsRejecting(false)
        setRejectionReason('')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {errorMessage && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isRejecting ? (
        <div className="flex gap-2 w-full">
          <Button
            type="button"
            disabled={isPending}
            onClick={handleApprove}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 text-xs flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isPending ? 'Processing...' : 'Approve'}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            variant="outline"
            onClick={() => setIsRejecting(true)}
            className="border-red-200 text-red-600 hover:bg-red-50 font-semibold py-2 text-xs flex items-center justify-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-3 bg-red-50/70 border border-red-200 rounded-xl">
          <label className="text-[11px] font-bold text-red-900">
            Rejection Reason (Mandatory):
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Incomplete photos, invalid phone number, or pricing mismatch..."
            rows={2}
            className="w-full text-xs p-2 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsRejecting(false)
                setErrorMessage(null)
              }}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleConfirmReject}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {isPending ? 'Rejecting...' : 'Confirm Reject'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
