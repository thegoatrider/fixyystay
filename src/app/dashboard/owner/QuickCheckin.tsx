'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageSquare, Phone } from 'lucide-react'

type Property = {
  id: string
  name: string
}

export default function QuickCheckin({ properties }: { properties: Property[] }) {
  const [phone, setPhone] = useState('')
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '')

  const handleSendForm = () => {
    if (!phone || !selectedPropertyId) {
      alert('Please enter a phone number and select a property.')
      return
    }

    const propertyName = properties.find(p => p.id === selectedPropertyId)?.name || 'Property'
    const baseUrl = window.location.origin
    const checkinUrl = `${baseUrl}/checkin?p=${selectedPropertyId}`
    const message = `Hello! Please complete your check-in for ${propertyName} at FixyStay by filling out this ID form: ${checkinUrl}`
    
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setPhone('')
  }

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-900">
        <MessageSquare className="w-5 h-5" /> Send Guest ID Form
      </h3>
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="guestPhone">Guest Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input 
              id="guestPhone"
              placeholder="e.g. 9876543210" 
              className="pl-9"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkinProp">Select Property</Label>
          <select 
            id="checkinProp"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <Button 
          onClick={handleSendForm}
          className="bg-blue-600 hover:bg-blue-700 w-full gap-2 h-11"
        >
          Send ID Form on WhatsApp
        </Button>
      </div>
    </div>
  )
}
