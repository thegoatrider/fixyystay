'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Copy, ShieldAlert, AlertCircle } from 'lucide-react'
import { onboardPolice } from './actions'

export function CreatePoliceForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ email: string, pass: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessData(null)

    const formData = new FormData(e.currentTarget)
    const result = await onboardPolice(formData)

    if (result.success) {
      setSuccessData({
        email: formData.get('email') as string,
        pass: result.tempPassword || 'Police@2026'
      })
      e.currentTarget.reset()
    } else {
      setError(result.error || 'Failed to onboard police official.')
    }
    setIsLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (successData) {
    return (
      <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-4 text-blue-800">
          <CheckCircle className="w-6 h-6 font-black" />
          <h3 className="text-lg font-black uppercase tracking-tight">Police Account Synced Successfully!</h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-blue-100">
            <p className="text-xs font-black text-gray-400 uppercase mb-2">Law Enforcement Credentials</p>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border mb-2">
              <span className="font-mono text-sm">{successData.email}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => copyToClipboard(successData.email)}><Copy className="w-4 h-4" /></Button>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
              <span className="font-mono text-sm font-bold text-blue-700">{successData.pass}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => copyToClipboard(successData.pass)}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <p className="text-xs text-blue-600 font-medium">This login is immediately active with full verified access to the Law Enforcement Hub.</p>
          <Button type="button" onClick={() => setSuccessData(null)} className="w-full bg-blue-900 hover:bg-blue-950 text-white">
            Add Another Police Official
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-900 text-white rounded-xl">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Onboard Police Official</h2>
          <p className="text-xs text-gray-500 font-medium">Create a verified login for local police station officials.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="station_name" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Station Name / Jurisdiction</Label>
          <Input id="station_name" name="stationName" placeholder="e.g. Alibag Police Station" required className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="officer_name" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Officer Name (Optional)</Label>
          <Input id="officer_name" name="officerName" placeholder="e.g. Inspector Shinde" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email_police" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Official Email Address</Label>
          <Input id="email_police" name="email" type="email" placeholder="police.alibag@gov.in or official@fixystays.com" required className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password_police" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Password (Optional)</Label>
          <Input id="password_police" name="password" placeholder="Defaults to Police@2026" className="rounded-xl h-12" />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-lg font-black shadow-md">
          {isLoading ? 'Creating...' : 'Register Police Account'}
        </Button>
      </form>
    </div>
  )
}
