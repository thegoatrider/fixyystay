'use client'

import { useState, useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, User, Phone, Users, FileText, ExternalLink, X, AlertCircle, Calendar as CalIcon, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

type GuestCheckin = {
  id: string
  guest_name: string
  guest_phone: string
  num_people: number
  checkin_date: string | null
  checkout_date: string | null
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

export default function GuestList({ checkins }: { checkins: GuestCheckin[] }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<GuestCheckin | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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

  // When searching, show ALL matching guests regardless of date
  const allSearchResults = useMemo(() => {
    if (!searchTerm) return []
    const q = searchTerm.toLowerCase()
    return checkins.filter(c =>
      c.guest_name.toLowerCase().includes(q) ||
      c.guest_phone.includes(q) ||
      c.properties.name.toLowerCase().includes(q) ||
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
          <h2 className="text-xl font-bold text-gray-900">Guest Check-in Calendar</h2>
          <p className="text-sm text-gray-400 mt-0.5">{checkins.length} registered guests · click a date to view</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search guests..."
            className="pl-9 h-9 text-sm"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value) }}
          />
        </div>
      </div>

      {/* Three-column layout: calendar | guest list | guest detail */}
      <div className="grid lg:grid-cols-[1fr_280px_340px] gap-5 items-start">

        {/* ── Calendar ── */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
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
            = number of check-ins on that date
          </div>
        </div>

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
                          <p className="text-xs text-gray-400 truncate">{guest.properties.name}</p>
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
                          <p className="text-xs text-gray-400 truncate">{guest.properties.name}</p>
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
                    <h3 className="font-bold text-gray-900">{selectedGuest.guest_name}</h3>
                    <p className="text-xs text-gray-400">{selectedGuest.properties.name}</p>
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ID Documents</p>
                  {selectedGuest.id_documents && selectedGuest.id_documents.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {selectedGuest.id_documents.map((doc: any, i: number) => (
                        <div key={i} className="flex flex-col gap-2">
                          {doc.frontUrl && (
                            <a
                              href={doc.frontUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-2 p-3 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-xl transition-all group"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white border rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                  <FileText className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-700">
                                    ID Document (Front) — Person {doc.personIndex || i + 1}
                                  </p>
                                  <p className="text-[11px] text-gray-400">Tap to view image</p>
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 flex-shrink-0" />
                            </a>
                          )}
                          {doc.backUrl && (
                            <a
                              href={doc.backUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-2 p-3 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-xl transition-all group"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white border rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                  <FileText className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-700">
                                    ID Document (Back) — Person {doc.personIndex || i + 1}
                                  </p>
                                  <p className="text-[11px] text-gray-400">Tap to view image</p>
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 flex-shrink-0" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      No ID documents uploaded yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed rounded-2xl p-8 text-center text-gray-400 flex flex-col items-center gap-3">
              <User className="w-8 h-8 opacity-30" />
              <p className="text-xs font-medium">Select a guest<br/>to view details</p>
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
    </div>
  )
}
