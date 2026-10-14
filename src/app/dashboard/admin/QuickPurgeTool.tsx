'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { purgeAccountAction } from './actions'

export default function QuickPurgeTool() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null)

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = email.trim().toLowerCase()
    if (!target) return

    const confirmPrompt = window.prompt(
      `⚠️ PERMANENT PURGE:\nThis will permanently delete ${target} from auth.users, owners, properties, subscriptions, and payments.\n\nType PURGE to proceed:`
    )
    if (confirmPrompt !== 'PURGE') return

    setLoading(true)
    setStatus(null)
    try {
      const res = await purgeAccountAction(target)
      if (res.success) {
        const rep = (res as any).report
        setStatus({
          success: true,
          message: `Successfully purged ${target}! Auth users deleted: ${rep?.auth_users_deleted || 0}, Owners deleted: ${rep?.owners_deleted || 0}, Subscriptions deleted: ${rep?.subscriptions_deleted || 0}.`,
        })
        setEmail('')
      } else {
        setStatus({ success: false, message: res.error || 'Failed to purge account' })
      }
    } catch (err: any) {
      setStatus({ success: false, message: err.message || 'Unexpected error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <h4 className="text-xs font-black uppercase text-red-900 tracking-wider">Purge & Reset Owner Account</h4>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Permanently remove an email from Supabase Auth (<code className="font-mono text-red-700 bg-red-100/50 px-1 py-0.5 rounded">auth.users</code>), <code className="font-mono text-red-700 bg-red-100/50 px-1 py-0.5 rounded">owners</code>, properties, subscriptions, and payments to allow recreating the account completely fresh.
      </p>
      <form onSubmit={handlePurge} className="flex flex-col sm:flex-row gap-2 max-w-md">
        <Input
          type="email"
          placeholder="e.g. langikishor068@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-10 text-xs bg-white border-red-200 focus:border-red-500 rounded-xl"
        />
        <Button
          type="submit"
          disabled={loading}
          className="h-10 px-4 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
          Purge Account
        </Button>
      </form>
      {status && (
        <div className={`mt-3 text-xs font-bold p-2.5 rounded-lg border flex items-center gap-2 ${
          status.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {status.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {status.message}
        </div>
      )}
    </div>
  )
}
