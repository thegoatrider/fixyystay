'use client'

import { useState, useMemo } from 'react'
import { Search, QrCode, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import FeaturedToggle from './FeaturedToggle'
import DeletePropertyButton from './DeletePropertyButton'
import GuestCheckinQR from '@/components/GuestCheckinQR'

type Property = {
  id: string
  name: string
  type: string
  uid: string | null
  featured: boolean
  owners: { name: string } | null
}

type Influencer = {
  id: string
  name: string
}

export default function AdminPropertiesSearch({ 
  properties, 
  influencers
}: { 
  properties: Property[],
  influencers: Influencer[]
}) {
  const [query, setQuery] = useState('')
  const [qrModalProperty, setQrModalProperty] = useState<Property | null>(null)

  const filtered = useMemo(() => {
    if (!query) return properties
    const q = query.toLowerCase()
    return properties.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.uid && p.uid.toLowerCase().includes(q)) ||
      (p.owners?.name && p.owners.name.toLowerCase().includes(q)) ||
      p.type.toLowerCase().includes(q)
    )
  }, [properties, query])

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, UID (ALB-XXXX...), or owner..."
          className="pl-9 h-9 text-sm"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">Property Name</th>
              <th className="px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider">UID</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3 text-center">Featured</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((prop) => (
              <tr key={prop.id}>
                <td className="px-6 py-4 font-medium">{prop.name}</td>
                <td className="px-4 py-4">
                  {prop.uid ? (
                    <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold select-all">
                      {prop.uid}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-6 py-4">{prop.owners?.name}</td>
                <td className="px-6 py-4 capitalize">{prop.type}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <FeaturedToggle propertyId={prop.id} featured={!!prop.featured} />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-shrink-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={() => setQrModalProperty(prop)}
                    >
                      <QrCode className="w-4 h-4 mr-1" /> QR Code
                    </Button>
                    <DeletePropertyButton propertyId={prop.id} propertyName={prop.name} />
                    <Button asChild size="sm" variant="outline" className="flex-shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Link href={`/dashboard/admin/properties/${prop.id}`}>Manage</Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.map((prop) => (
          <div key={prop.id} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{prop.name}</h3>
                <p className="text-xs text-gray-500 capitalize">{prop.type} • Owner: {prop.owners?.name}</p>
                {prop.uid && (
                  <span className="inline-block mt-2 font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                    {prop.uid}
                  </span>
                )}
              </div>
              <FeaturedToggle propertyId={prop.id} featured={!!prop.featured} />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-9 font-bold"
                onClick={() => setQrModalProperty(prop)}
              >
                <QrCode className="w-4 h-4 mr-1" /> QR Code
              </Button>
              <DeletePropertyButton propertyId={prop.id} propertyName={prop.name} className="flex-1" />
              <Button asChild variant="outline" size="sm" className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 h-9 font-bold">
                <Link href={`/dashboard/admin/properties/${prop.id}`}>Manage Details</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center text-gray-400 bg-white border rounded-xl">
          {query ? `No properties match "${query}"` : 'No approved properties yet.'}
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm">
            <button 
              onClick={() => setQrModalProperty(null)}
              className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg text-gray-500 hover:text-gray-900 z-10 transition-transform hover:scale-110 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
            <GuestCheckinQR propertyId={qrModalProperty.id} propertyName={qrModalProperty.name} />
          </div>
        </div>
      )}
    </div>
  )
}

