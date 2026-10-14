'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { purgeAccountAction } from './actions'

export default function PurgeAccountButton({ email, ownerName }: { email: string; ownerName?: string }) {
  const [loading, setLoading] = useState(false)

  const handlePurge = async () => {
    const confirmPrompt = window.prompt(
      `⚠️ PERMANENT PURGE WARNING:\nThis will permanently delete ${email} from auth.users, owners, properties, subscriptions, and payments.\n\nTo confirm, please type: PURGE`
    )

    if (confirmPrompt !== 'PURGE') {
      return
    }

    setLoading(true)
    try {
      const res = await purgeAccountAction(email)
      if (res.success) {
        alert(`Successfully purged ${email} and all associated records! The owner account can now be recreated fresh.`)
        window.location.reload()
      } else {
        alert(`Failed to purge: ${res.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Unexpected failure'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={handlePurge}
      className="h-8 px-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
      title={`Purge account for ${email}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
      Purge
    </Button>
  )
}
