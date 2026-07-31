'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, isSameDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, Plus, Phone, Trash2, ChevronLeft, ChevronRight, AlertCircle, X, Flame, Snowflake, Zap, CheckCircle, User, Download, CheckSquare, Square, Lock, Search } from 'lucide-react'
import Link from 'next/link'
import { createLead, updateLeadStatus, updateLeadMarking, deleteLead } from './leads-actions'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formatWhatsAppNumber, COUNTRY_CODES } from '@/lib/utils'
import React from 'react'

type Property = { id: string; name: string }

type Lead = {
  id: string
  property_id: string
  phone_number: string
  guest_name?: string
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

function LeadsSection({
  ownerId,
  properties,
  initialLeads,
  isFreeTier = false,
}: {
  ownerId: string
  properties: Property[]
  initialLeads: Lead[]
  isFreeTier?: boolean
}) {
  const queryClient = useQueryClient()
  const [localLeads, setLocalLeads] = useState<Lead[]>(initialLeads)
  
  // List vs Calendar and Search/Filter states
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMarking, setFilterMarking] = useState('all')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)
  const [typedMessage, setTypedMessage] = useState('')
  const [notesState, setNotesState] = useState<Record<string, string>>({})
  
  const filteredLeads = useMemo(() => {
    return localLeads.filter(lead => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const guestNameMatch = lead.guest_name?.toLowerCase().includes(q)
        const propertyNameMatch = lead.properties?.name?.toLowerCase().includes(q)
        const phoneMatch = lead.phone_number?.includes(q)
        if (!guestNameMatch && !propertyNameMatch && !phoneMatch) return false
      }
      if (filterStatus !== 'all' && lead.status !== filterStatus) return false
      if (filterMarking !== 'all' && lead.marking !== filterMarking) return false
      return true
    })
  }, [localLeads, searchQuery, filterStatus, filterMarking])

  const activeLead = useMemo(() => {
    if (selectedLeadId) {
      return localLeads.find(l => l.id === selectedLeadId) || null
    }
    return filteredLeads[0] || null
  }, [localLeads, selectedLeadId, filteredLeads])

  // Load notes on mount and lead changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotes: Record<string, string> = {}
      localLeads.forEach(l => {
        const val = localStorage.getItem(`lead_notes_${l.id}`)
        if (val) savedNotes[l.id] = val
      })
      setNotesState(savedNotes)
    }
  }, [localLeads])

  const saveNote = (leadId: string, val: string) => {
    setNotesState(prev => ({ ...prev, [leadId]: val }))
    if (typeof window !== 'undefined') {
      localStorage.setItem(`lead_notes_${leadId}`, val)
    }
  }
  
  // Update local leads when prop changes (e.g. after background refetch)
  useEffect(() => {
    setLocalLeads(initialLeads)
  }, [initialLeads])

  const [isLoading, setIsLoading] = useState(false)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())

  // Calendar navigation
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties?.[0]?.id || '')
  const [countryCode, setCountryCode] = useState('91')
  const [phone, setPhone] = useState('')
  const [guestName, setGuestName] = useState('')
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
    const result = await createLead({ ownerId, propertyId: selectedPropertyId, phoneNumber: phone, guestName: guestName, checkinDate: checkin, checkoutDate: checkout })
    if (result.success && result.lead) {
      const propertyName = properties?.find(p => p.id === selectedPropertyId)?.name || 'Property'
      const message = `Hello! I am the owner of ${propertyName}. I am following up on your enquiry for the dates ${checkin || 'TBD'} to ${checkout || 'TBD'}. View property: https://www.fixystays.com/guest/property/${selectedPropertyId}`
      window.open(`https://wa.me/${formatWhatsAppNumber(phone, countryCode)}?text=${encodeURIComponent(message)}`, '_blank')
      
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] })
      setLocalLeads([{ ...result.lead, properties: { name: propertyName } } as Lead, ...localLeads])
      
      setPhone(''); setGuestName(''); setCheckin(''); setCheckout('')
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

  // Helper: Download Leads to CSV
  const exportToCSV = (leads: Lead[], filename: string) => {
    const headers = ['Guest Name', 'Phone Number', 'Interested Property', 'Check-in', 'Check-out', 'Status', 'Rating']
    const rows = leads.map(l => [
      l.guest_name || 'N/A',
      l.phone_number,
      l.properties?.name || 'our property',
      l.checkin_date || 'TBD',
      l.checkout_date || 'TBD',
      l.status,
      l.marking
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleLeadSelection = (id: string) => {
    const next = new Set(selectedLeadIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedLeadIds(next)
  }

  const toggleAllInPanel = () => {
    if (selectedLeadIds.size === selectedLeads.length) {
      setSelectedLeadIds(new Set())
    } else {
      setSelectedLeadIds(new Set(selectedLeads.map(l => l.id)))
    }
  }

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Leads Management</h2>
          <p className="text-sm text-gray-400 mt-0.5">{localLeads.length} total enquiries · tracking status & outreach</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {localLeads.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportToCSV(localLeads, `FixStay_All_Leads_${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="gap-2 border-green-200 text-green-700 hover:bg-green-50 h-9 font-bold text-xs"
            >
              <Download className="w-3.5 h-3.5" /> Export All
            </Button>
          )}
          <Button onClick={() => setIsFormVisible(!isFormVisible)} size="sm" className="gap-2 h-9 font-bold text-xs">
            {isFormVisible ? <><X className="w-3.5 h-3.5" /> Close</> : <><Plus className="w-3.5 h-3.5" /> New Enquiry</>}
          </Button>
        </div>
      </div>

      {/* Manual Enquiry Form (Grid Optimized) */}
      {isFormVisible && (
        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl shadow-inner animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <MessageCircle className="w-5 h-5 text-blue-600" /> Manual Enquiry Creation
          </h3>
          <form onSubmit={handleCreateEnquiry} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase">Select Property</Label>
              <select value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)}
                className="w-full h-10 px-3 py-2 rounded-xl border border-gray-250 bg-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500" required>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase">Guest Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input placeholder="e.g. Rahul Sharma" className="pl-9 h-10 rounded-xl" value={guestName} onChange={e => setGuestName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase">Phone Number</Label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-[85px] h-10 px-2 py-2 rounded-xl border border-gray-250 bg-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.icon} +{c.code}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input placeholder="9876543210" className="pl-9 h-10 rounded-xl" value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase">Check-in</Label>
              <Input type="date" className="h-10 rounded-xl" value={checkin} onChange={e => setCheckin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase">Check-out</Label>
              <Input type="date" className="h-10 rounded-xl" value={checkout} onChange={e => setCheckout(e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-1 flex justify-end">
              <Button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 h-10 px-8 gap-2 rounded-xl text-white font-bold text-xs">
                {isLoading ? 'Creating...' : <><MessageCircle className="w-4 h-4" /> Create & WhatsApp</>}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* View Mode & Filters Control Row */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white p-3 rounded-2xl border border-gray-150 shadow-sm">
        {/* Toggle List/Calendar */}
        <div className="flex p-1 bg-gray-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            List view
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Calendar view
          </button>
        </div>

        {/* Filters (Active only in List Mode) */}
        {viewMode === 'list' && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Search guest or property..."
                className="pl-8 h-8 text-[11px] rounded-lg border-gray-200"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 outline-none hover:border-gray-300 transition-colors"
            >
              <option value="all">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Marking Filter */}
            <select
              value={filterMarking}
              onChange={e => setFilterMarking(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-500 outline-none hover:border-gray-300 transition-colors"
            >
              <option value="all">All Ratings</option>
              {markings.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Mode 1: Calendar View ── */}
      {viewMode === 'calendar' && (
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start relative">
          {/* Blur Overlay for Free Tier */}
          {isFreeTier && <FreeTierOverlay />}

          {/* Calendar Box */}
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="font-bold text-gray-900 text-sm">{monthLabel}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {DAYS_OF_WEEK.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-black text-gray-400 uppercase py-1">{d}</div>
                ))}
              </div>

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
                      <span className="text-xs font-bold leading-none">{day.getDate()}</span>
                      {hasLeads && (
                        <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center max-w-[36px]">
                          {dayLeads.slice(0, 4).map((lead, di) => (
                            <span
                              key={di}
                              className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : getDotColor([lead])}`}
                            />
                          ))}
                          {dayLeads.length > 4 && (
                            <span className={`text-[8px] font-bold leading-none mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
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

          {/* Calendar side panel */}
          <div className={`transition-all duration-300 ${selectedDate ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {selectedDate && (
              <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={toggleAllInPanel}
                      className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center bg-white hover:border-blue-400 transition-colors"
                    >
                      {selectedLeadIds.size === selectedLeads.length && selectedLeads.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600 fill-current" />
                      ) : selectedLeadIds.size > 0 ? (
                        <div className="w-2.5 h-2.5 bg-blue-400 rounded-sm" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-gray-200" />
                      )}
                    </button>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{format(selectedDate, 'MMM d, yyyy')}</h3>
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{selectedLeads.length} leads</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedDate(null); setSelectedLeadIds(new Set()) }} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="flex flex-col divide-y max-h-[480px] overflow-y-auto">
                  {selectedLeads.map(lead => (
                    <LeadListRow 
                      key={lead.id} 
                      lead={lead} 
                      selected={selectedLeadIds.has(lead.id)}
                      onSelect={() => toggleLeadSelection(lead.id)}
                      onStatusChange={handleStatusChange}
                      onMarkingChange={handleMarkingChange}
                      onDelete={handleDelete}
                      properties={properties}
                    />
                  ))}
                </div>
              </div>
            )}
            {!selectedDate && (
              <div className="bg-gray-50 border border-dashed border-gray-250 rounded-2xl p-8 text-center text-gray-400 flex flex-col items-center gap-3">
                <AlertCircle className="w-8 h-8 opacity-30" />
                <p className="text-xs font-semibold">Click a date with leads to see details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mode 2: List View (Split/Three-Panel Layout) ── */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_280px] gap-6 items-start min-h-[550px] relative">
          {/* Blur Overlay for Free Tier */}
          {isFreeTier && <FreeTierOverlay />}

          {/* Column 1: Leads List Panel */}
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[550px] w-full">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Enquiries ({filteredLeads.length})</span>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic text-xs">No matching enquiries found.</div>
              ) : (
                filteredLeads.map(lead => {
                  const isActive = activeLead?.id === lead.id
                  const cfg = MARKING_CONFIG[lead.marking] || MARKING_CONFIG['Warm']
                  return (
                    <button
                      key={lead.id}
                      onClick={() => {
                        setSelectedLeadId(lead.id)
                        setIsMobileDetailOpen(true)
                      }}
                      className={`w-full text-left p-4 hover:bg-blue-50/30 transition-colors flex flex-col gap-1.5 ${isActive ? 'bg-blue-50/50 border-l-4 border-blue-600' : ''}`}
                    >
                      <div className="flex justify-between items-start gap-2 w-full">
                        <p className="font-bold text-gray-900 text-xs truncate max-w-[150px]">
                          {lead.guest_name || lead.phone_number}
                        </p>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {lead.marking}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{lead.properties?.name || 'Property'}</p>
                      
                      <div className="flex items-center justify-between w-full mt-1">
                        <span className="text-[9px] font-semibold text-gray-400">
                          {lead.checkin_date ? format(new Date(lead.checkin_date), 'MMM dd') : 'TBD'}
                        </span>
                        <span className="text-[9px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-md border border-gray-200 uppercase tracking-tighter">
                          {lead.status}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Column 2: Guest Details & Conversation Outreach */}
          <div className="hidden md:flex flex-col bg-white border border-gray-150 rounded-2xl shadow-sm h-[550px] overflow-hidden">
            {activeLead ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Guest Info Header */}
                <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm uppercase shadow-sm">
                      {(activeLead.guest_name || 'G')[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-tight">{activeLead.guest_name || 'Enquiry'}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{activeLead.phone_number}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 font-black uppercase tracking-wider">
                    {activeLead.properties?.name}
                  </span>
                </div>

                {/* Split detail scroll area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0">
                  {/* Grid details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Check-in</span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{activeLead.checkin_date || 'To Be Confirmed'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Check-out</span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{activeLead.checkout_date || 'To Be Confirmed'}</p>
                    </div>
                  </div>

                  {/* WhatsApp outreach messaging box */}
                  <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-inner flex flex-col">
                    <div className="px-4 py-2.5 bg-green-50 border-b border-green-100 flex items-center justify-between">
                      <span className="text-[9px] font-black text-green-700 uppercase tracking-widest flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 fill-current" /> WhatsApp Conversation
                      </span>
                      <span className="text-[8px] text-green-600 font-black uppercase">Outbound Outreach</span>
                    </div>

                    <div className="p-4 bg-gray-50/50 flex flex-col gap-3 min-h-[140px] max-h-[180px] overflow-y-auto">
                      {/* Simulated Outbound Message */}
                      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-3 max-w-[85%] self-start text-[11px] leading-relaxed shadow-sm font-medium">
                        Hello! I am the owner of <span className="font-bold">{activeLead.properties?.name}</span>. Following up on your enquiry for the dates {activeLead.checkin_date || 'TBD'} to {activeLead.checkout_date || 'TBD'}.
                      </div>
                      
                      {/* Simulated Inbound Guest Message */}
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none p-3 max-w-[85%] self-end text-[11px] leading-relaxed shadow-sm font-medium">
                        Hi! Yes, I want to confirm if pool access is included and what is the base rate.
                      </div>
                    </div>

                    {/* Chat Text Input */}
                    <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
                      <Input
                        placeholder="Type WhatsApp follow-up..."
                        className="h-9 text-xs rounded-xl flex-1 border-gray-200"
                        value={typedMessage}
                        onChange={e => setTypedMessage(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const waUrl = `https://wa.me/${formatWhatsAppNumber(activeLead.phone_number)}?text=${encodeURIComponent(typedMessage || `Following up regarding your stays at ${activeLead.properties?.name}`)}`
                            window.open(waUrl, '_blank')
                            setTypedMessage('')
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const waUrl = `https://wa.me/${formatWhatsAppNumber(activeLead.phone_number)}?text=${encodeURIComponent(typedMessage || `Following up regarding your stays at ${activeLead.properties?.name}`)}`
                          window.open(waUrl, '_blank')
                          setTypedMessage('')
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 px-4 rounded-xl text-xs flex-shrink-0"
                      >
                        Send
                      </Button>
                    </div>
                  </div>

                  {/* Tablet only view: actions render inline at the bottom of detail page */}
                  <div className="xl:hidden border-t pt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</Label>
                        <select
                          value={activeLead.status}
                          onChange={e => handleStatusChange(activeLead.id, e.target.value)}
                          className="w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border border-gray-200 bg-white outline-none cursor-pointer text-gray-500 hover:border-gray-300 transition-colors"
                        >
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Rating</Label>
                        <select
                          value={activeLead.marking}
                          onChange={e => handleMarkingChange(activeLead.id, e.target.value)}
                          className="w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border border-gray-200 bg-white outline-none cursor-pointer text-gray-500 hover:border-gray-300 transition-colors"
                        >
                          {markings.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Internal Notes</Label>
                      <textarea
                        value={notesState[activeLead.id] || ''}
                        onChange={e => saveNote(activeLead.id, e.target.value)}
                        placeholder="Add client request details (autosaved)..."
                        className="w-full h-16 p-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-medium"
                      />
                    </div>

                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(activeLead.id)}
                      className="w-full font-bold h-9 rounded-xl text-xs gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Lead Card
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 gap-2">
                <AlertCircle className="w-8 h-8 opacity-25" />
                <p className="text-xs font-semibold">Select an enquiry to view details</p>
              </div>
            )}
          </div>

          {/* Column 3: Timeline, Notes & Booking Actions (Desktop Only) */}
          {activeLead && (
            <div className="hidden xl:flex flex-col bg-white border border-gray-150 rounded-2xl shadow-sm p-5 h-[550px] justify-between overflow-y-auto">
              <div className="space-y-5">
                {/* Section title */}
                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Timeline & Actions</h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">Enquiry tracking status</p>
                </div>

                {/* Timeline steps */}
                <div className="flex flex-col gap-3 pt-2">
                  <TimelineStep label="Enquiry Created" date={activeLead.created_at ? format(new Date(activeLead.created_at), 'MMM dd, h:mm a') : 'TBD'} active={true} />
                  <TimelineStep label="WhatsApp Outreach" date="Sent outbound ping" active={true} />
                  <TimelineStep label="Current State" date={`Status: ${activeLead.status}`} active={true} />
                  <TimelineStep label="Planned Check-in" date={activeLead.checkin_date || 'To be aligned'} active={!!activeLead.checkin_date} />
                </div>

                {/* Booking status modifiers */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Update Status</Label>
                    <select
                      value={activeLead.status}
                      onChange={e => handleStatusChange(activeLead.id, e.target.value)}
                      className="text-xs font-bold rounded-xl px-2.5 py-2 border border-gray-250 bg-white outline-none cursor-pointer text-gray-700 hover:border-gray-300 transition-colors w-full"
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Lead Rating</Label>
                    <select
                      value={activeLead.marking}
                      onChange={e => handleMarkingChange(activeLead.id, e.target.value)}
                      className="text-xs font-bold rounded-xl px-2.5 py-2 border border-gray-250 bg-white outline-none cursor-pointer text-gray-700 hover:border-gray-300 transition-colors w-full"
                    >
                      {markings.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notes Text Area */}
                <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-0.5">
                    <Label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Internal Notes</Label>
                    <span className="text-[8px] text-green-600 bg-green-50 px-1 py-0.5 rounded font-black uppercase">Autosaved</span>
                  </div>
                  <textarea
                    value={notesState[activeLead.id] || ''}
                    onChange={e => saveNote(activeLead.id, e.target.value)}
                    placeholder="Add special guest requests..."
                    className="w-full h-20 p-2 text-xs border border-gray-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-medium"
                  />
                </div>
              </div>

              {/* Danger Zone delete button */}
              <div className="pt-4 border-t border-gray-100 mt-2">
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(activeLead.id)}
                  className="w-full font-bold h-10 rounded-xl text-xs gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Lead
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No leads at all empty state */}
      {localLeads.length === 0 && (
        <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 flex flex-col items-center gap-3">
          <AlertCircle className="w-10 h-10 opacity-20" />
          <p className="font-semibold text-sm">No enquiries registered yet. Create one using the button above.</p>
        </div>
      )}

      {/* Mobile Detail Modal Dialog (Centered overlay dialog) */}
      {isMobileDetailOpen && activeLead && (
        <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs uppercase">
                  {(activeLead.guest_name || 'G')[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xs truncate max-w-[150px]">{activeLead.guest_name || 'Enquiry Details'}</h3>
                  <p className="text-[9px] text-gray-400 font-bold">{activeLead.phone_number}</p>
                </div>
              </div>
              <button onClick={() => setIsMobileDetailOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-xl border">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block">Property</span>
                  <span className="text-xs font-bold text-gray-900 truncate block mt-0.5">{activeLead.properties?.name}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block">Status</span>
                  <span className="text-xs font-bold text-blue-600 block mt-0.5">{activeLead.status}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block">Check-in</span>
                  <span className="text-xs font-bold text-gray-900 block mt-0.5">{activeLead.checkin_date || 'TBD'}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block">Check-out</span>
                  <span className="text-xs font-bold text-gray-900 block mt-0.5">{activeLead.checkout_date || 'TBD'}</span>
                </div>
              </div>

              {/* Mobile Update Controls */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status</Label>
                  <select
                    value={activeLead.status}
                    onChange={e => handleStatusChange(activeLead.id, e.target.value)}
                    className="text-xs font-bold rounded-xl px-2.5 py-2 border border-gray-250 bg-white outline-none cursor-pointer text-gray-700 hover:border-gray-300 w-full"
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Rating</Label>
                  <select
                    value={activeLead.marking}
                    onChange={e => handleMarkingChange(activeLead.id, e.target.value)}
                    className="text-xs font-bold rounded-xl px-2.5 py-2 border border-gray-250 bg-white outline-none cursor-pointer text-gray-700 hover:border-gray-300 w-full"
                  >
                    {markings.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1 pt-2">
                <Label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Internal Notes</Label>
                <textarea
                  value={notesState[activeLead.id] || ''}
                  onChange={e => saveNote(activeLead.id, e.target.value)}
                  placeholder="Requests details..."
                  className="w-full h-16 p-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-medium"
                />
              </div>

              {/* WhatsApp Trigger */}
              <Button
                onClick={() => {
                  const waUrl = `https://wa.me/${formatWhatsAppNumber(activeLead.phone_number)}?text=${encodeURIComponent(`Hello! I am the owner of ${activeLead.properties?.name}. Following up on your stay enquiry.`)}`
                  window.open(waUrl, '_blank')
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 rounded-xl text-xs gap-1.5"
              >
                <MessageCircle className="w-4 h-4" /> Message on WhatsApp
              </Button>
            </div>

            <div className="p-4 bg-gray-50 border-t flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  handleDelete(activeLead.id)
                  setIsMobileDetailOpen(false)
                }}
                className="flex-1 font-bold h-10 rounded-xl text-xs gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Card
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsMobileDetailOpen(false)}
                className="flex-1 font-bold h-10 rounded-xl text-xs border-gray-200"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(LeadsSection)

/* Helper subcomponents to keep markup dry */

function FreeTierOverlay() {
  return (
    <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/30 flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-gray-100 shadow-inner">
      <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm gap-6 border border-gray-50 scale-105">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h4 className="text-2xl font-extrabold text-gray-900 leading-tight italic uppercase">Lead Data Locked</h4>
          <p className="text-gray-500 text-sm mt-2 font-medium">Upgrade your partner plan to view guest enquiries and manage lead data.</p>
        </div>
        <Button asChild className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-black rounded-xl shadow-lg shadow-blue-600/20 uppercase tracking-widest text-white">
          <Link href="/pricing/starter">Upgrade to View</Link>
        </Button>
      </div>
    </div>
  )
}

function TimelineStep({ label, date, active }: { label: string; date: string; active: boolean }) {
  return (
    <div className="flex gap-3 items-start group">
      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${active ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-100' : 'bg-white border-gray-200'}`} />
        <div className="w-0.5 h-7 bg-gray-100 group-last:hidden" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-800 leading-none">{label}</p>
        <p className="text-[9px] text-gray-400 font-semibold mt-1 leading-none">{date}</p>
      </div>
    </div>
  )
}

function LeadListRow({ 
  lead, 
  selected, 
  onSelect, 
  onStatusChange, 
  onMarkingChange, 
  onDelete,
  properties
}: { 
  lead: Lead
  selected: boolean
  onSelect: () => void
  onStatusChange: (id: string, s: string) => Promise<void>
  onMarkingChange: (id: string, m: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  properties: Property[]
}) {
  const cfg = MARKING_CONFIG[lead.marking] || MARKING_CONFIG['Warm']
  const propName = lead.properties?.name || 'our property'
  const waMessage = `Hello! I am the owner of ${propName}. Following up on your stays.`

  return (
    <div className={`p-4 hover:bg-gray-50/50 transition-all relative flex gap-3 group ${selected ? 'bg-blue-50/30' : ''}`}>
      <div className="pt-0.5">
        <button 
          onClick={onSelect}
          className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selected ? 'bg-blue-600 border-blue-600 shadow-sm' : 'border-gray-250 bg-white group-hover:border-blue-400'}`}
        >
          {selected && <CheckCircle className="w-3.5 h-3.5 text-white fill-current" />}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-xs flex items-center gap-1 truncate">
              {lead.guest_name ? (
                <>
                  <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  {lead.guest_name}
                </>
              ) : (
                <>
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  {lead.phone_number}
                </>
              )}
            </p>
            <p className="text-[9px] uppercase font-black text-blue-600 mt-0.5 truncate">{propName}</p>
          </div>
          <select
            value={lead.marking}
            onChange={e => onMarkingChange(lead.id, e.target.value)}
            className={`text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 border outline-none cursor-pointer transition shadow-sm ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            {['Hot', 'Warm', 'Cold', 'Booked'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="text-[10px] text-gray-500 mb-3 flex items-center gap-1.5 font-semibold">
          <span className="bg-gray-100 px-1.5 py-0.5 rounded border">{lead.checkin_date || '—'}</span>
          <span className="text-gray-300">&rarr;</span>
          <span className="bg-gray-100 px-1.5 py-0.5 rounded border">{lead.checkout_date || '—'}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={lead.status}
            onChange={e => onStatusChange(lead.id, e.target.value)}
            className="text-[10px] font-bold rounded-lg px-2 py-1 border border-gray-200 bg-white outline-none text-gray-500 hover:border-gray-300 transition"
          >
            {['Enquired', 'Clicked', 'Shortlisted', 'Booked', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <a
            href={`https://wa.me/${formatWhatsAppNumber(lead.phone_number)}?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-600 text-green-700 hover:text-white text-[10px] font-bold rounded-lg border border-green-100 transition shadow-sm"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>

          <button
            onClick={() => onDelete(lead.id)}
            className="p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

