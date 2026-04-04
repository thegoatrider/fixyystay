'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react'
import { updatePassword } from '../actions'

export default function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result = await updatePassword(formData)

    if (result.success) {
      setSuccess(true)
      e.currentTarget.reset()
    } else {
      setError(result.error || 'Failed to update password.')
    }
    setIsLoading(false)
  }

  return (
    <div className="bg-white border ring-1 ring-gray-100 rounded-[32px] p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-black text-gray-900 tracking-tight">Security</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">New Password</Label>
          <Input name="password" type="password" required className="h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white transition shadow-inner" placeholder="••••••••" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Confirm New Password</Label>
          <Input name="confirmPassword" type="password" required className="h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white transition shadow-inner" placeholder="••••••••" />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-600 rounded-xl text-xs font-bold border border-green-100 animate-in fade-in slide-in-from-top-1">
            <CheckCircle className="w-4 h-4" /> Password updated successfully!
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full h-12 bg-gray-900 hover:bg-black text-white font-black rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
          {isLoading ? 'Updating...' : 'Sync Security Update'}
        </Button>
      </form>
    </div>
  )
}
