'use client'

import { useState, useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, Plus, Phone, Trash2, ChevronLeft, ChevronRight, AlertCircle, X, Flame, Snowflake, Zap, CheckCircle } from 'lucide-react'
import { createLead, updateLeadStatus, updateLeadMarking, deleteLead } from './leads-actions'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React from 'react'

type Property = { id: string; name: string }

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

const MARKING_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  Hot:    { label: 'Hot',    bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: <Flame className="w-3 h-3" /> },
  Warm:   { label: 'Warm',  bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: <Zap className="w-3 h-3" />   },
  Cold:   { label: 'Cold',  bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   icon: <Snowflake className="w-3 h-3" /> },
  Booked: { label: 'Booked', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: <CheckCircle className="w-3 h-3" /> },
}

const DOT_COLOR: Record<string, string> = {
  Hot: 'bg-orange-500',
  Warm: 'bg-yellow-400',
  Cold: 'bg-blue-400',
  Booked: 'bg-green-500',
}

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() // 0=Sun
  const days: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

export default React.memo(function LeadsSection({
  ownerId,
  properties,
  initialLeads,
}: {
  ownerId: string
  properties: Property[]
  initialLeads: Lead[]
}) {
  const queryClient = useQueryClient()
  const [localLeads, setLocalLeads] = useState<Lead[]>(initialLeads)
  
  // Update local leads when prop changes (e.g. after background refetch)
  React.useEffect(() => {
    setLocalLeads(initialLeads)
  }, [initialLeads])

  const [isLoading, setIsLoading] = useState(false)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Calendar navigation
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '')
  const [phone, setPhone] = useState('')
  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')

  const markings = ['Hot', 'Warm', 'Cold', 'Booked']
  const statuses = ['Enquired', 'Clicked', 'Shortlisted', 'Booked', 'Cancelled']

  // Map: 'YYYY-MM-DD' => Lead[]
  const leadsByDate = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    localLeads.forEach(lead => {
      if (lead.checkin_date) {
        const key = lead.checkin_date.slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push(lead)
      }
    })
    return map
  }, [localLeads])

  // Prioritized dot color for a date (hottest marking wins)
  function getDotColor(dateLeads: Lead[]) {
    const priority = ['Hot', 'Warm', 'Booked', 'Cold']
    for (const p of priority) {
      if (dateLeads.some(l => l.marking === p)) return DOT_COLOR[p]
    }
    return 'bg-gray-400'
  }

  // Leads for the selected date
  const selectedLeads = selectedDate
    ? leadsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : []

  async function handleCreateEnquiry(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    const result = await createLead({ ownerId, propertyId: selectedPropertyId, phoneNumber: phone, checkinDate: checkin, checkoutDate: checkout })
    if (result.success && result.lead) {
      const propertyName = properties.find(p => p.id === selectedPropertyId)?.name || 'Property'
      const message = `Hello! I am the owner of ${propertyName}. I am following up on your enquiry for the dates ${checkin || 'TBD'} to ${checkout || 'TBD'}. View property: https://www.fixystays.com/guest/property/${selectedPropertyId}`
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
      
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] })
      setLocalLeads([{ ...result.lead, properties: { name: propertyName } } as Lead, ...localLeads])
      
      setPhone(''); setCheckin(''); setCheckout('')
      setIsFormVisible(false)
    } else {
      alert(result.error || 'Failed to create lead')
    }
    setIsLoading(false)
  }

  const markLeadMutation = useMutation({
    mutationFn: ({ leadId, marking }: { leadId: string, marking: string }) => updateLeadMarking(leadId, marking),
    onSuccess: (_, { leadId, marking }) => {
      setLocalLeads(prev => prev.map(l => l.id === leadId ? { ...l, marking } : l))
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] })
    }
  })

  const statusLeadMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string, status: string }) => updateLeadStatus(leadId, status),
    onSuccess: (_, { leadId, status }) => {
      setLocalLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] })
    }
  })

  const deleteLeadMutation = useMutation({
    mutationFn: (leadId: string) => deleteLead(leadId),
    onSuccess: (_, leadId) => {
      const updated = localLeads.filter(l => l.id !== leadId)
      setLocalLeads(updated)
      if (selectedDate) {
        const key = format(selectedDate, 'yyyy-MM-dd')
        const remaining = updated.filter(l => l.checkin_date?.slice(0, 10) === key)
        if (remaining.length === 0) setSelectedDate(null)
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] })
    }
  })

  async function handleMarkingChange(leadId: string, newMarking: string) {
    markLeadMutation.mutate({ leadId, marking: newMarking })
  }

  async function handleStatusChange(leadId: string, newStatus: string) {
    statusLeadMutation.mutate({ leadId, status: newStatus })
  }

  async function handleDelete(leadId: string) {
    if (!confirm('Remove this lead?')) return
    deleteLeadMutation.mutate(leadId)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null)
  }

  const calendarDays = getDaysInMonth(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Leads Calendar</h2>
          <p className="text-sm text-gray-400 mt-0.5">{localLeads.length} total leads · click a date to view</p>
        </div>
        <Button onClick={() => setIsFormVisible(!isFormVisible)} size="sm" className="gap-2">
          {isFormVisible ? <><X className="w-4 h-4" /> Close</> : <><Plus className="w-4 h-4" /> New Enquiry</>}
        </Button>
      </div>

      {/* New Enquiry Form */}
      {isFormVisible && (
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl shadow-inner animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" /> Manual Enquiry Creation
          </h3>
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
                <Input placeholder="9876543210" className="pl-9" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input type="date" value={checkin} onChange={e => setCheckin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input type="date" value={checkout} onChange={e => setCheckout(e.target.value)} />
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 h-11 px-8 gap-2">
                {isLoading ? 'Creating...' : <><MessageCircle className="w-5 h-5" /> Create & WhatsApp</>}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        {Object.entries(MARKING_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${DOT_COLOR[key]}`} />
            {cfg.label}
          </span>
        ))}
        <span className="text-gray-300 ml-2">· dots on dates indicate lead check-in</span>
      </div>

      {/* Two-column layout: calendar + panel */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── Calendar ── */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-bold text-gray-900 text-base">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-bold text-gray-400 uppercase py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />
                const key = format(day, 'yyyy-MM-dd')
                const dayLeads = leadsByDate[key] || []
                const hasLeads = dayLeads.length > 0
                const isToday = isSameDay(day, today)
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

                return (
                  <button
                    key={key}
                    onClick={() => hasLeads ? setSelectedDate(isSelected ? null : day) : null}
                    className={[
                      'relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl h-14 transition-all duration-150',
                      hasLeads ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default',
                      isSelected ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300' : '',
                      isToday && !isSelected ? 'bg-blue-50 font-bold text-blue-700' : '',
                      !isSelected && !isToday ? 'text-gray-700' : '',
                    ].join(' ')}
                  >
                    <span className="text-sm font-semibold leading-none">{day.getDate()}</span>
                    {/* Lead dots */}
                    {hasLeads && (
                      <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center max-w-[36px]">
                        {dayLeads.slice(0, 4).map((lead, di) => (
                          <span
                            key={di}
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : getDotColor([lead])}`}
                          />
                        ))}
                        {dayLeads.length > 4 && (
                          <span className={`text-[9px] font-bold leading-none mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                            +{dayLeads.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Side Panel ── */}
        <div className={`transition-all duration-300 ${selectedDate ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {selectedDate && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Check-in Leads</p>
                  <h3 className="font-bold text-gray-900 text-base">{format(selectedDate, 'MMMM d, yyyy')}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {selectedLeads.length}
                  </span>
                  <button onClick={() => setSelectedDate(null)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Lead cards */}
              <div className="flex flex-col divide-y max-h-[520px] overflow-y-auto">
                {selectedLeads.map(lead => {
                  const cfg = MARKING_CONFIG[lead.marking] || MARKING_CONFIG['Warm']
                  const propName = lead.properties?.name || 'our property'
                  const waMessage = `Hello! I am the owner of ${propName}. Following up on your enquiry for ${lead.checkin_date || 'TBD'} to ${lead.checkout_date || 'TBD'}. View property: https://www.fixystays.com/guest/property/${lead.property_id}`

                  return (
                    <div key={lead.id} className="p-5 hover:bg-gray-50/60 transition-colors">
                      {/* Top row: phone + marking badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {lead.phone_number}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{propName}</p>
                        </div>
                        {/* Marking selector as pill */}
                        <select
                          value={lead.marking}
                          onChange={e => handleMarkingChange(lead.id, e.target.value)}
                          className={`text-xs font-bold rounded-full px-3 py-1 border outline-none cursor-pointer transition-colors ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          {markings.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      {/* Dates */}
                      <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{lead.checkin_date || '—'}</span>
                        <span>→</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{lead.checkout_date || '—'}</span>
                      </div>

                      {/* Status + Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={lead.status}
                          onChange={e => handleStatusChange(lead.id, e.target.value)}
                          className="text-xs rounded-md px-2 py-1 border border-gray-200 bg-white outline-none cursor-pointer text-gray-600"
                        >
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <a
                          href={`https://wa.me/${lead.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-lg border border-green-100 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>

                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          title="Remove lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!selectedDate && (
            <div className="bg-gray-50 border border-dashed rounded-2xl p-10 text-center text-gray-400 flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">Click a date with leads<br />to see details here</p>
            </div>
          )}
        </div>
      </div>

      {/* No leads at all */}
      {localLeads.length === 0 && (
        <div className="text-center p-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No leads yet. Add your first enquiry using the button above.</p>
        </div>
      )}
    </div>
  )
})
