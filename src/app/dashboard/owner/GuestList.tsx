'use client'

import { useState, useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, User, Phone, Users, FileText, ExternalLink, X, AlertCircle, Calendar as CalIcon, Search, Download, Printer, Share2, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'

type GuestCheckin = {
  id: string
  guest_name: string
  guest_phone: string
  num_people: number
  checkin_date: string | null
  checkout_date: string | null
  vehicle_number: string | null
  id_documents: any[]
  created_at: string
  uid: string | null
  properties: { name: string }
}

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const days: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

export default React.memo(function GuestList({ 
  checkins,
  isFreeTier = false 
}: { 
  checkins: GuestCheckin[];
  isFreeTier?: boolean;
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [searchTerm, setSearchState] = useState('')
  const [showRecent, setShowRecent] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<GuestCheckin | null>(null)

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [printUrl, setPrintUrl] = useState<string | null>(null)
  
  const handleDownload = async (url: string, filename: string, id: string) => {
    setProcessingId(id)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)

    try {
      // 1. On Android/Mobile, navigator.share is the primary bridge to the gallery
      if (isAndroid || (isMobile && typeof navigator.share !== 'undefined')) {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          // Ensure we have a valid image mime type for the File object
          const mimeType = blob.type || 'image/jpeg'
          const ext = mimeType.split('/')[1] || 'jpg'
          const file = new File([blob], `${filename}.${ext}`, { type: mimeType })
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ 
              files: [file], 
              title: filename,
              text: 'Save your ID document to your gallery' 
            })
            return 
          }
        } catch (e) {
          console.warn("Native share failed", e)
        }
      }

      // 2. Standard Download Fallback
      const res = await fetch(url)
      const blob = await res.blob()
      const objUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objUrl
      link.download = `${filename}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(objUrl), 100)
    } catch (err) { 
      window.open(url, '_blank') 
    } finally {
      setProcessingId(null)
    }
  }

  const handlePrint = (url: string) => {
    // Zero-Window Strategy: Use an in-app modal instead of window.open to avoid navigation trapping
    setPrintUrl(url)
  }

  const handleShare = async (url: string, title: string, id: string) => {
    setProcessingId(id)
    try {
      if (navigator.share) {
        // Try file sharing first if possible
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          const file = new File([blob], "Guest_ID.jpg", { type: 'image/jpeg' })
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title, text: `Guest ID: ${title}` })
            setProcessingId(null)
            return
          }
        } catch (e) {}

        // Fallback to URL sharing
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard!')
      }
    } catch (e) {
      console.error("Sharing failed", e)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDownloadAll = async (guest: GuestCheckin) => {
    if (!guest.id_documents) return
    const items: {url: string, name: string}[] = []
    guest.id_documents.forEach((doc: any, i: number) => {
      const base = `ID_${guest.guest_name.replace(/\s+/g, '_')}_P${i+1}`
      if (doc.frontUrl) items.push({ url: doc.frontUrl, name: `${base}_Front` })
      if (doc.backUrl) items.push({ url: doc.backUrl, name: `${base}_Back` })
    })
    for (const item of items) {
      await handleDownload(item.url, item.name, `bulk-${item.name}`)
      await new Promise(r => setTimeout(r, 600))
    }
  }

  // Map: 'YYYY-MM-DD' => GuestCheckin[]
  const checkinsByDate = useMemo(() => {
    const map: Record<string, GuestCheckin[]> = {}
    checkins.forEach(c => {
      if (c.checkin_date) {
        const key = c.checkin_date.slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push(c)
      }
    })
    return map
  }, [checkins])

  // Recent Activity memo
  const recentCheckins = useMemo(() => {
    return [...checkins].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 30)
  }, [checkins])

  // When searching, show ALL matching guests regardless of date
  const allSearchResults = useMemo(() => {
    if (!searchTerm) return []
    const q = searchTerm.toLowerCase()
    return checkins.filter(c =>
      c.guest_name?.toLowerCase().includes(q) ||
      c.guest_phone?.includes(q) ||
      c.properties?.name?.toLowerCase().includes(q) ||
      (c.uid && c.uid.toLowerCase().includes(q))
    )
  }, [checkins, searchTerm])

  const isGlobalSearch = searchTerm.length > 0

  // Guests for the selected date (used when NOT in global search mode)
  const selectedGuests = selectedDate
    ? (checkinsByDate[format(selectedDate, 'yyyy-MM-dd')] || [])
    : []

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null); setSelectedGuest(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null); setSelectedGuest(null)
  }

  const calendarDays = getDaysInMonth(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Guest Check-in Records</h2>
          <p className="text-sm text-gray-400 mt-0.5">{checkins.length} total registered guests</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Toggle View */}
          <div className="flex p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => { setShowRecent(false); setSearchState(''); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!showRecent ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Calendar View
            </button>
            <button 
              onClick={() => { setShowRecent(true); setSearchState(''); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${showRecent ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Recent Activity
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search guests..."
              className="pl-9 h-9 text-sm"
              value={searchTerm}
              onChange={e => { setSearchState(e.target.value); if (e.target.value) setShowRecent(false); }}
            />
          </div>
        </div>
      </div>

      {/* Three-column layout: calendar/recent | guest list | guest detail */}
      <div className="grid lg:grid-cols-[1fr_280px_340px] gap-5 items-start relative">
        {/* Blur Overlay */}
        {isFreeTier && (
          <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/30 flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-gray-100 shadow-inner">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm gap-6 border border-gray-50 scale-105">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                  <Lock className="w-8 h-8" />
               </div>
               <div>
                 <h4 className="text-2xl font-extrabold text-gray-900 leading-tight italic uppercase">Guest Records Locked</h4>
                 <p className="text-gray-500 text-sm mt-2 font-medium">Upgrade your partner plan to view checked-in guests, verify IDs, and manage stay details.</p>
               </div>
               <Button asChild className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-black rounded-xl shadow-lg shadow-blue-600/20 uppercase tracking-widest text-white">
                  <Link href="/pricing/starter">Upgrade to View</Link>
               </Button>
            </div>
          </div>
        )}

        {/* ── Left Column: Calendar or Recent Activity ── */}
        {!showRecent ? (
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
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
              <div className="grid grid-cols-7 mb-2">
                {DAYS_OF_WEEK.map((d, i) => (
                  <div key={i} className="text-center text-[11px] font-bold text-gray-400 uppercase py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`pad-${i}`} />
                  const key = format(day, 'yyyy-MM-dd')
                  const dayGuests = checkinsByDate[key] || []
                  const hasGuests = dayGuests.length > 0
                  const isToday = isSameDay(day, today)
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (!hasGuests) return
                        setSelectedDate(isSelected ? null : day)
                        setSelectedGuest(null)
                      }}
                      className={[
                        'relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl h-14 transition-all duration-150',
                        hasGuests ? 'cursor-pointer hover:bg-indigo-50' : 'cursor-default',
                        isSelected ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' : '',
                        isToday && !isSelected ? 'bg-indigo-50 font-bold text-indigo-700' : '',
                        !isSelected && !isToday ? 'text-gray-700' : '',
                      ].join(' ')}
                    >
                      <span className="text-sm font-semibold leading-none">{day.getDate()}</span>
                      {hasGuests && (
                        <div className="flex items-center gap-0.5 mt-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                            {dayGuests.length}
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="px-4 pb-4 flex items-center gap-2 text-[11px] text-gray-400">
              <span className="bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full text-[10px]">N</span>
              = check-ins by date
            </div>
          </div>
        ) : (
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <span className="font-bold text-gray-900 text-base">Recent Activity</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last 30 Check-ins</span>
            </div>
            <div className="flex flex-col divide-y max-h-[600px] overflow-y-auto">
              {recentCheckins.length === 0 && (
                <div className="p-10 text-center text-gray-400 italic text-sm">No recent activity.</div>
              )}
              {recentCheckins.map(guest => (
                <button
                  key={`rec-${guest.id}`}
                  onClick={() => {
                    setSelectedGuest(selectedGuest?.id === guest.id ? null : guest)
                    setSelectedDate(null)
                  }}
                  className={`w-full text-left px-6 py-4 transition-colors hover:bg-indigo-50/50 ${selectedGuest?.id === guest.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{guest.guest_name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {guest.properties?.name} · {format(new Date(guest.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        {guest.num_people} PAX
                      </span>
                      {guest.uid && <p className="text-[9px] font-mono text-indigo-400 mt-1 uppercase">{guest.uid}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Guest List ── */}
        <div className="transition-all duration-300">
          {isGlobalSearch ? (
            // Global search result mode
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Search Results</p>
                  <h3 className="font-bold text-gray-900 text-sm">{allSearchResults.length} matches</h3>
                </div>
              </div>
              <div className="flex flex-col divide-y max-h-[500px] overflow-y-auto">
                {allSearchResults.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm italic">No guests match your search.</div>
                )}
                {allSearchResults.map(guest => (
                  <button
                    key={guest.id}
                    onClick={() => setSelectedGuest(selectedGuest?.id === guest.id ? null : guest)}
                    className={[
                      'w-full text-left px-4 py-3.5 transition-colors hover:bg-indigo-50/60',
                      selectedGuest?.id === guest.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{guest.guest_name}</p>
                          <p className="text-xs text-gray-400 truncate">{guest.properties?.name || 'Property'}</p>
                          {guest.uid && <p className="text-[10px] text-indigo-500 font-mono">{guest.uid}</p>}
                        </div>
                      </div>
                      <span className="flex-shrink-0 flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        <Users className="w-3 h-3" />{guest.num_people}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : selectedDate ? (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Check-ins</p>
                  <h3 className="font-bold text-gray-900 text-sm">{format(selectedDate, 'MMM d, yyyy')}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {selectedGuests.length}
                  </span>
                  <button onClick={() => { setSelectedDate(null); setSelectedGuest(null) }}
                    className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col divide-y max-h-[500px] overflow-y-auto">
                {selectedGuests.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm italic">No check-ins on this date.</div>
                )}
                {selectedGuests.map(guest => (
                  <button
                    key={guest.id}
                    onClick={() => setSelectedGuest(selectedGuest?.id === guest.id ? null : guest)}
                    className={[
                      'w-full text-left px-4 py-3.5 transition-colors hover:bg-indigo-50/60',
                      selectedGuest?.id === guest.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{guest.guest_name}</p>
                          <p className="text-xs text-gray-400 truncate">{guest.properties?.name || 'Property'}</p>
                          {guest.uid && <p className="text-[10px] text-indigo-500 font-mono">{guest.uid}</p>}
                        </div>
                      </div>
                      <span className="flex-shrink-0 flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        <Users className="w-3 h-3" />{guest.num_people}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed rounded-2xl p-8 text-center text-gray-400 flex flex-col items-center gap-3">
              <CalIcon className="w-8 h-8 opacity-30" />
              <p className="text-xs font-medium">Select a date<br/>or search by name above</p>
            </div>
          )}
        </div>
        
        {/* ── Guest Detail Card ── */}
        <div className={`transition-all duration-300 ${selectedGuest ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {selectedGuest ? (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-indigo-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedGuest?.guest_name}</h3>
                    <p className="text-xs text-gray-400">{selectedGuest?.properties?.name || 'Property'}</p>
                    {selectedGuest.uid && (
                      <p className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mt-1 inline-block">{selectedGuest.uid}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedGuest(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-5">
                {/* Contact */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Contact</p>
                  <a
                    href={`tel:${selectedGuest.guest_phone}`}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-indigo-600 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedGuest.guest_phone}
                  </a>
                </div>

                {/* Stay Details */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stay Details</p>
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2 text-sm border border-gray-100">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Check-in</span>
                      <span className="font-bold text-gray-900">{selectedGuest.checkin_date || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Check-out</span>
                      <span className="font-bold text-gray-900">{selectedGuest.checkout_date || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vehicle No.</span>
                      <span className="font-bold text-gray-900">{selectedGuest.vehicle_number || '—'}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-500">Guests</span>
                      <span className="font-bold text-indigo-600 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {selectedGuest.num_people} pax
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Registered</span>
                      <span className="font-medium text-gray-600 text-xs">
                        {new Date(selectedGuest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ID Documents */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ID Documents</p>
                    {selectedGuest.id_documents && selectedGuest.id_documents.length > 0 && (
                      <button 
                        onClick={() => handleDownloadAll(selectedGuest)}
                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-black text-indigo-600 hover:text-white transition-all shadow-sm"
                      >
                        <Download className="w-3 h-3 transition-transform group-hover:-translate-y-0.5" />
                        Download All IDs
                      </button>
                    )}
                  </div>

                  {selectedGuest.id_documents && selectedGuest.id_documents.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {selectedGuest.id_documents.map((doc: any, i: number) => {
                        const personLabel = `Person ${doc.personIndex || i + 1}`;
                        
                        const renderDocItem = (url: string, label: string) => (
                          <div className="flex flex-col gap-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-indigo-200 hover:bg-white transition-all shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0">
                                  <FileText className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-800 truncate">{label}</p>
                                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{personLabel}</p>
                                </div>
                              </div>
                              <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-indigo-50 rounded-lg transition-colors" title="View Fullscreen">
                                <ExternalLink className="w-4 h-4 text-gray-400 hover:text-indigo-600" />
                              </a>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-gray-100/60">
                              <button 
                                onClick={() => {
                                  const filename = `ID_${selectedGuest.guest_name.replace(/\s+/g, '_')}_${label.replace(/\s+/g, '_')}`;
                                  handleDownload(url, filename, `save-${url}`);
                                }}
                                disabled={processingId === `save-${url}`}
                                className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50"
                              >
                                {processingId === `save-${url}` ? (
                                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4 text-gray-600" />
                                )}
                                <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400">
                                  {processingId === `save-${url}` ? 'Wait' : 'Save'}
                                </span>
                              </button>
                              
                              <button 
                                onClick={() => handlePrint(url)}
                                className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
                              >
                                <Printer className="w-4 h-4 text-gray-600" />
                                <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400">Print</span>
                              </button>
 
                              <button 
                                onClick={() => handleShare(url, `${label} - ${selectedGuest.guest_name}`, `share-${url}`)}
                                disabled={processingId === `share-${url}`}
                                className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50"
                              >
                                {processingId === `share-${url}` ? (
                                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Share2 className="w-4 h-4 text-gray-600" />
                                )}
                                <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400">
                                  {processingId === `share-${url}` ? 'Wait' : 'Send'}
                                </span>
                              </button>
                            </div>
                          </div>
                        );

                        return (
                          <div key={i} className="space-y-3">
                            {doc.frontUrl && renderDocItem(doc.frontUrl, 'ID (Front)')}
                            {doc.backUrl && renderDocItem(doc.backUrl, 'ID (Back)')}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700 font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      No ID documents uploaded yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed rounded-2xl p-8 text-center text-gray-400 flex flex-col items-center gap-3 h-full justify-center">
              <User className="w-10 h-10 opacity-20" />
              <p className="text-xs font-medium">Select a guest<br/>to view ID details</p>
            </div>
          )}
        </div>
      </div>

      {checkins.length === 0 && (
        <div className="text-center p-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No guests have checked in yet.</p>
          <p className="text-xs mt-1 opacity-60">Guests appear here after completing the ID verification form.</p>
        </div>
      )}
      {/* Zero-Window Print Escape Modal */}
      {printUrl && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
            <button 
              onClick={() => setPrintUrl(null)}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 flex items-center gap-2 border border-gray-700 shadow-xl"
            >
              <ChevronLeft className="w-5 h-5" />
              BACK TO DASHBOARD
            </button>
            <div className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">Print Preview</div>
            <button 
              onClick={() => window.print()}
              className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg active:scale-95 transition-all"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img 
              src={printUrl} 
              alt="ID Document" 
              className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg"
              onLoad={() => {
                // Short delay to ensure rendering before triggering print flow
                setTimeout(() => window.print(), 300)
              }}
            />
          </div>

          <div className="p-6 bg-gray-900 border-t border-gray-800 text-center">
             <p className="text-gray-400 text-xs font-medium max-w-xs mx-auto mb-4">
               If the print window didn't open automatically, please click the print icon above. 
             </p>
             <button 
               onClick={() => setPrintUrl(null)}
               className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-bold transition-all"
             >
               Discard & Close
             </button>
          </div>

          <style jsx global>{`
            @media print {
              body * { visibility: hidden !important; }
              .fixed.inset-0.z-\[1000\] { visibility: visible !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; }
              .fixed.inset-0.z-\[1000\] img { visibility: visible !important; width: 100% !important; max-height: none !important; }
              .fixed.inset-0.z-\[1000\] .bg-gray-900, 
              .fixed.inset-0.z-\[1000\] button,
              .fixed.inset-0.z-\[1000\] .text-center { display: none !important; }
            }
          `}</style>
        </div>
      )}
    </div>
  )
})
