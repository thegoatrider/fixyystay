'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProperty } from './actions'

export default function CreatePropertyForm() {
  const [propertyType, setPropertyType] = useState('villa')
  const [isLoading, setIsLoading] = useState(false)

  return (
    <form action={(formData) => {
      setIsLoading(true)
      createProperty(formData).catch(() => setIsLoading(false))
    }} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Property Name</Label>
        <Input name="name" required placeholder="e.g. Beachfront Villa" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="type">Property Type</Label>
        <select 
          name="type" 
          className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" 
          required
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
        >
          <option value="villa">Villa</option>
          <option value="multi-room property">Multi-room Property</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea 
          name="description" 
          required 
          rows={3}
          placeholder="Describe the property..."
          className="flex w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amenities">Amenities</Label>
        <Input name="amenities" required placeholder="WiFi, Pool, AC (comma separated)" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priceBucket">Maximum Price Cap / Category</Label>
        <select name="priceBucket" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" required>
          <option value="" disabled selected>Select max price bucket...</option>
          {propertyType === 'villa' ? (
            <>
              <option value="₹4999">₹4999</option>
              <option value="₹7999">₹7999</option>
              <option value="₹9999">₹9999</option>
              <option value="₹14999">₹14999</option>
              <option value="₹19999">₹19999</option>
              <option value="₹24999">₹24999</option>
              <option value="₹29999">₹29999</option>
              <option value="₹39999">₹39999</option>
              <option value="₹49999">₹49999</option>
            </>
          ) : (
            <>
              <option value="₹799">₹799</option>
              <option value="₹999">₹999</option>
              <option value="₹1299">₹1299</option>
              <option value="₹1499">₹1499</option>
              <option value="₹1999">₹1999</option>
              <option value="₹2499">₹2499</option>
              <option value="₹2999">₹2999</option>
              <option value="₹3499">₹3499</option>
              <option value="₹3999">₹3999</option>
              <option value="₹6999">₹6999</option>
            </>
          )}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cityArea">Rough Area / City (e.g. Alibag, Varsoli)</Label>
        <Input name="cityArea" required placeholder="This will be shown to all guests" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Precise Location</Label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  (document.querySelector('input[name="latitude"]') as HTMLInputElement).value = pos.coords.latitude.toString();
                  (document.querySelector('input[name="longitude"]') as HTMLInputElement).value = pos.coords.longitude.toString();
                  alert('Location captured successfully!')
                })
              } else {
                alert('Geolocation is not supported by your browser.')
              }
            }}
          >
            Use Current Location
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input name="latitude" required placeholder="Latitude" readOnly className="bg-gray-50 text-gray-500" />
          <Input name="longitude" required placeholder="Longitude" readOnly className="bg-gray-50 text-gray-500" />
        </div>
        <p className="text-[10px] text-gray-400">Guests will only see the precise location after booking.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="helpdeskNumber">Helpdesk Number</Label>
        <Input name="helpdeskNumber" required placeholder="e.g. +91 98765 43210" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Property Image</Label>
        <Input name="image" type="file" accept="image/*" />
      </div>

      <Button type="submit" className="w-full mt-2" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Property'}
      </Button>
    </form>
  )
}
