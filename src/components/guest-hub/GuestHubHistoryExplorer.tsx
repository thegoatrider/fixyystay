'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  DoorOpen,
  Clock,
  UtensilsCrossed,
  Sparkles,
  Search,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  UserCheck,
  FileText,
  Phone,
  Hash,
  ArrowRight,
  X,
} from 'lucide-react'

export interface HistoryExplorerProps {
  hotelName: string
  primaryColor?: string
  rooms: any[]
  stays: any[]
  requests: any[]
  theme?: 'light' | 'dark'
  initialCustomerKey?: string | null
  onCloseModal?: () => void
}

function toDateKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKeyToRange(dateKey: string): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split('-').map(Number)
  const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
  const end = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999)
  return { start, end }
}

export function formatStayDuration(checkinIso?: string, endIso?: string, isStillActive?: boolean): string {
  if (!checkinIso) return '—'
  const startMs = new Date(checkinIso).getTime()
  const endMs = endIso ? new Date(endIso).getTime() : Date.now()
  const diffMs = Math.max(0, endMs - startMs)
  const totalMins = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMins / (60 * 24))
  const hours = Math.floor((totalMins % (60 * 24)) / 60)
  const mins = totalMins % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (days === 0 && mins > 0) parts.push(`${mins}m`)
  const dur = parts.length > 0 ? parts.join(' ') : '< 1m'
  return isStillActive ? `${dur} (ongoing)` : dur
}

export function getCustomerKey(stay: { guest_name?: string; guest_phone?: string | null }): string {
  const cleanPhone = (stay.guest_phone || '').replace(/\D/g, '').slice(-10)
  if (cleanPhone.length >= 10) return `phone:${cleanPhone}`
  const cleanName = (stay.guest_name || 'guest').trim().toLowerCase().replace(/\s+/g, ' ')
  return `name:${cleanName}`
}

export default function GuestHubHistoryExplorer({
  hotelName,
  primaryColor = '#2563eb',
  rooms = [],
  stays = [],
  requests = [],
  theme = 'light',
  initialCustomerKey = null,
}: HistoryExplorerProps) {
  const isDark = theme === 'dark'

  const todayKey = useMemo(() => toDateKey(new Date()), [])
  const [subView, setSubView] = useState<'calendar' | 'customers'>(
    initialCustomerKey ? 'customers' : 'calendar'
  )
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [roomFilter, setRoomFilter] = useState<'all' | 'occupied'>('all')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(
    initialCustomerKey
  )

  useEffect(() => {
    if (initialCustomerKey) {
      setSubView('customers')
      setSelectedCustomerKey(initialCustomerKey)
    }
  }, [initialCustomerKey])

  // Map rooms by ID
  const roomById = useMemo(() => {
    const map: Record<string, any> = {}
    rooms.forEach((r) => {
      map[r.id] = r
    })
    return map
  }, [rooms])

  // Map requests by stay_id
  const requestsByStayId = useMemo(() => {
    const map: Record<string, any[]> = {}
    requests.forEach((req) => {
      const sid = req.stay_id
      if (!sid) return
      if (!map[sid]) map[sid] = []
      map[sid].push(req)
    })
    return map
  }, [requests])

  // Compute daily stats for the visible calendar month
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: {
      dateKey: string | null
      dayNumber: number | null
      occupiedRoomCount: number
      staysCount: number
      requestsCount: number
      revenue: number
    }[] = []

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({
        dateKey: null,
        dayNumber: null,
        occupiedRoomCount: 0,
        staysCount: 0,
        requestsCount: 0,
        revenue: 0,
      })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d)
      const dKey = toDateKey(cellDate)
      const { start, end } = parseDateKeyToRange(dKey)

      const overlappingStays = stays.filter((st) => {
        const cIn = new Date(st.checkin_at)
        const cOut = st.ended_at
          ? new Date(st.ended_at)
          : new Date(st.access_ends_at)
        return cIn <= end && cOut >= start
      })

      const uniqueRooms = new Set(overlappingStays.map((s) => s.room_id))

      const dayRequests = requests.filter((req) => {
        const rDate = new Date(req.created_at)
        return rDate >= start && rDate <= end
      })

      const dayRevenue = dayRequests
        .filter((r) => r.status !== 'declined')
        .reduce((sum, r) => sum + Number(r.total || 0), 0)

      cells.push({
        dateKey: dKey,
        dayNumber: d,
        occupiedRoomCount: uniqueRooms.size,
        staysCount: overlappingStays.length,
        requestsCount: dayRequests.length,
        revenue: dayRevenue,
      })
    }

    return cells
  }, [calendarMonth, stays, requests])

  // Compute Room-by-Room breakdown for the selected date
  const selectedDateRoomData = useMemo(() => {
    const { start, end } = parseDateKeyToRange(selectedDateKey)
    const now = new Date()

    const roomEntries = rooms.map((room) => {
      // Find all stays in this room that overlapped selectedDateKey
      const matchingStays = stays
        .filter((st) => {
          if (st.room_id !== room.id) return false
          const cIn = new Date(st.checkin_at)
          const cOut = st.ended_at
            ? new Date(st.ended_at)
            : new Date(st.access_ends_at)
          return cIn <= end && cOut >= start
        })
        .map((st) => {
          const isStillActive = !st.ended_at && new Date(st.access_ends_at) > now
          const endTimestamp = st.ended_at || st.access_ends_at
          const stayReqs = requestsByStayId[st.id] || []
          const dayReqs = stayReqs.filter((r) => {
            const rt = new Date(r.created_at)
            return rt >= start && rt <= end
          })
          const stayTotal = stayReqs
            .filter((r) => r.status !== 'declined')
            .reduce((sum, r) => sum + Number(r.total || 0), 0)

          return {
            ...st,
            isStillActive,
            durationLabel: formatStayDuration(st.checkin_at, endTimestamp, isStillActive),
            stayRequests: stayReqs,
            dateRequests: dayReqs,
            stayTotal,
            customerKey: getCustomerKey(st),
          }
        })

      return {
        room,
        staysOnDate: matchingStays,
        isOccupiedOnDate: matchingStays.length > 0,
      }
    })

    const totalOccupiedRooms = roomEntries.filter((r) => r.isOccupiedOnDate).length
    const totalStaysOnDate = roomEntries.reduce((s, r) => s + r.staysOnDate.length, 0)
    const allRequestsOnDate = requests.filter((req) => {
      const rt = new Date(req.created_at)
      return rt >= start && rt <= end
    })
    const totalRevenueOnDate = allRequestsOnDate
      .filter((r) => r.status !== 'declined')
      .reduce((sum, r) => sum + Number(r.total || 0), 0)

    return {
      roomEntries:
        roomFilter === 'occupied'
          ? roomEntries.filter((r) => r.isOccupiedOnDate)
          : roomEntries,
      totalOccupiedRooms,
      totalStaysOnDate,
      totalRequestsOnDate: allRequestsOnDate.length,
      totalRevenueOnDate,
    }
  }, [selectedDateKey, rooms, stays, requests, requestsByStayId, roomFilter])

  // Compute Customer-Wise Full Summary across all stays
  const customersList = useMemo(() => {
    const map = new Map<
      string,
      {
        customerKey: string
        guestName: string
        guestPhone: string | null
        stays: any[]
        allRequests: any[]
        roomsVisited: Set<string>
        totalSpend: number
        totalDurationMs: number
        latestCheckinAt: string
        hasActiveStay: boolean
        serviceCounts: Record<string, number>
      }
    >()

    const now = new Date()

    stays.forEach((st) => {
      const key = getCustomerKey(st)
      const roomObj = roomById[st.room_id]
      const roomNum = roomObj?.room_number || '—'
      const stayReqs = requestsByStayId[st.id] || []
      const isStillActive = !st.ended_at && new Date(st.access_ends_at) > now
      const endMs = st.ended_at
        ? new Date(st.ended_at).getTime()
        : isStillActive
        ? Date.now()
        : new Date(st.access_ends_at).getTime()
      const durationMs = Math.max(0, endMs - new Date(st.checkin_at).getTime())
      const staySpend = stayReqs
        .filter((r) => r.status !== 'declined')
        .reduce((sum, r) => sum + Number(r.total || 0), 0)

      const enrichedStay = {
        ...st,
        roomNumber: roomNum,
        isStillActive,
        durationLabel: formatStayDuration(
          st.checkin_at,
          st.ended_at || st.access_ends_at,
          isStillActive
        ),
        requests: stayReqs,
        staySpend,
      }

      const existing = map.get(key)
      if (!existing) {
        const srvCounts: Record<string, number> = {}
        stayReqs.forEach((r) => {
          srvCounts[r.service] = (srvCounts[r.service] || 0) + 1
        })

        map.set(key, {
          customerKey: key,
          guestName: st.guest_name || 'Guest',
          guestPhone: st.guest_phone || null,
          stays: [enrichedStay],
          allRequests: [...stayReqs],
          roomsVisited: new Set([roomNum]),
          totalSpend: staySpend,
          totalDurationMs: durationMs,
          latestCheckinAt: st.checkin_at,
          hasActiveStay: isStillActive,
          serviceCounts: srvCounts,
        })
      } else {
        existing.stays.push(enrichedStay)
        existing.allRequests.push(...stayReqs)
        existing.roomsVisited.add(roomNum)
        existing.totalSpend += staySpend
        existing.totalDurationMs += durationMs
        if (!existing.guestPhone && st.guest_phone) {
          existing.guestPhone = st.guest_phone
        }
        if (new Date(st.checkin_at) > new Date(existing.latestCheckinAt)) {
          existing.latestCheckinAt = st.checkin_at
          existing.guestName = st.guest_name || existing.guestName
        }
        if (isStillActive) existing.hasActiveStay = true
        stayReqs.forEach((r) => {
          existing.serviceCounts[r.service] =
            (existing.serviceCounts[r.service] || 0) + 1
        })
      }
    })

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.latestCheckinAt).getTime() -
        new Date(a.latestCheckinAt).getTime()
    )
  }, [stays, roomById, requestsByStayId])

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customersList
    return customersList.filter((c) => {
      if (c.guestName.toLowerCase().includes(q)) return true
      if (c.guestPhone && c.guestPhone.toLowerCase().includes(q)) return true
      if (Array.from(c.roomsVisited).some((rm) => rm.toLowerCase().includes(q)))
        return true
      if (
        c.allRequests.some(
          (r) =>
            r.service?.toLowerCase().includes(q) ||
            (r.items || []).some((it: any) =>
              it.name?.toLowerCase().includes(q)
            )
        )
      )
        return true
      return false
    })
  }, [customersList, customerSearch])

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerKey) return null
    return (
      customersList.find((c) => c.customerKey === selectedCustomerKey) || null
    )
  }, [customersList, selectedCustomerKey])

  // Export CSV for selected date
  const handleExportDateCsv = () => {
    const rows: string[][] = [
      [
        'Date',
        'Room',
        'Guest Name',
        'Phone',
        'Check-In',
        'Check-Out / Access End',
        'Stay Duration',
        'Status',
        'Requests Count',
        'Order Total (INR)',
        'Requested Items Detail',
      ],
    ]

    selectedDateRoomData.roomEntries.forEach(({ room, staysOnDate }) => {
      if (staysOnDate.length === 0) {
        rows.push([
          selectedDateKey,
          room.room_number,
          'Vacant',
          '',
          '',
          '',
          '',
          'Vacant',
          '0',
          '0',
          '',
        ])
      } else {
        staysOnDate.forEach((st: any) => {
          const itemsSummary = (st.stayRequests || [])
            .map((r: any) => {
              const its = (r.items || [])
                .map((i: any) => `${i.qty}x ${i.name}`)
                .join('; ')
              return `[${r.service.toUpperCase()} - ${r.status}]: ${its || r.note || 'Request'}`
            })
            .join(' | ')

          rows.push([
            selectedDateKey,
            room.room_number,
            st.guest_name || '',
            st.guest_phone || '',
            new Date(st.checkin_at).toLocaleString(),
            new Date(st.ended_at || st.access_ends_at).toLocaleString(),
            st.durationLabel,
            st.isStillActive ? 'Active' : 'Completed',
            String(st.stayRequests?.length || 0),
            String(st.stayTotal || 0),
            itemsSummary,
          ])
        })
      }
    })

    const csvContent = rows
      .map((r) =>
        r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${hotelName.replace(/\s+/g, '_')}_History_${selectedDateKey}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export CSV for all customers
  const handleExportCustomersCsv = () => {
    const rows: string[][] = [
      [
        'Guest Name',
        'Phone',
        'Total Stays',
        'Rooms Visited',
        'Total Requests',
        'Lifetime Spend (INR)',
        'Latest Check-In',
        'Full Request History',
      ],
    ]

    filteredCustomers.forEach((c) => {
      const reqSummary = c.allRequests
        .map((r: any) => {
          const its = (r.items || [])
            .map((i: any) => `${i.qty}x ${i.name}`)
            .join('; ')
          return `${new Date(r.created_at).toLocaleDateString()} [${r.service}]: ${its} (Rs.${r.total || 0})`
        })
        .join(' | ')

      rows.push([
        c.guestName,
        c.guestPhone || '—',
        String(c.stays.length),
        Array.from(c.roomsVisited).join(', '),
        String(c.allRequests.length),
        String(c.totalSpend),
        new Date(c.latestCheckinAt).toLocaleString(),
        reqSummary,
      ])
    })

    const csvContent = rows
      .map((r) =>
        r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${hotelName.replace(/\s+/g, '_')}_Customer_Summaries.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Styling tokens for light vs dark mode
  const cardBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-gray-200 text-gray-900'
  const mutedBg = isDark
    ? 'bg-slate-950/70 border-slate-800 text-slate-300'
    : 'bg-gray-50 border-gray-200/80 text-gray-700'
  const textSub = isDark ? 'text-slate-400' : 'text-gray-500'

  return (
    <div className="space-y-6">
      {/* Top Mode Switcher: Calendar & Date-Wise Rooms vs Customer-Wise Full Summary */}
      <div
        className={`rounded-3xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${cardBg}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSubView('calendar')}
            style={
              subView === 'calendar' ? { backgroundColor: primaryColor } : {}
            }
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition ${
              subView === 'calendar'
                ? 'text-white shadow-md'
                : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Date &amp; Room Calendar History
          </button>

          <button
            onClick={() => setSubView('customers')}
            style={
              subView === 'customers' ? { backgroundColor: primaryColor } : {}
            }
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition ${
              subView === 'customers'
                ? 'text-white shadow-md'
                : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Customer-Wise Full Summary ({customersList.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subView === 'calendar' ? (
            <button
              onClick={handleExportDateCsv}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Download className="w-3.5 h-3.5" /> Export Date CSV
            </button>
          ) : (
            <button
              onClick={handleExportCustomersCsv}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Download className="w-3.5 h-3.5" /> Export All Customers CSV
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================
          VIEW 1: BUILT-IN CALENDAR & DATE-WISE ROOM MATRIX
         ==================================================================== */}
      {subView === 'calendar' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Built-In Month Calendar */}
          <div className={`lg:col-span-5 rounded-3xl border p-5 space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">
                  {calendarMonth.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <p className={`text-xs ${textSub}`}>
                  Tap any date to inspect every room, guest &amp; request
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() - 1,
                        1
                      )
                    )
                  }
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center ${mutedBg}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const now = new Date()
                    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                    setSelectedDateKey(toDateKey(now))
                  }}
                  className={`px-2.5 h-8 rounded-xl border text-xs font-bold ${mutedBg}`}
                >
                  Today
                </button>
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() + 1,
                        1
                      )
                    )
                  }
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center ${mutedBg}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Direct Date Jump Input */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className={`text-xs font-bold ${textSub}`}>Jump to date:</span>
              <input
                type="date"
                value={selectedDateKey}
                onChange={(e) => {
                  if (!e.target.value) return
                  setSelectedDateKey(e.target.value)
                  const [y, m] = e.target.value.split('-').map(Number)
                  if (y && m) setCalendarMonth(new Date(y, m - 1, 1))
                }}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${mutedBg}`}
              />
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center pt-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  className={`text-[10px] font-black uppercase tracking-wider py-1 ${textSub}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                if (!cell.dateKey) {
                  return <div key={`empty_${idx}`} className="h-16 rounded-xl" />
                }
                const isSelected = cell.dateKey === selectedDateKey
                const isToday = cell.dateKey === todayKey
                const hasActivity =
                  cell.occupiedRoomCount > 0 || cell.requestsCount > 0

                return (
                  <button
                    key={cell.dateKey}
                    onClick={() => setSelectedDateKey(cell.dateKey!)}
                    style={
                      isSelected
                        ? {
                            backgroundColor: primaryColor,
                            borderColor: primaryColor,
                          }
                        : {}
                    }
                    className={`h-16 rounded-2xl border p-1.5 flex flex-col justify-between text-left transition relative ${
                      isSelected
                        ? 'text-white shadow-md'
                        : isToday
                        ? isDark
                          ? 'border-blue-500 bg-blue-950/30'
                          : 'border-blue-500 bg-blue-50/50'
                        : hasActivity
                        ? isDark
                          ? 'border-slate-700 bg-slate-800/80 hover:border-slate-600'
                          : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                        : isDark
                        ? 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/50'
                        : 'border-gray-100 bg-gray-50/40 hover:bg-gray-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-black ${
                          isSelected ? 'text-white' : ''
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {isToday && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {cell.occupiedRoomCount > 0 && (
                        <div
                          className={`text-[9px] font-black px-1 py-0.2 rounded truncate ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {cell.occupiedRoomCount} rm
                        </div>
                      )}
                      {cell.requestsCount > 0 && (
                        <div
                          className={`text-[9px] font-black px-1 py-0.2 rounded truncate ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {cell.requestsCount} req
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Column: Room-by-Room Breakdown for Selected Date */}
          <div className="lg:col-span-7 space-y-4">
            {/* Selected Date KPI Banner */}
            <div className={`rounded-3xl border p-5 space-y-4 ${cardBg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className={`text-[11px] font-black uppercase tracking-wider ${textSub}`}>
                    Selected Date Breakdown
                  </span>
                  <h3 className="text-xl font-black mt-0.5">
                    {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString(
                      'en-IN',
                      {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRoomFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      roomFilter === 'all'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : mutedBg
                    }`}
                  >
                    All Rooms ({rooms.length})
                  </button>
                  <button
                    onClick={() => setRoomFilter('occupied')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      roomFilter === 'occupied'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : mutedBg
                    }`}
                  >
                    Occupied ({selectedDateRoomData.totalOccupiedRooms})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-2xl border ${mutedBg}`}>
                  <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                    Occupied Rooms
                  </p>
                  <p className="text-lg font-black mt-0.5">
                    {selectedDateRoomData.totalOccupiedRooms} / {rooms.length}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border ${mutedBg}`}>
                  <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                    Guests / Stays
                  </p>
                  <p className="text-lg font-black mt-0.5">
                    {selectedDateRoomData.totalStaysOnDate}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border ${mutedBg}`}>
                  <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                    Requests on Date
                  </p>
                  <p className="text-lg font-black mt-0.5">
                    {selectedDateRoomData.totalRequestsOnDate}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border ${mutedBg}`}>
                  <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                    Orders Value
                  </p>
                  <p className="text-lg font-black mt-0.5 text-emerald-500">
                    ₹{selectedDateRoomData.totalRevenueOnDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Room Cards List for Selected Date */}
            <div className="space-y-3">
              {selectedDateRoomData.roomEntries.length === 0 ? (
                <div className={`rounded-3xl border p-10 text-center ${cardBg}`}>
                  <DoorOpen className={`w-10 h-10 mx-auto mb-2 ${textSub}`} />
                  <p className="font-black text-sm">
                    No occupied rooms on this date
                  </p>
                  <p className={`text-xs mt-1 ${textSub}`}>
                    Switch to &ldquo;All Rooms&rdquo; or select another date on the calendar.
                  </p>
                </div>
              ) : (
                selectedDateRoomData.roomEntries.map(({ room, staysOnDate }) => (
                  <div
                    key={room.id}
                    className={`rounded-3xl border p-5 space-y-4 ${cardBg}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="px-3.5 py-1.5 rounded-2xl text-sm font-black text-white shadow-sm"
                          style={{
                            backgroundColor:
                              staysOnDate.length > 0 ? primaryColor : '#64748b',
                          }}
                        >
                          Room {room.room_number}
                        </span>
                        {staysOnDate.length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-black uppercase">
                            {staysOnDate.length} Stay(s) on this Date
                          </span>
                        ) : (
                          <span className={`text-xs font-bold ${textSub}`}>
                            Vacant on this date
                          </span>
                        )}
                      </div>
                    </div>

                    {staysOnDate.length > 0 && (
                      <div className="space-y-4">
                        {staysOnDate.map((st: any) => (
                          <div
                            key={st.id}
                            className={`rounded-2xl border p-4 space-y-3 ${mutedBg}`}
                          >
                            {/* Guest Header & Stay Duration */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-300/30 dark:border-slate-800">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-base">
                                    {st.guest_name}
                                  </h4>
                                  {st.guest_phone && (
                                    <span className={`text-xs font-bold flex items-center gap-1 ${textSub}`}>
                                      <Phone className="w-3 h-3" /> {st.guest_phone}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-500 text-[11px] font-black">
                                    PIN: {st.pin_code}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                      st.isStillActive
                                        ? 'bg-emerald-500/20 text-emerald-500'
                                        : 'bg-slate-500/20 text-slate-400'
                                    }`}
                                  >
                                    {st.isStillActive ? 'Active Stay' : 'Checked Out'}
                                  </span>
                                </div>
                                <div className={`text-xs mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 ${textSub}`}>
                                  <span>
                                    <strong>Check-In:</strong>{' '}
                                    {new Date(st.checkin_at).toLocaleString([], {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span>
                                    <strong>
                                      {st.ended_at ? 'Checked Out:' : 'Access Ends:'}
                                    </strong>{' '}
                                    {new Date(
                                      st.ended_at || st.access_ends_at
                                    ).toLocaleString([], {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="text-blue-500 font-black">
                                    Duration: {st.durationLabel}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  setSelectedCustomerKey(st.customerKey)
                                }
                                style={{ backgroundColor: primaryColor }}
                                className="px-3.5 py-2 rounded-xl text-white text-xs font-black flex items-center gap-1.5 self-start sm:self-center shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Customer Full Summary
                              </button>
                            </div>

                            {/* Requests & Orders Placed by this Guest */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-black uppercase tracking-wider">
                                  Requests &amp; Orders in Stay (
                                  {st.stayRequests.length})
                                </p>
                                {st.stayTotal > 0 && (
                                  <span className="text-xs font-black text-emerald-500">
                                    Stay Order Total: ₹{st.stayTotal}
                                  </span>
                                )}
                              </div>

                              {st.stayRequests.length === 0 ? (
                                <p className={`text-xs italic ${textSub}`}>
                                  No service requests or food orders placed during this stay.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {st.stayRequests.map((req: any) => (
                                    <div
                                      key={req.id}
                                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${cardBg}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="font-black uppercase text-blue-500">
                                            {req.service.replace('_', ' ')}
                                          </span>
                                          <span className={textSub}>
                                            {new Date(
                                              req.created_at
                                            ).toLocaleString([], {
                                              day: 'numeric',
                                              month: 'short',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            req.status === 'completed'
                                              ? 'bg-emerald-500/15 text-emerald-500'
                                              : req.status === 'declined'
                                              ? 'bg-red-500/15 text-red-500'
                                              : 'bg-amber-500/15 text-amber-500'
                                          }`}
                                        >
                                          {req.status}
                                        </span>
                                      </div>

                                      {Array.isArray(req.items) &&
                                        req.items.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5">
                                            {req.items.map(
                                              (it: any, idx: number) => (
                                                <span
                                                  key={idx}
                                                  className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${mutedBg}`}
                                                >
                                                  {it.qty} × {it.name}
                                                  {it.price
                                                    ? ` (₹${it.price * it.qty})`
                                                    : ''}
                                                </span>
                                              )
                                            )}
                                          </div>
                                        )}

                                      {req.note && (
                                        <p className={`italic ${textSub}`}>
                                          Note: &ldquo;{req.note}&rdquo;
                                        </p>
                                      )}

                                      <div
                                        className={`flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] ${textSub}`}
                                      >
                                        <span>
                                          {req.accepted_by
                                            ? `Accepted by ${req.accepted_by}`
                                            : ''}
                                          {req.completed_by
                                            ? ` · Completed by ${req.completed_by}`
                                            : ''}
                                        </span>
                                        {req.total > 0 && (
                                          <span className="font-black text-emerald-500">
                                            ₹{req.total}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          VIEW 2: CUSTOMER-WISE FULL SUMMARY DIRECTORY
         ==================================================================== */}
      {subView === 'customers' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className={`rounded-3xl border p-4 flex items-center gap-3 ${cardBg}`}>
            <Search className={`w-5 h-5 ${textSub}`} />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer by name, phone number, room number, or ordered item..."
              className="w-full bg-transparent text-sm font-bold outline-none"
            />
            {customerSearch && (
              <button
                onClick={() => setCustomerSearch('')}
                className={`text-xs font-bold ${textSub}`}
              >
                Clear
              </button>
            )}
          </div>

          {filteredCustomers.length === 0 ? (
            <div className={`rounded-3xl border p-12 text-center ${cardBg}`}>
              <Users className={`w-10 h-10 mx-auto mb-2 ${textSub}`} />
              <p className="font-black text-base">No matching customer records</p>
              <p className={`text-xs mt-1 ${textSub}`}>
                Every guest checked into Guest Hub appears here with their full stay and request summary.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredCustomers.map((cust) => (
                <div
                  key={cust.customerKey}
                  className={`rounded-3xl border p-5 flex flex-col justify-between gap-4 transition hover:shadow-md ${cardBg}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-lg font-black">{cust.guestName}</h4>
                          {cust.stays.length > 1 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-500 text-[10px] font-black uppercase">
                              Returning Guest ({cust.stays.length} Stays)
                            </span>
                          )}
                          {cust.hasActiveStay && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-black uppercase">
                              In-House Now
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-semibold mt-0.5 ${textSub}`}>
                          {cust.guestPhone ? `📞 ${cust.guestPhone} · ` : ''}
                          Rooms: {Array.from(cust.roomsVisited).join(', ')}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-black text-emerald-500">
                          ₹{cust.totalSpend}
                        </p>
                        <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                          Total Ordered
                        </p>
                      </div>
                    </div>

                    {/* Customer Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`p-2.5 rounded-2xl border text-center ${mutedBg}`}>
                        <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                          Stays
                        </p>
                        <p className="text-sm font-black">{cust.stays.length}</p>
                      </div>
                      <div className={`p-2.5 rounded-2xl border text-center ${mutedBg}`}>
                        <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                          Requests
                        </p>
                        <p className="text-sm font-black">
                          {cust.allRequests.length}
                        </p>
                      </div>
                      <div className={`p-2.5 rounded-2xl border text-center ${mutedBg}`}>
                        <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                          Last Check-in
                        </p>
                        <p className="text-xs font-black">
                          {new Date(cust.latestCheckinAt).toLocaleDateString(
                            [],
                            {
                              day: 'numeric',
                              month: 'short',
                            }
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Services Used Pills */}
                    {Object.keys(cust.serviceCounts).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(cust.serviceCounts).map(
                          ([srv, count]) => (
                            <span
                              key={srv}
                              className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-500 text-[11px] font-black capitalize"
                            >
                              {srv.replace('_', ' ')}: {count}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedCustomerKey(cust.customerKey)}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full py-3 rounded-2xl text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Open Full Customer Summary &amp; Timeline
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          CUSTOMER FULL SUMMARY MODAL / DOSSIER
         ==================================================================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col ${cardBg}`}
          >
            {/* Modal Header */}
            <div
              className="p-6 text-white flex items-start justify-between gap-4"
              style={{ backgroundColor: primaryColor }}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest">
                    Customer Full Summary
                  </span>
                  {selectedCustomer.stays.length > 1 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                      Returning Guest · {selectedCustomer.stays.length} Stays
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black mt-1.5">
                  {selectedCustomer.guestName}
                </h2>
                <p className="text-xs text-white/90 mt-0.5">
                  {selectedCustomer.guestPhone
                    ? `Phone: ${selectedCustomer.guestPhone} · `
                    : ''}
                  Rooms Visited:{' '}
                  {Array.from(selectedCustomer.roomsVisited).join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-black flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setSelectedCustomerKey(null)}
                  className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Top Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3.5 rounded-2xl border ${mutedBg}`}>
                  <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                    Total Stays
                  </p>
                  <p className="text-xl font-black mt-0.5">
                    {selectedCustomer.stays.length}
                  </p>
                </div>
                <div className={`p-3.5 rounded-2xl border ${mutedBg}`}>
                  <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                    Total Requests
                  </p>
                  <p className="text-xl font-black mt-0.5">
                    {selectedCustomer.allRequests.length}
                  </p>
                </div>
                <div className={`p-3.5 rounded-2xl border ${mutedBg}`}>
                  <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                    Rooms Stayed
                  </p>
                  <p className="text-xl font-black mt-0.5">
                    {Array.from(selectedCustomer.roomsVisited).join(', ')}
                  </p>
                </div>
                <div className={`p-3.5 rounded-2xl border ${mutedBg}`}>
                  <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                    Total Spend
                  </p>
                  <p className="text-xl font-black mt-0.5 text-emerald-500">
                    ₹{selectedCustomer.totalSpend}
                  </p>
                </div>
              </div>

              {/* Stay-by-Stay Complete Breakdown */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Stay-by-Stay History &amp; Itemized Requests
                </h3>

                {selectedCustomer.stays.map((st: any, idx: number) => (
                  <div
                    key={st.id}
                    className={`rounded-3xl border p-5 space-y-4 ${mutedBg}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-300/30 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-3 py-1 rounded-xl text-xs font-black text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Room {st.roomNumber}
                          </span>
                          <span className="text-xs font-black">
                            Stay #{selectedCustomer.stays.length - idx}
                          </span>
                          <span className="text-xs font-bold text-blue-500">
                            Duration: {st.durationLabel}
                          </span>
                        </div>
                        <p className={`text-xs mt-1.5 ${textSub}`}>
                          <strong>Check-In:</strong>{' '}
                          {new Date(st.checkin_at).toLocaleString()} &rarr;{' '}
                          <strong>
                            {st.ended_at ? 'Checked Out:' : 'Access Ends:'}
                          </strong>{' '}
                          {new Date(
                            st.ended_at || st.access_ends_at
                          ).toLocaleString()}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${textSub}`}>
                          Checked in by: {st.created_by || 'Reception'}
                          {st.ended_by ? ` · Ended by: ${st.ended_by}` : ''} ·
                          4-Digit PIN: <strong>{st.pin_code}</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-500">
                          Stay Bill: ₹{st.staySpend}
                        </p>
                        <p className={`text-[11px] ${textSub}`}>
                          {st.requests.length} request(s)
                        </p>
                      </div>
                    </div>

                    {st.requests.length === 0 ? (
                      <p className={`text-xs italic ${textSub}`}>
                        No requests or food orders were placed during this stay.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {st.requests.map((req: any) => (
                          <div
                            key={req.id}
                            className={`p-3.5 rounded-2xl border text-xs space-y-2 ${cardBg}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-black uppercase text-blue-500">
                                  {req.service.replace('_', ' ')}
                                </span>
                                <span className={`text-[11px] ${textSub}`}>
                                  ({req.department?.replace('_', ' ')})
                                </span>
                                <span className={textSub}>
                                  ·{' '}
                                  {new Date(req.created_at).toLocaleString([], {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  req.status === 'completed'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : req.status === 'declined'
                                    ? 'bg-red-500/15 text-red-500'
                                    : 'bg-amber-500/15 text-amber-500'
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>

                            {Array.isArray(req.items) &&
                              req.items.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  {req.items.map((it: any, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="font-semibold">
                                        {it.qty} × {it.name}
                                        {it.details ? ` (${it.details})` : ''}
                                      </span>
                                      {it.price > 0 && (
                                        <span className="font-bold">
                                          ₹{it.price * it.qty}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                            {req.details &&
                              Object.keys(req.details).length > 0 && (
                                <div className={`text-[11px] ${textSub}`}>
                                  {req.details.destination && (
                                    <span>
                                      Destination: {req.details.destination} ·
                                      Pickup: {req.details.pickupDate}{' '}
                                      {req.details.pickupTime} (
                                      {req.details.passengers} pax)
                                    </span>
                                  )}
                                  {req.details.occasion && (
                                    <span>
                                      Occasion: {req.details.occasion} (
                                      {req.details.date}) —{' '}
                                      {req.details.celebrationDetails}
                                    </span>
                                  )}
                                </div>
                              )}

                            {req.note && (
                              <p className={`italic ${textSub}`}>
                                Guest Note: &ldquo;{req.note}&rdquo;
                              </p>
                            )}

                            {req.status === 'declined' && req.decline_reason && (
                              <p className="text-red-500 font-bold">
                                Decline Reason: {req.decline_reason}
                              </p>
                            )}

                            <div
                              className={`flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px] ${textSub}`}
                            >
                              <div className="flex flex-wrap gap-3">
                                <span>
                                  Sent:{' '}
                                  {new Date(req.created_at).toLocaleTimeString(
                                    [],
                                    { hour: '2-digit', minute: '2-digit' }
                                  )}
                                </span>
                                {req.accepted_at && (
                                  <span>
                                    Accepted:{' '}
                                    {new Date(
                                      req.accepted_at
                                    ).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    {req.accepted_by
                                      ? ` (${req.accepted_by})`
                                      : ''}
                                  </span>
                                )}
                                {req.completed_at && (
                                  <span className="text-emerald-500 font-bold">
                                    Completed:{' '}
                                    {new Date(
                                      req.completed_at
                                    ).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    {req.completed_by
                                      ? ` (${req.completed_by})`
                                      : ''}
                                  </span>
                                )}
                              </div>
                              {req.total > 0 && (
                                <span className="font-black text-sm text-emerald-500">
                                  Total: ₹{req.total}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
