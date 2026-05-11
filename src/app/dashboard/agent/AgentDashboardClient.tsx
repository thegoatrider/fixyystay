'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateTrackingLink } from './actions'
import { Send, CheckCircle, Clock, Wallet, Banknote, Share2 } from 'lucide-react'

export default function AgentDashboardClient({ influencer, properties, links, walletBalance, earnings }: any) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append('influencerId', influencer.id)
    
    const res = await generateTrackingLink(formData)
    
    if (res.success && res.linkId) {
      // Create WhatsApp Link
      const customerPhone = formData.get('customerPhone') as string
      const propertyId = formData.get('propertyId') as string
      
      const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fixystays.com'
      const trackingUrl = `${appUrl}/guest/property/${propertyId}?ref=${res.linkId}`
      
      const message = `Hello! Here is the link to the property you requested. You can book directly using this link:\n\n${trackingUrl}`
      const waUrl = `https://wa.me/91${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      
      window.open(waUrl, '_blank')
      e.currentTarget.reset()
    } else {
      setError(res.error || 'Failed to generate link')
    }
    
    setIsLoading(false)
  }

  return (
    <>
      <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 p-4 opacity-10"><Wallet className="w-24 h-24" /></div>
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">Available Earnings</p>
          <p className="text-4xl font-black mb-6">₹{walletBalance.toLocaleString()}</p>
          <div className="flex gap-4">
            <div className="bg-white/10 px-4 py-2 rounded-xl flex-1 backdrop-blur-sm border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Earned</p>
              <p className="text-lg font-black">₹{earnings.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Share2 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Send Property Link</h2>
        </div>
        
        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Select Property</Label>
            <select name="propertyId" required className="w-full h-12 rounded-xl border px-3 bg-gray-50 font-medium">
              <option value="">Choose a property...</option>
              {properties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.uid || 'NO-ID'})</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Customer Name</Label>
            <Input name="customerName" placeholder="e.g. Rahul Kumar" required className="rounded-xl h-12" />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">WhatsApp Number</Label>
            <Input name="customerPhone" type="tel" placeholder="10 digit number" required className="rounded-xl h-12" />
          </div>

          {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

          <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-lg font-black shadow-lg flex gap-2">
            <Send className="w-5 h-5" /> {isLoading ? 'Generating...' : 'Send via WhatsApp'}
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" /> Recent Links
        </h2>
        
        {links.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed">
            No links sent yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {links.map((link: any) => (
              <div key={link.id} className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{link.customer_name}</h3>
                    <p className="text-xs text-gray-500">{link.customer_phone}</p>
                  </div>
                  {link.status === 'booked' ? (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Booked
                    </span>
                  ) : link.status === 'clicked' ? (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-black uppercase">
                      Clicked
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-black uppercase">
                      Sent
                    </span>
                  )}
                </div>
                
                <div className="bg-gray-50 p-2 rounded-lg text-xs font-medium text-gray-600 border">
                  {link.properties?.name}
                </div>
                
                {link.status === 'booked' && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg text-sm font-bold">
                    <Banknote className="w-4 h-4" /> Earned: ₹{Number(link.commission_earned || 0).toLocaleString()}
                  </div>
                )}
                <div className="text-[10px] text-gray-400 text-right">
                  {new Date(link.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
