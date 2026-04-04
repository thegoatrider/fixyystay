'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Copy, UserPlus, AlertCircle } from 'lucide-react'
import { onboardPartner } from './actions'

export function CreatePartnerForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ email: string, pass: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessData(null)

    const formData = new FormData(e.currentTarget)
    const result = await onboardPartner(formData)

    if (result.success) {
      setSuccessData({
        email: formData.get('email') as string,
        pass: result.tempPassword || 'FixyOwner@2026'
      })
      e.currentTarget.reset()
    } else {
      setError(result.error || 'Failed to onboard partner.')
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
          <h3 className="text-lg font-black uppercase tracking-tight">Partner Onboarded Successfully!</h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-green-100">
            <p className="text-xs font-black text-gray-400 uppercase mb-2">Login Credentials</p>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
              <span className="font-mono text-sm">{successData.email}</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(successData.email)}><Copy className="w-4 h-4" /></Button>
            </div>
            <div className="mt-2 flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
              <span className="font-mono text-sm font-bold text-blue-600">{successData.pass}</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(successData.pass)}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <p className="text-sm text-green-600 font-medium italic">
            * Share these credentials with the owner. They can change their password after logging in.
          </p>
          <Button onClick={() => setSuccessData(null)} className="w-full bg-green-600 hover:bg-green-700">
            Add Another Partner
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Create New Partner</h2>
          <p className="text-xs text-gray-500 font-medium">Onboard an owner after they pay for a subscription.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Full Name</Label>
            <Input id="name" name="name" placeholder="e.g. Mukesh Ambani" required className="rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Email Address</Label>
            <Input id="email" name="email" type="email" placeholder="owner@gmail.com" required className="rounded-xl h-12" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="plan" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Selected Plan</Label>
            <select name="plan" id="plan" required className="w-full h-12 rounded-xl border px-3 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-blue-500">
              <optgroup label="Subscription Tiers">
                <option value="Monthly">Monthly - ₹399</option>
                <option value="Quarterly">Quarterly - ₹1099</option>
                <option value="6-Months">6 Months - ₹1999</option>
                <option value="Yearly">Yearly - ₹3999</option>
              </optgroup>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Amount Paid (₹)</Label>
            <Input id="amount" name="amount" type="number" placeholder="399, 1099, etc." required className="rounded-xl h-12 font-bold text-green-600 focus:bg-white" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentRef" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Payment Ref / Screenshot URL</Label>
          <Input id="paymentRef" name="paymentRef" placeholder="Razorpay ID, UTR Number, or Google Drive link" className="rounded-xl h-12" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Password (Optional)</Label>
          <Input id="password" name="password" placeholder="Defaults to FixyOwner@2026" className="rounded-xl h-12" />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-lg font-black shadow-lg">
          {isLoading ? 'Creating Account...' : 'Finish Onboarding'}
        </Button>
      </form>
    </div>
  )
}
