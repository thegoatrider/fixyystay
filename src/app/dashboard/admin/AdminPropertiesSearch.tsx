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
          placeholder="Search by name, UID (PRP-...), or owner..."
          className="pl-9 h-9 text-sm"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-x-auto shadow-sm">
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
                      <Button type="submit" size="sm" variant="secondary" className="flex-shrink-0">Assign</Button>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  {query ? `No properties match "${query}"` : 'No approved properties yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {query && (
          <div className="px-6 py-2 bg-gray-50 border-t text-xs text-gray-400">
            Showing {filtered.length} of {properties.length} properties
          </div>
        )}
      </div>
    </div>
  )
}
