'use client'

import { useState, useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, User, Phone, Users, FileText, ExternalLink, X, AlertCircle, Calendar as CalIcon, Search, Download, Printer, Share2, Lock, MapPin, CheckCircle, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React, { useEffect } from 'react'
import { approveIdentity, assignRoomToGuest, checkoutGuest } from './actions'

type GuestCheckin = {
  id: string
  guest_name: string
  guest_phone: string
  num_people: number
  checkin_date: string | null
  checkout_date: string | null
  vehicle_number: string | null
  id_documents: any[]
  identities?: any[]
  created_at: string
  uid: string | null
  status?: string
  properties: { name: string }
  property_id: string
  room_number?: string | null
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
  isFreeTier = false,
  properties = [],
  propertyRooms = []
}: { 
  checkins: GuestCheckin[];
  isFreeTier?: boolean;
  properties?: any[];
  propertyRooms?: any[];
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [searchTerm, setSearchState] = useState('')
  const [showRecent, setShowRecent] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<GuestCheckin | null>(null)
  const [approveModalId, setApproveModalId] = useState<string | null>(null)
  const [manualName, setManualName] = useState('')
  const [manualDocNumber, setManualDocNumber] = useState('')
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [selectedRoomNumberToAssign, setSelectedRoomNumberToAssign] = useState('')
  const [selectedOccupiedRoom, setSelectedOccupiedRoom] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Data table state hooks
  const [sortField, setSortField] = useState<'checkin_date' | 'guest_name' | 'num_people'>('checkin_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterProperty, setFilterProperty] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Initialize selectedPropertyId
  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id)
    }
  }, [properties, selectedPropertyId])

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [printUrl, setPrintUrl] = useState<string | null>(null)

  const roomsForSelectedProperty = useMemo(() => {
    return propertyRooms.filter((r: any) => r.property_id === selectedPropertyId)
  }, [propertyRooms, selectedPropertyId])

  const activeCheckinsToday = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA')
    return checkins.filter((c: any) => {
      if (c.property_id !== selectedPropertyId) return false
      if (!c.room_number) return false
      if (c.status === 'checked_out') return false
      if (!c.checkin_date || !c.checkout_date) return false
      return todayStr >= c.checkin_date && todayStr < c.checkout_date
    })
  }, [checkins, selectedPropertyId])

  const roomOccupancyMap = useMemo(() => {
    const map: Record<string, any> = {}
    activeCheckinsToday.forEach((c: any) => {
      map[c.room_number] = c
    })
    return map
  }, [activeCheckinsToday])

  const availableRoomsForGuest = useMemo(() => {
    if (!selectedGuest) return []
    const propRooms = propertyRooms.filter((r: any) => r.property_id === selectedGuest.property_id)
    
    const gCheckin = selectedGuest.checkin_date
    const gCheckout = selectedGuest.checkout_date
    
    const overlappingCheckins = checkins.filter((c: any) => {
      if (c.id === selectedGuest.id) return false
      if (c.property_id !== selectedGuest.property_id) return false
      if (!c.room_number) return false
      if (c.status === 'checked_out') return false
      if (!c.checkin_date || !c.checkout_date) return false
      
      if (gCheckin && gCheckout) {
        return c.checkin_date < gCheckout && c.checkout_date > gCheckin
      } else {
        const todayStr = new Date().toLocaleDateString('en-CA')
        return todayStr >= c.checkin_date && todayStr < c.checkout_date
      }
    })
    
    const occupiedRoomNumbers = new Set(overlappingCheckins.map((c: any) => c.room_number))
    return propRooms.filter((r: any) => !occupiedRoomNumbers.has(r.room_number))
  }, [selectedGuest, propertyRooms, checkins])

  const handleApproveId = async (id: string, nameOverride?: string, docNumOverride?: string) => {
    setProcessingId(`approve-${id}`)
    const res = await approveIdentity(id, nameOverride, docNumOverride)
    if (!res.success) {
      alert(res.error)
    } else {
      setApproveModalId(null)
      // Re-fetch or UI state will ideally get updated by revalidatePath
    }
    setProcessingId(null)
  }
  
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
    const items: {url: string, name: string}[] = []
    if (guest.identities && guest.identities.length > 0) {
      guest.identities.forEach((idDoc: any, i: number) => {
        const base = `ID_${guest.guest_name.replace(/\s+/g, '_')}_${idDoc.document_type || 'DOC'}_${i+1}`
        if (idDoc.document_image_url) items.push({ url: idDoc.document_image_url, name: `${base}_Front` })
        if (idDoc.back_image_url) items.push({ url: idDoc.back_image_url, name: `${base}_Back` })
      })
    } else if (guest.id_documents && guest.id_documents.length > 0) {
      guest.id_documents.forEach((doc: any, i: number) => {
        const base = `ID_${guest.guest_name.replace(/\s+/g, '_')}_P${i+1}`
        if (doc.frontUrl) items.push({ url: doc.frontUrl, name: `${base}_Front` })
        if (doc.backUrl) items.push({ url: doc.backUrl, name: `${base}_Back` })
      })
    }
    
    if (items.length === 0) return

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
    const cleanQ = q.replace(/[\s+]+/g, '')
    return checkins.filter(c => {
      let matchesIdentity = false;
      if (c.identities && Array.isArray(c.identities)) {
        matchesIdentity = c.identities.some((doc: any) => 
          (doc.document_number && String(doc.document_number).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
          (doc.full_name && String(doc.full_name).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
          (doc.raw_ocr_text && String(doc.raw_ocr_text).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
          (doc.address && String(doc.address).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
          (doc.raw_ocr_text_back && String(doc.raw_ocr_text_back).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ))
        )
      } else if (c.id_documents && Array.isArray(c.id_documents)) {
        matchesIdentity = c.id_documents.some((doc: any) => 
          (doc.documentNumber && String(doc.documentNumber).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
          (doc.fullName && String(doc.fullName).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ))
        )
      }

      const cleanPhone = (c.guest_phone || '').replace(/[\s+]+/g, '')
      const cleanVehicle = (c.vehicle_number || '').toLowerCase().replace(/[\s+]+/g, '')

      return (c.guest_name && c.guest_name.toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
             cleanPhone.includes(cleanQ) ||
             cleanVehicle.includes(cleanQ) ||
             (c.properties?.name && c.properties.name.toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
             (c.uid && c.uid.toLowerCase().includes(q)) ||
             matchesIdentity;
    })
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
  const calendarDays = getDaysInMonth(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  // 1. Process and filter guests dynamically
  const processedGuests = useMemo(() => {
    let list = [...checkins]
    
    // Search query filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const cleanQ = q.replace(/[\s+]+/g, '')
      list = list.filter(c => {
        let matchesIdentity = false
        if (c.identities && Array.isArray(c.identities)) {
          matchesIdentity = c.identities.some((doc: any) => 
            (doc.document_number && String(doc.document_number).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
            (doc.full_name && String(doc.full_name).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
            (doc.raw_ocr_text && String(doc.raw_ocr_text).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ))
          )
        } else if (c.id_documents && Array.isArray(c.id_documents)) {
          matchesIdentity = c.id_documents.some((doc: any) => 
            (doc.documentNumber && String(doc.documentNumber).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
            (doc.fullName && String(doc.fullName).toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ))
          )
        }
        const cleanPhone = (c.guest_phone || '').replace(/[\s+]+/g, '')
        const cleanVehicle = (c.vehicle_number || '').toLowerCase().replace(/[\s+]+/g, '')
        
        return (c.guest_name && c.guest_name.toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
               cleanPhone.includes(cleanQ) ||
               cleanVehicle.includes(cleanQ) ||
               (c.properties?.name && c.properties.name.toLowerCase().replace(/[\s+]+/g, '').includes(cleanQ)) ||
               (c.uid && c.uid.toLowerCase().includes(q)) ||
               matchesIdentity
      })
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      list = list.filter(c => c.status === filterStatus)
    }
    
    // Property filter
    if (filterProperty !== 'all') {
      list = list.filter(c => c.property_id === filterProperty)
    }
    
    // Sorting
    list.sort((a, b) => {
      let valA: any = a[sortField] || ''
      let valB: any = b[sortField] || ''
      
      if (sortField === 'num_people') {
        valA = Number(valA)
        valB = Number(valB)
      } else {
        valA = String(valA).toLowerCase()
        valB = String(valB).toLowerCase()
      }
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return list
  }, [checkins, searchTerm, filterStatus, filterProperty, sortField, sortOrder])

  // 2. Paginate processed results
  const itemsPerPage = 10
  const paginatedGuests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return processedGuests.slice(start, start + itemsPerPage)
  }, [processedGuests, currentPage])
  
  const totalPages = Math.ceil(processedGuests.length / itemsPerPage) || 1

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Guest Check-in Records</h2>
          <p className="text-sm text-gray-400 mt-0.5">{checkins.length} total registered guests</p>
        </div>
      </div>

      {/* ── View 1: Mobile View (< 768px) ── */}
      <div className="md:hidden flex flex-col gap-5 w-full">
        {/* Toggle View & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
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

          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search guests..."
              className="pl-9 h-10 text-xs rounded-xl"
              value={searchTerm}
              onChange={e => { setSearchState(e.target.value); if (e.target.value) setShowRecent(false); }}
            />
          </div>
        </div>

        {/* 3-panel style mobile grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full relative">
          {/* Blur Overlay for Free Tier */}
          {isFreeTier && <FreeTierOverlay />}

          {/* Calendar/Recent Activity Panel */}
          {!showRecent ? (
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="font-bold text-gray-900 text-xs">{monthLabel}</span>
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
                          hasGuests ? 'cursor-pointer hover:bg-indigo-50 animate-in zoom-in-95 duration-100' : 'cursor-default',
                          isSelected ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' : '',
                          isToday && !isSelected ? 'bg-indigo-50 font-bold text-indigo-700' : '',
                          !isSelected && !isToday ? 'text-gray-700' : '',
                        ].join(' ')}
                      >
                        <span className="text-xs font-bold leading-none">{day.getDate()}</span>
                        {hasGuests && (
                          <div className="flex items-center gap-0.5 mt-1.5">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                              {dayGuests.length}
                            </span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                <span className="font-bold text-gray-900 text-xs uppercase tracking-wider">Recent Activity</span>
              </div>
              <div className="flex flex-col divide-y max-h-[400px] overflow-y-auto">
                {recentCheckins.map(guest => (
                  <button
                    key={`rec-${guest.id}`}
                    onClick={() => {
                      setSelectedGuest(guest)
                    }}
                    className="w-full text-left px-5 py-4 transition hover:bg-indigo-50/20"
                  >
                    <p className="font-bold text-gray-900 text-xs">{guest.guest_name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{guest.properties?.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] font-mono text-indigo-500 uppercase">{guest.uid || 'GUEST'}</span>
                      <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">{guest.num_people} PAX</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Guest selector by Date (only in Calendar Mode) */}
          {!showRecent && (
            <div>
              {selectedDate ? (
                <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-900">{format(selectedDate, 'MMM d, yyyy')}</span>
                    <button onClick={() => setSelectedDate(null)} className="p-1 rounded-lg hover:bg-gray-200">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex flex-col divide-y max-h-[350px] overflow-y-auto">
                    {selectedGuests.map(g => (
                      <button key={g.id} onClick={() => setSelectedGuest(g)} className="w-full text-left p-4 hover:bg-indigo-50/20">
                        <p className="font-bold text-gray-900 text-xs">{g.guest_name}</p>
                        <p className="text-[10px] text-gray-400">{g.guest_phone}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-250 rounded-2xl p-8 text-center text-gray-400 flex flex-col items-center gap-2 h-full justify-center">
                  <CalIcon className="w-8 h-8 opacity-25" />
                  <p className="text-xs font-semibold">Select calendar date to list guest check-ins</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── View 2: Tablet & Desktop View ($\geq$ 768px) ── */}
      <div className="hidden md:flex flex-col gap-4 w-full relative">
        {/* Blur Overlay for Free Tier */}
        {isFreeTier && <FreeTierOverlay />}

        {/* Filters and Search Control Row */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-150 shadow-sm w-full">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by guest name, phone, UID..."
              className="pl-9 h-10 text-xs rounded-xl"
              value={searchTerm}
              onChange={e => { setSearchState(e.target.value); setCurrentPage(1); }}
            />
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {/* Property Selector */}
            <select
              value={filterProperty}
              onChange={e => { setFilterProperty(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 py-2 rounded-xl border border-gray-250 bg-white text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
            >
              <option value="all">All Properties</option>
              {properties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Status Selector */}
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 py-2 rounded-xl border border-gray-250 bg-white text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="draft">Draft (Pending ID)</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-gray-100 text-left">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-450 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">UID</th>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition select-none"
                    onClick={() => {
                      setSortField('guest_name');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Guest Name {sortField === 'guest_name' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4 text-center">Room</th>
                  <th 
                    className="px-6 py-4 text-center cursor-pointer hover:text-indigo-600 transition select-none"
                    onClick={() => {
                      setSortField('num_people');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    PAX {sortField === 'num_people' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition select-none"
                    onClick={() => {
                      setSortField('checkin_date');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Check In {sortField === 'checkin_date' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-6 py-4">Check Out</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white text-xs font-semibold text-gray-750">
                {paginatedGuests.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-400 italic">No check-in records found matching your filters.</td>
                  </tr>
                ) : (
                  paginatedGuests.map(g => (
                    <tr 
                      key={g.id}
                      onClick={() => setSelectedGuest(g)}
                      className="hover:bg-indigo-50/20 transition cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono text-indigo-500 uppercase tracking-tighter">{g.uid || '—'}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{g.guest_name}</td>
                      <td className="px-6 py-4 font-normal text-gray-500">{g.guest_phone}</td>
                      <td className="px-6 py-4 truncate max-w-[150px]">{g.properties?.name}</td>
                      <td className="px-6 py-4 text-center">
                        {g.room_number ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black border border-emerald-100">
                            {g.room_number}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-black">
                          {g.num_people} Pax
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-600">{g.checkin_date || '—'}</td>
                      <td className="px-6 py-4 font-medium text-gray-600">{g.checkout_date || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        {g.status === 'checked_out' ? (
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 uppercase text-[9px] font-black tracking-wider">Checked Out</span>
                        ) : g.status === 'draft' ? (
                          <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 uppercase text-[9px] font-black tracking-wider">Draft</span>
                        ) : (
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 uppercase text-[9px] font-black tracking-wider">Checked In</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedGuest(g)}
                          className="font-bold text-xs hover:text-indigo-650 rounded-lg"
                        >
                          View details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Page {currentPage} of {totalPages} ({processedGuests.length} guests)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-8 rounded-lg font-bold text-xs border-gray-200"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-8 rounded-lg font-bold text-xs border-gray-200"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Live Room Visualizer Section ── */}
      <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col gap-6 mt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live Room Visualizer
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Current Date: {format(new Date(), 'dd MMMM yyyy')} · Live stay occupancy.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {properties.length > 0 && (
              <div className="flex flex-col gap-1 w-full md:w-56">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Select Property</span>
                <select
                  value={selectedPropertyId}
                  onChange={e => setSelectedPropertyId(e.target.value)}
                  className="bg-white border border-gray-200 text-sm font-semibold text-gray-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm w-full cursor-pointer"
                >
                  {properties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Live Occupancy Grid</h4>
            <p className="text-[11px] text-gray-450 mt-0.5">Click occupied tiles (red) to view occupant details and check out.</p>
          </div>

          {roomsForSelectedProperty.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl bg-gray-50/50 text-center gap-2">
              <Users className="w-8 h-8 text-gray-300 animate-pulse" />
              <p className="text-xs text-gray-400 font-medium">Add room numbers in the Edit Property section to see the occupancy grid here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
              {roomsForSelectedProperty.map((r: any) => {
                const occupant = roomOccupancyMap[r.room_number]
                const isOccupied = !!occupant

                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (isOccupied) {
                        setSelectedOccupiedRoom(r.room_number)
                      } else {
                        alert(`Room ${r.room_number} is currently available.`)
                      }
                    }}
                    className={[
                      'flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm cursor-pointer',
                      isOccupied
                        ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/70 hover:border-rose-350'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-350'
                    ].join(' ')}
                  >
                    <span className="text-sm font-black tracking-tight">{r.room_number}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-full bg-white/60">
                      {isOccupied ? 'Occupied' : 'Available'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Centered Modal Dialog for Guest Details (Both Mobile and Table views) ── */}
      {selectedGuest && (
        <div className="fixed inset-0 z-[1020] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-150 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-50/50 to-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm uppercase">
                  {(selectedGuest.guest_name || 'G')[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{selectedGuest.guest_name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{selectedGuest.properties?.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedGuest(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scroll Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
              {/* Top Meta info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">UID Identifier</span>
                  <span className="text-xs font-mono font-bold text-indigo-650 block mt-0.5">{selectedGuest.uid || '—'}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">PAX / Guests</span>
                  <span className="text-xs font-bold text-gray-900 block mt-0.5">{selectedGuest.num_people} guests</span>
                </div>
              </div>

              {/* Stay timeline details */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Stay details</span>
                <div className="bg-gray-50 rounded-xl p-4 border divide-y divide-gray-200/55 flex flex-col text-xs font-semibold gap-2">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-450">Check In</span>
                    <span className="text-gray-900 font-bold">{selectedGuest.checkin_date || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="text-gray-450">Check Out</span>
                    <span className="text-gray-900 font-bold">{selectedGuest.checkout_date || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="text-gray-450">Phone Number</span>
                    <a href={`tel:${selectedGuest.guest_phone}`} className="text-indigo-600 font-bold hover:underline">{selectedGuest.guest_phone}</a>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="text-gray-450">Vehicle Number</span>
                    <span className="text-gray-900 font-bold uppercase">{selectedGuest.vehicle_number || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Form C Foreign details */}
              {selectedGuest.form_c_details && (
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> Form C Foreign National
                  </span>
                  <div className="bg-blue-50/30 rounded-xl p-4 border border-blue-100 text-xs font-semibold space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Passport Number</span>
                      <span className="text-gray-900 font-bold">{selectedGuest.form_c_details.passport_number || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Visa Number</span>
                      <span className="text-gray-900 font-bold">{selectedGuest.form_c_details.visa_number || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Visa Expiry Date</span>
                      <span className="text-gray-900 font-bold">{selectedGuest.form_c_details.visa_expiry || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Country of Origin</span>
                      <span className="text-gray-900 font-bold">{selectedGuest.form_c_details.country_of_origin || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Room Assignment Options */}
              {selectedGuest.status !== 'checked_out' && (
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Room Assignment</span>
                  {selectedGuest.room_number ? (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-indigo-500 font-black uppercase">Assigned Room</span>
                        <p className="text-base font-extrabold text-indigo-900">Room {selectedGuest.room_number}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to remove this room assignment?')) {
                            const res = await assignRoomToGuest(selectedGuest.id, null)
                            if (res.success) {
                              setSelectedGuest({ ...selectedGuest, room_number: null })
                            } else {
                              alert(res.error)
                            }
                          }
                        }}
                        className="text-xs font-bold text-red-650 hover:text-red-750 bg-red-50 hover:bg-red-100/60 px-3 py-1.5 rounded-lg border border-red-100 transition"
                      >
                        Unassign Room
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedRoomNumberToAssign}
                        onChange={e => setSelectedRoomNumberToAssign(e.target.value)}
                        className="flex-1 bg-white border border-gray-250 text-xs font-bold text-gray-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer"
                      >
                        <option value="">Select Available Room</option>
                        {availableRoomsForGuest.map((r: any) => (
                          <option key={r.id} value={r.room_number}>
                            Room {r.room_number} ({r.category || 'Standard'})
                          </option>
                        ))}
                      </select>
                      <Button
                        disabled={!selectedRoomNumberToAssign}
                        onClick={async () => {
                          const res = await assignRoomToGuest(selectedGuest.id, selectedRoomNumberToAssign)
                          if (res.success) {
                            setSelectedGuest({ ...selectedGuest, room_number: selectedRoomNumberToAssign })
                            setSelectedRoomNumberToAssign('')
                          } else {
                            alert(res.error)
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 rounded-xl shadow-sm px-4 text-xs"
                      >
                        Assign
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ID document list */}
              <div className="space-y-3 font-semibold">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Identity Documents</span>
                  {((selectedGuest.identities && selectedGuest.identities.length > 0) || (selectedGuest.id_documents && selectedGuest.id_documents.length > 0)) && (
                    <button 
                      onClick={() => handleDownloadAll(selectedGuest)}
                      className="group flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 rounded-lg text-[9px] font-black text-indigo-600 hover:text-white transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download All
                    </button>
                  )}
                </div>

                {selectedGuest.identities && selectedGuest.identities.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {selectedGuest.identities.map((doc: any, i: number) => {
                      const docBase = `ID_${selectedGuest.guest_name.replace(/\s+/g, '_')}_${doc.document_type || 'DOC'}_${i+1}`
                      const renderIdImage = (url: string, sideLabel: string, downloadName: string) => (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-0.5">{sideLabel}</span>
                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={sideLabel} className="w-full h-full object-cover" />
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold gap-1 transition"
                            >
                              <ExternalLink className="w-4 h-4" /> Open
                            </a>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => handleDownload(url, downloadName, `save-${url}`)}
                              disabled={processingId === `save-${url}`}
                              className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                            >
                              {processingId === `save-${url}` ? <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5 text-gray-650" />}
                              <span className="text-[8px] font-black uppercase text-gray-400">Save</span>
                            </button>
                            <button onClick={() => handlePrint(url)} className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                              <Printer className="w-3.5 h-3.5 text-gray-650" />
                              <span className="text-[8px] font-black uppercase text-gray-400">Print</span>
                            </button>
                            <button
                              onClick={() => handleShare(url, `${sideLabel} - ${selectedGuest.guest_name}`, `share-${url}`)}
                              disabled={processingId === `share-${url}`}
                              className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                            >
                              {processingId === `share-${url}` ? <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Share2 className="w-3.5 h-3.5 text-gray-655" />}
                              <span className="text-[8px] font-black uppercase text-gray-400">Send</span>
                            </button>
                          </div>
                        </div>
                      )

                      return (
                        <div key={i} className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-indigo-200 hover:bg-white transition shadow-sm relative overflow-hidden">
                          {doc.is_verified && (
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg tracking-widest flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Verified
                            </div>
                          )}
                          {doc.verification_status === 'MANUAL_REVIEW' && (
                            <div className="absolute top-0 right-0 flex items-center shadow-sm">
                              <div className="bg-amber-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-bl-lg tracking-widest border-r border-amber-600">Review</div>
                              <button 
                                onClick={() => handleApproveId(doc.id)}
                                disabled={processingId === `approve-${doc.id}`}
                                className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-black uppercase px-3 py-1.5 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                Approve
                              </button>
                            </div>
                          )}
                          {doc.verification_status === 'FAILED' && !doc.is_verified && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg tracking-widest">Failed</div>
                          )}

                          <div className="flex items-center gap-3 mt-1">
                            <div className={`w-9 h-9 border rounded-xl flex items-center justify-center flex-shrink-0 ${doc.is_verified ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
                              <FileText className={`w-4 h-4 ${doc.is_verified ? 'text-green-600' : 'text-indigo-500'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-800 truncate">{doc.document_type || 'ID Document'}</p>
                              <p className="text-[10px] text-gray-500 font-bold break-words whitespace-normal leading-tight">
                                {doc.document_number || '—'}{doc.full_name ? ` · ${doc.full_name}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-1">
                            {doc.document_image_url && renderIdImage(doc.document_image_url, '▣ Front Side', `${docBase}_Front`)}
                            {doc.back_image_url
                              ? renderIdImage(doc.back_image_url, '◫ Back Side', `${docBase}_Back`)
                              : (
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-0.5">◫ Back Side</span>
                                  <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-[9px] font-bold">
                                    Not uploaded
                                  </div>
                                </div>
                              )
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : selectedGuest.id_documents && selectedGuest.id_documents.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {selectedGuest.id_documents.map((doc: any, i: number) => {
                      const personLabel = `Person ${doc.personIndex || i + 1}`;
                      const renderDocItem = (url: string, label: string) => (
                        <div className="flex flex-col gap-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-indigo-200 hover:bg-white transition shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0">
                                <FileText className="w-5 h-5 text-indigo-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{label}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{personLabel}</p>
                              </div>
                            </div>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-indigo-50 rounded-lg transition" title="View Fullscreen">
                              <ExternalLink className="w-4 h-4 text-gray-400 hover:text-indigo-650" />
                            </a>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-gray-105">
                            <button 
                              onClick={() => {
                                const filename = `ID_${selectedGuest.guest_name.replace(/\s+/g, '_')}_${label.replace(/\s+/g, '_')}`;
                                handleDownload(url, filename, `save-${url}`);
                              }}
                              disabled={processingId === `save-${url}`}
                              className="flex flex-col items-center gap-1 py-1.5 rounded-xl hover:bg-indigo-50 transition disabled:opacity-50"
                            >
                              {processingId === `save-${url}` ? (
                                <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5 text-gray-650" />
                              )}
                              <span className="text-[8px] font-black uppercase text-gray-400">Save</span>
                            </button>
                            <button onClick={() => handlePrint(url)} className="flex flex-col items-center gap-1 py-1.5 rounded-xl hover:bg-indigo-50 transition">
                              <Printer className="w-3.5 h-3.5 text-gray-650" />
                              <span className="text-[8px] font-black uppercase text-gray-400">Print</span>
                            </button>
                            <button 
                              onClick={() => handleShare(url, `${label} - ${selectedGuest.guest_name}`, `share-${url}`)}
                              disabled={processingId === `share-${url}`}
                              className="flex flex-col items-center gap-1 py-1.5 rounded-xl hover:bg-indigo-50 transition disabled:opacity-50"
                            >
                              {processingId === `share-${url}` ? (
                                <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5 text-gray-650" />
                              )}
                              <span className="text-[8px] font-black uppercase text-gray-400">Send</span>
                            </button>
                          </div>
                        </div>
                      )
                      return (
                        <div key={i} className="space-y-3">
                          {doc.frontUrl && renderDocItem(doc.frontUrl, 'ID (Front)')}
                          {doc.backUrl && renderDocItem(doc.backUrl, 'ID (Back)')}
                        </div>
                      )
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

            {/* Modal Actions Footer */}
            <div className="p-4 bg-gray-55 border-t flex flex-col gap-2 flex-shrink-0">
              {selectedGuest.status !== 'checked_out' && (
                <button
                  onClick={async () => {
                    if (confirm(`Check out ${selectedGuest.guest_name} from their stay?`)) {
                      setIsCheckingOut(true)
                      const res = await checkoutGuest(selectedGuest.id)
                      setIsCheckingOut(false)
                      if (res.success) {
                        setSelectedGuest(null)
                      } else {
                        alert(res.error)
                      }
                    }
                  }}
                  disabled={isCheckingOut}
                  className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isCheckingOut ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4.5 h-4.5" />
                  )}
                  Check Out Guest
                </button>
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedGuest(null)}
                className="w-full h-10 text-xs font-bold border-gray-250 hover:bg-gray-50 rounded-xl"
              >
                Close details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Zero-Window Print Escape Modal */}
      {printUrl && (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
            <button 
              onClick={() => setPrintUrl(null)}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-black text-xs transition active:scale-95 flex items-center gap-2 border border-gray-700 shadow-xl"
            >
              <ChevronLeft className="w-4 h-4" /> BACK
            </button>
            <div className="text-[10px] font-black text-gray-550 tracking-[0.2em] uppercase">Print Preview</div>
            <button 
              onClick={() => window.print()}
              className="p-2.5 bg-indigo-650 rounded-xl text-white shadow-lg active:scale-95 transition"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={printUrl} 
              alt="ID Document" 
              className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg"
              onLoad={() => {
                setTimeout(() => window.print(), 300)
              }}
            />
          </div>

          <div className="p-6 bg-gray-900 border-t border-gray-800 text-center">
             <Button 
               onClick={() => setPrintUrl(null)}
               className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-bold transition"
             >
               Discard & Close
             </Button>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * { visibility: hidden !important; }
              .print-image-modal { visibility: visible !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; }
              .print-image-modal img { visibility: visible !important; width: 100% !important; max-height: none !important; }
            }
          `}} />
        </div>
      )}

      {/* Manual Approval Modal */}
      {approveModalId && (
        <div className="fixed inset-0 z-[1050] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Approve Identity Manually
              </h3>
              <button 
                onClick={() => {
                  setApproveModalId(null)
                  setManualName('')
                  setManualDocNumber('')
                }}
                className="p-1 rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                The automatic scan could not read this ID perfectly. Please enter the details manually below to approve it, or leave them blank to try again.
              </p>
              
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-750 uppercase mb-1.5">Guest Full Name</label>
                  <Input 
                    placeholder="Enter name printed on ID" 
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="focus:ring-emerald-500 h-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-750 uppercase mb-1.5">ID Document Number</label>
                  <Input 
                    placeholder="Enter Aadhaar/PAN/Passport number" 
                    value={manualDocNumber}
                    onChange={(e) => setManualDocNumber(e.target.value)}
                    className="focus:ring-emerald-500 h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={() => {
                  setApproveModalId(null)
                  setManualName('')
                  setManualDocNumber('')
                }}
                className="font-bold rounded-xl border-gray-200 text-xs h-9"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleApproveId(approveModalId, manualName, manualDocNumber)}
                disabled={processingId === `approve-${approveModalId}`}
                className="bg-emerald-650 hover:bg-emerald-750 text-white font-bold min-w-[110px] rounded-xl text-xs h-9"
              >
                {processingId === `approve-${approveModalId}` ? 'Approving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

/* Helper subcomponents to keep markup dry */

function FreeTierOverlay() {
  return (
    <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/30 flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-gray-150 shadow-inner">
      <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm gap-6 border border-gray-50 scale-105">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h4 className="text-2xl font-extrabold text-gray-900 leading-tight italic uppercase">Guest Records Locked</h4>
          <p className="text-gray-550 text-sm mt-2 font-medium">Upgrade your partner plan to view checked-in guests, verify IDs, and manage stay details.</p>
        </div>
        <Button asChild className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-black rounded-xl shadow-lg shadow-blue-600/20 uppercase tracking-widest text-white">
          <Link href="/pricing/starter">Upgrade to View</Link>
        </Button>
      </div>
    </div>
  )
}
