'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Key, Link as LinkIcon, RefreshCw, Plus, Copy, Zap } from 'lucide-react'
import { createOrganization, regenerateApiKey, createSkeletonProperty } from './org-actions'

export default function OrganizationsManagement({ organizations }: { organizations: any[] }) {
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await createOrganization(formData)
    if (res?.error) {
      alert(`Error: ${res.error}`)
    } else {
      setIsCreating(false)
      ;(e.target as HTMLFormElement).reset()
    }
    setLoading(false)
  }

  const handleRegenerateKey = async (orgId: string) => {
    if (!confirm('Are you sure? Any existing integrations using the current API Key will break immediately.')) return
    
    const res = await regenerateApiKey(orgId)
    if (res?.error) {
      alert(`Error: ${res.error}`)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const handleCreateProperty = async (orgId: string) => {
    const propertyName = prompt('Enter a name for the new property/branch (e.g., "Ocean View - Downtown")')
    if (!propertyName) return

    setLoading(true)
    const res = await createSkeletonProperty(orgId, propertyName)
    if (res?.error) {
      alert(`Error: ${res.error}`)
    } else {
      alert('Property Generated successfully! ID copied to clipboard.')
      if (res?.property?.id) {
        navigator.clipboard.writeText(res.property.id)
      }
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl"><Building2 className="text-indigo-600 w-6 h-6" /></div>
          B2B White-Label Organizations
        </h2>
        <Button onClick={() => setIsCreating(!isCreating)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Organization
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="font-bold text-gray-900">Create New Organization</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input name="name" placeholder="Ocean View Resorts" required />
            </div>
            <div className="space-y-2">
              <Label>URL Slug (for hosted form)</Label>
              <Input name="slug" placeholder="oceanview" required />
            </div>
            <div className="space-y-2">
              <Label>Primary Brand Color (Hex)</Label>
              <Input name="primaryColor" placeholder="#FF5733" defaultValue="#2563EB" />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input name="logoUrl" placeholder="https://example.com/logo.png" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 text-white">
              {loading ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Organization</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Branding</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">API Key & Links</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-indigo-50/30">API Properties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {organizations?.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-lg">{org.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-1">ID: {org.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: org.primary_color }}></div>
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="logo" className="h-6 object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400 italic">No logo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Secret API Key</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800 font-mono flex-1 truncate max-w-[200px]">
                          {org.api_key}
                        </code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(org.api_key)}>
                          <Copy className="w-3 h-3 text-gray-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRegenerateKey(org.id)} title="Regenerate Key">
                          <RefreshCw className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Hosted Form Link</p>
                      <div className="flex items-center gap-2">
                        <a href={`/client/${org.slug}`} target="_blank" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                          <LinkIcon className="w-3 h-3" /> fixystays.com/client/{org.slug}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-l border-gray-100 min-w-[250px]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Properties ({org.properties?.length || 0})</p>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 py-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => handleCreateProperty(org.id)} disabled={loading}>
                        <Zap className="w-3 h-3 mr-1" /> Generate
                      </Button>
                    </div>
                    {org.properties && org.properties.length > 0 ? (
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                        {org.properties.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
                            <span className="text-[11px] font-medium text-gray-700 truncate mr-2" title={p.name}>{p.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <code className="text-[9px] text-gray-400 bg-white px-1 py-0.5 rounded border">
                                {p.id.split('-')[0]}...
                              </code>
                              <Button size="icon" variant="ghost" className="h-5 w-5 hover:bg-gray-200" onClick={() => copyToClipboard(p.id)} title="Copy Full ID">
                                <Copy className="w-2.5 h-2.5 text-gray-600" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic bg-gray-50/50 p-2 rounded text-center">No properties generated yet.</p>
                    )}
                  </td>
                </tr>
              ))}
              {(!organizations || organizations.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400">No organizations created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
