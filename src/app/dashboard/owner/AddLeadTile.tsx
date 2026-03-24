'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, Phone, UserPlus } from 'lucide-react'
import { createLead } from './leads-actions'
import { CollapsibleTile } from '@/components/CollapsibleTile'

type Property = { id: string; name: string }

export default function AddLeadTile({ ownerId = '', properties }: { ownerId?: string, properties: Property[] }) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '')
  const [phone, setPhone] = useState('')
  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')

  async function handleCreateEnquiry(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    const result = await createLead({ ownerId, propertyId: selectedPropertyId, phoneNumber: phone, checkinDate: checkin, checkoutDate: checkout })
    
    if (result.success && result.lead) {
      const propertyName = properties.find(p => p.id === selectedPropertyId)?.name || 'Property'
      const message = `Hello! I am the owner of ${propertyName}. I am following up on your enquiry for the dates ${checkin || 'TBD'} to ${checkout || 'TBD'}. View property: https://www.fixystays.com/guest/property/${selectedPropertyId}`
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
      
      setPhone('')
      setCheckin('')
      setCheckout('')
      alert("Enquiry created successfully and added to your Leads Calendar!")
    } else {
      alert(result.error || 'Failed to create lead')
    }
    setIsLoading(false)
  }

  return (
    <CollapsibleTile title="Create New Enquiry (Lead)" icon={UserPlus}>
      <form onSubmit={handleCreateEnquiry} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label>Select Property</Label>
          <select value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm" required>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input placeholder="9876543210" className="pl-9 bg-white" value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Check-in</Label>
          <Input type="date" className="bg-white" value={checkin} onChange={e => setCheckin(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Check-out</Label>
          <Input type="date" className="bg-white" value={checkout} onChange={e => setCheckout(e.target.value)} />
        </div>
        <div className="lg:col-span-4 flex justify-end mt-2">
          <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 h-10 px-8 gap-2 w-full md:w-auto">
            {isLoading ? 'Creating...' : <><MessageCircle className="w-4 h-4" /> Save Lead & Message</>}
          </Button>
        </div>
      </form>
    </CollapsibleTile>
  )
}
