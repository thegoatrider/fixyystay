'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, Plus, Calendar, Phone, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { createLead, updateLeadStatus, updateLeadMarking } from './leads-actions'

type Property = {
  id: string
  name: string
}

type Lead = {
  id: string
  property_id: string
  phone_number: string
  checkin_date: string | null
  checkout_date: string | null
  status: string
  marking: string
  created_at: string
  properties: { name: string }
}

export default function LeadsSection({ 
  ownerId, 
  properties, 
  initialLeads 
}: { 
  ownerId: string, 
  properties: Property[], 
  initialLeads: Lead[] 
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [isLoading, setIsLoading] = useState(false)
  const [isFormVisible, setIsFormVisible] = useState(false)

  // Form State
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '')
  const [phone, setPhone] = useState('')
  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')

  async function handleCreateEnquiry(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const result = await createLead({
      ownerId,
      propertyId: selectedPropertyId,
      phoneNumber: phone,
      checkinDate: checkin,
      checkoutDate: checkout
    })

    if (result.success && result.lead) {
      // WhatsApp Integration
      const propertyName = properties.find(p => p.id === selectedPropertyId)?.name || 'Property'
      const propertyUrl = `${window.location.origin}/guest/property/${selectedPropertyId}`
      const message = `Hello! I am the owner of ${propertyName}. I am following up on your enquiry for the dates ${checkin || 'TBD'} to ${checkout || 'TBD'}. You can view the property details here: ${propertyUrl}`
      const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      
      window.open(whatsappUrl, '_blank')
      
      // Update local state (in a real app, revalidatePath would handle this, but for ASAP feel, we update local)
      const newLead = { 
        ...result.lead, 
        properties: { name: propertyName } 
      } as Lead
      setLeads([newLead, ...leads])
      
      // Reset form
      setPhone('')
      setCheckin('')
      setCheckout('')
      setIsFormVisible(false)
    } else {
      alert(result.error || 'Failed to create lead')
    }
    setIsLoading(false)
  }

  async function handleStatusChange(leadId: string, newStatus: string) {
    const result = await updateLeadStatus(leadId, newStatus)
    if (result.success) {
      setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    }
  }

  async function handleMarkingChange(leadId: string, newMarking: string) {
    const result = await updateLeadMarking(leadId, newMarking)
    if (result.success) {
      setLeads(leads.map(l => l.id === leadId ? { ...l, marking: newMarking } : l))
    }
  }

  const statuses = ['Enquired', 'Clicked', 'Shortlisted', 'Booked', 'Cancelled']
  const markings = ['Hot', 'Warm', 'Cold', 'Booked']

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Leads Tracking</h2>
        <Button onClick={() => setIsFormVisible(!isFormVisible)} size="sm" className="gap-2">
          {isFormVisible ? 'Close Form' : <><Plus className="w-4 h-4"/> New Enquiry</>}
        </Button>
      </div>

      {isFormVisible && (
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl shadow-inner animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5"/> Manual Enquiry Creation
          </h3>
          <form onSubmit={handleCreateEnquiry} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="prop">Select Property</Label>
              <select 
                id="prop"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
                required
              >
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input 
                  id="phone"
                  placeholder="e.g. 9876543210" 
                  className="pl-9"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkin">Check-in</Label>
              <Input 
                id="checkin"
                type="date" 
                value={checkin}
                onChange={(e) => setCheckin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout">Check-out</Label>
              <Input 
                id="checkout"
                type="date" 
                value={checkout}
                onChange={(e) => setCheckout(e.target.value)}
              />
            </div>

            <div className="lg:col-span-4 flex justify-end">
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 w-full md:w-auto h-11 px-8 gap-2">
                {isLoading ? 'Creating...' : <><MessageCircle className="w-5 h-5"/> Create Enquiry & WhatsApp</>}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Leads List */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Property</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Phone</th>
                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Marking</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{lead.properties.name}</div>
                    <div className="text-xs text-gray-500">{new Date(lead.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700">
                    {lead.phone_number}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {lead.checkin_date || 'N/A'}</span>
                      <span className="flex items-center gap-1 translate-x-4">→ {lead.checkout_date || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className={`text-xs font-bold rounded-full px-3 py-1 border outline-none appearance-none cursor-pointer transition-colors ${
                        lead.status === 'Booked' ? 'bg-green-100 text-green-700 border-green-200' :
                        lead.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                        lead.status === 'Shortlisted' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                        'bg-blue-100 text-blue-700 border-blue-200'
                      }`}
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={lead.marking}
                      onChange={(e) => handleMarkingChange(lead.id, e.target.value)}
                      className={`text-xs font-bold rounded-md px-3 py-1 border outline-none cursor-pointer transition-colors ${
                        lead.marking === 'Hot' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        lead.marking === 'Cold' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                        lead.marking === 'Booked' ? 'bg-green-100 text-green-700 border-green-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}
                    >
                      {markings.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <a 
                      href={`https://wa.me/${lead.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hello! I am the owner of ${lead.properties.name}. I am following up on your enquiry for the dates ${lead.checkin_date || 'TBD'} to ${lead.checkout_date || 'TBD'}. You can view the property details here: ${typeof window !== 'undefined' ? window.location.origin : 'https://fixyystay.vercel.app'}/guest/property/${lead.property_id}`
                      )}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-green-600 hover:bg-green-50 rounded-full inline-block transition-colors"
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5"/>
                    </a>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                     <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                     No leads generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
