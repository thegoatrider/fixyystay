'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import FeaturedToggle from './FeaturedToggle'
import DeletePropertyButton from './DeletePropertyButton'

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
  influencers,
  assignInfluencerAction
}: { 
  properties: Property[],
  influencers: Influencer[],
  assignInfluencerAction: (formData: FormData) => Promise<any>
}) {
  const [query, setQuery] = useState('')

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
                  <div className="flex items-center justify-end gap-3">
                    <form action={assignInfluencerAction} className="flex-shrink-0 flex items-center gap-2">
                      <input type="hidden" name="propertyId" value={prop.id} />
                      <select name="influencerId" className="border rounded px-2 py-1 bg-gray-50 text-sm" required defaultValue="">
                        <option value="" disabled>Select Influencer...</option>
                        {influencers?.map(inf => (
                          <option key={inf.id} value={inf.id}>{inf.name}</option>
                        ))}
                      </select>
                      <button type="submit" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-8 px-3 rounded-md text-xs font-bold flex-shrink-0 transition-colors">Assign</button>
                    </form>
                    <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
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

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assign Influencer</p>
              <form action={assignInfluencerAction} className="flex gap-2">
                <input type="hidden" name="propertyId" value={prop.id} />
                <select name="influencerId" className="flex-1 border rounded-md px-2 py-1.5 bg-white text-xs" required defaultValue="">
                  <option value="" disabled>Select...</option>
                  {influencers?.map(inf => (
                    <option key={inf.id} value={inf.id}>{inf.name}</option>
                  ))}
                </select>
                <button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95">Assign</button>
              </form>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
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
    </div>
  )
}
