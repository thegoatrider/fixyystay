'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FileText } from 'lucide-react'
import { CollapsibleTile } from '@/components/CollapsibleTile'

type Property = {
  id: string
  name: string
}

export default function DigitizeRegisterTile({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState('')

  // Sync selectedPropertyId when properties list changes
  useEffect(() => {
    if (properties?.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id)
    }
  }, [properties, selectedPropertyId])

  const handleDigitizeRegister = () => {
    if (!selectedPropertyId) {
      alert('Please select a property.')
      return
    }

    const baseUrl = window.location.origin
    const registerUrl = `${baseUrl}/checkin?p=${selectedPropertyId}&mode=register`
    window.open(registerUrl, '_blank')
  }

  return (
    <CollapsibleTile title="Digitize Guest Register" icon={FileText}>
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="regProp">Select Property</Label>
          <select 
            id="regProp"
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
          onClick={handleDigitizeRegister}
          className="bg-blue-600 hover:bg-blue-700 w-full gap-2 h-11"
        >
          <FileText className="w-4 h-4" />
          Start Register Digitization (Register OCR)
        </Button>
      </div>
    </CollapsibleTile>
  )
}
