'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Copy, CarFront, AlertCircle } from 'lucide-react'
import { onboardAutowala } from './actions'

export function CreateAutowalaForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ email: string, pass: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessData(null)

    const formData = new FormData(e.currentTarget)
    const result = await onboardAutowala(formData)

    if (result.success) {
      setSuccessData({
        email: formData.get('email') as string,
        pass: result.tempPassword || 'AutoWala@2026'
      })
      e.currentTarget.reset()
    } else {
      setError(result.error || 'Failed to create autowala account.')
    }
    setIsLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (successData) {
    return (
      <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-4 text-green-700">
          <CheckCircle className="w-6 h-6 font-black" />
          <h3 className="text-lg font-black uppercase tracking-tight">Auto Waala Onboarded Successfully!</h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-green-100">
            <p className="text-xs font-black text-gray-400 uppercase mb-2">Login Credentials</p>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
              <span className="font-mono text-sm">{successData.email}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => copyToClipboard(successData.email)}><Copy className="w-4 h-4" /></Button>
            </div>
            <div className="mt-2 flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
              <span className="font-mono text-sm font-bold text-blue-600">{successData.pass}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => copyToClipboard(successData.pass)}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <Button type="button" onClick={() => setSuccessData(null)} className="w-full bg-green-600 hover:bg-green-700">
            Add Another Auto Waala
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">
          <CarFront className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Create Auto Waala</h2>
          <p className="text-xs text-gray-500 font-medium">Onboard a new auto driver as an affiliate.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name_aw" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Full Name</Label>
          <Input id="name_aw" name="name" placeholder="e.g. Ramesh Bhai" required className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email_aw" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Email Address</Label>
          <Input id="email_aw" name="email" type="email" placeholder="ramesh@autowala.com" required className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password_aw" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Password (Optional)</Label>
          <Input id="password_aw" name="password" placeholder="Defaults to AutoWala@2026" className="rounded-xl h-12" />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black text-lg font-black shadow-md">
          {isLoading ? 'Creating...' : 'Register Auto Waala'}
        </Button>
      </form>
    </div>
  )
}
