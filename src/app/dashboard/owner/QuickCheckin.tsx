'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, MessageSquare, User } from 'lucide-react'
import { CollapsibleTile } from '@/components/CollapsibleTile'
import { formatWhatsAppNumber, COUNTRY_CODES } from '@/lib/utils'

type Property = {
  id: string
  name: string
}

export default function QuickCheckin({ properties }: { properties: Property[] }) {
  const [countryCode, setCountryCode] = useState('91')
  const [phone, setPhone] = useState('')
  const [guestName, setGuestName] = useState('')
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '')

  const handleSendForm = () => {
    if (!phone || !selectedPropertyId) {
      alert('Please enter a phone number and select a property.')
      return
    }

    const propertyName = properties?.find(p => p.id === selectedPropertyId)?.name || 'Property'
    const baseUrl = window.location.origin
    const checkinUrl = `${baseUrl}/checkin?p=${selectedPropertyId}&pn=${phone}&gn=${encodeURIComponent(guestName)}`
    const message = `Hello ${guestName}! Please complete your check-in for ${propertyName} at FixyStay by filling out this ID form: ${checkinUrl}`
    
    const whatsappUrl = `https://wa.me/${formatWhatsAppNumber(phone, countryCode)}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setPhone('')
    setGuestName('')
  }

  return (
    <CollapsibleTile title="Send Guest ID Form" icon={MessageSquare}>
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="guestName">Guest Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input 
              id="guestName"
              placeholder="e.g. John Doe" 
              className="pl-9"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guestPhone">Guest Phone Number</Label>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-[100px] h-10 px-2 py-2 rounded-md border border-gray-300 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.icon} +{c.code}</option>
              ))}
            </select>
            <div className="relative flex-1">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkinProp">Select Property</Label>
          <select 
            id="checkinProp"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
          >
            {properties?.map(p => (
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
    </CollapsibleTile>
  )
}
