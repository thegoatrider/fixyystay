'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeCanvas } from 'qrcode.react'
import { createClient } from '@/utils/supabase/client'
import {
  Bell,
  Volume2,
  DoorOpen,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  PlusCircle,
  LogOut,
  UserCheck,
  KeyRound,
  Smartphone,
  Building2,
  Eye,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import {
  loginHubStaffAction,
  logoutHubStaffAction,
  getPropertyGuestHubBundle,
  createStayCheckinAction,
  extendStayAction,
  endStayAction,
  updateHubRequestStatusAction,
} from '@/app/actions/guest-hub'

// Web Audio synthesizer for reliable desk-phone chime (zero external MP3 asset failure)
function playDeskAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const notes = [587.33, 880, 1174.66] // D5, A5, D6 bell triad
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14)
      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.14)
      gain.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + idx * 0.14 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.14 + 0.65)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + idx * 0.14)
      osc.stop(ctx.currentTime + idx * 0.14 + 0.7)
    })
  } catch (e) {
    console.warn('Audio playback blocked until user interaction:', e)
  }
}

export default function StaffPortalClient({
  initialAuthorized,
  initialBundle,
  ownerProperties = [],
  initialPropertyId,
}: {
  initialAuthorized: boolean
  initialBundle: any
  ownerProperties?: { id: string; name: string }[]
  initialPropertyId?: string | null
}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(initialAuthorized)
  const [bundle, setBundle] = useState<any>(initialBundle)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    initialPropertyId || initialBundle?.property?.id || ownerProperties[0]?.id || ''
  )

  // Staff Login form state
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [hotelSlug, setHotelSlug] = useState('')
  const [showSlugField, setShowSlugField] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // Staff navigation state
  const [activeTab, setActiveTab] = useState<'inbox' | 'rooms'>('inbox')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  // Check-in Modal state
  const [checkinRoom, setCheckinRoom] = useState<any | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [checkinAtStr, setCheckinAtStr] = useState('')
  const [accessEndsAtStr, setAccessEndsAtStr] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [createdStayPinModal, setCreatedStayPinModal] = useState<{
    roomNumber: string
    guestName: string
    pinCode: string
    qrToken: string
  } | null>(null)

  // QR Modal state
  const [qrModalRoom, setQrModalRoom] = useState<any | null>(null)

  // Decline Reason Modal state
  const [decliningRequestId, setDecliningRequestId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  // Full-screen Alert & Desk Wake-Lock state
  const [fullScreenAlertReq, setFullScreenAlertReq] = useState<any | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const seenRequestIdsRef = useRef<Set<string>>(
    new Set((initialBundle?.requests || []).map((r: any) => r.id))
  )

  const origin =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      : 'https://www.fixystays.com'

  const refreshBundle = useCallback(
    async (propId?: string) => {
      const targetId = propId || selectedPropertyId
      if (!targetId) return
      const res = await getPropertyGuestHubBundle(targetId)
      if (!res.error && res.property) {
        setBundle(res)
        res.requests?.forEach((r: any) => seenRequestIdsRef.current.add(r.id))
      }
    },
    [selectedPropertyId]
  )

  // Request browser notification permission & Wake Lock helper
  const enableDeskModeAndTestSound = async () => {
    playDeskAlertChime()
    setSoundEnabled(true)

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => {})
      }
    }

    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        await (navigator as any).wakeLock.request('screen')
        setWakeLockActive(true)
      } catch {
        // Wake lock optional fallback
      }
    }
  }

  // Subscribe to Realtime requests & stays for this hotel
  useEffect(() => {
    if (!authorized || !selectedPropertyId) return

    const supabase = createClient()

    const handleIncomingRequests = async () => {
      const res = await getPropertyGuestHubBundle(selectedPropertyId)
      if (res.error || !res.requests) return

      const allowedDepts: string[] = res.actor?.departments || []
      const isManagerOrAdmin =
        res.actor?.actorRole === 'admin' ||
        res.actor?.actorRole === 'manager' ||
        res.actor?.actorRole === 'platform_owner'

      // Check if there is a brand-new 'received' request for our department
      for (const req of res.requests) {
        if (!seenRequestIdsRef.current.has(req.id)) {
          seenRequestIdsRef.current.add(req.id)
          const matchesDept =
            isManagerOrAdmin || allowedDepts.includes(req.department)

          if (req.status === 'received' && matchesDept) {
            playDeskAlertChime()
            setFullScreenAlertReq(req)

            // Browser notification when page is in background
            if (
              typeof document !== 'undefined' &&
              document.hidden &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              try {
                new Notification(`Room ${req.room_number} · New Request`, {
                  body: `${req.guest_name}: ${req.service.replace('_', ' ')}`,
                })
              } catch {}
            }
            break
          }
        }
      }

      setBundle(res)
    }

    const channel = supabase
      .channel(`staff_hub_${selectedPropertyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hub_requests',
          filter: `property_id=eq.${selectedPropertyId}`,
        },
        () => {
          handleIncomingRequests()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hub_stays',
          filter: `property_id=eq.${selectedPropertyId}`,
        },
        () => {
          refreshBundle(selectedPropertyId)
        }
      )
      .subscribe()

    const pollInterval = setInterval(handleIncomingRequests, 6000)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [authorized, selectedPropertyId, refreshBundle])

  // Auto-mark requests as 'seen' when staff opens a room thread
  useEffect(() => {
    if (!selectedRoomId || !bundle?.requests || !selectedPropertyId) return
    const unseen = bundle.requests.filter(
      (r: any) => r.room_id === selectedRoomId && r.status === 'received'
    )
    if (unseen.length === 0) return

    unseen.forEach((req: any) => {
      updateHubRequestStatusAction({
        propertyId: selectedPropertyId,
        requestId: req.id,
        status: 'seen',
      }).then(() => refreshBundle(selectedPropertyId))
    })
  }, [selectedRoomId, bundle?.requests, selectedPropertyId, refreshBundle])

  // Handle Staff Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)
    try {
      const res = await loginHubStaffAction({
        hotelSlugOrId: hotelSlug,
        loginId,
        password,
      })
      if (res.error) {
        setLoginError(res.error)
        if ((res as any).needsHotelSlug) setShowSlugField(true)
      } else if (res.session) {
        setAuthorized(true)
        setSelectedPropertyId(res.session.propertyId)
        await refreshBundle(res.session.propertyId)
      }
    } catch {
      setLoginError('Failed to log in. Please try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await logoutHubStaffAction()
    setAuthorized(false)
    setBundle(null)
    router.refresh()
  }

  // Open Check-in modal with default now & +24h times
  const openCheckinModal = (room: any) => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const toLocalInput = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`
    }
    setCheckinRoom(room)
    setGuestName('')
    setGuestPhone('')
    setCheckinAtStr(toLocalInput(now))
    setAccessEndsAtStr(toLocalInput(tomorrow))
  }

  const handleConfirmCheckin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkinRoom || !guestName.trim()) return
    setCheckingIn(true)
    try {
      const res = await createStayCheckinAction({
        propertyId: selectedPropertyId,
        roomId: checkinRoom.id,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || undefined,
        checkinAt: checkinAtStr ? new Date(checkinAtStr).toISOString() : undefined,
        accessEndsAt: accessEndsAtStr
          ? new Date(accessEndsAtStr).toISOString()
          : undefined,
      })
      if (res.error) {
        alert(res.error)
      } else if (res.stay) {
        const roomRef = checkinRoom
        setCheckinRoom(null)
        await refreshBundle(selectedPropertyId)
        setCreatedStayPinModal({
          roomNumber: roomRef.room_number,
          guestName: res.stay.guest_name,
          pinCode: res.stay.pin_code,
          qrToken: roomRef.qr_token,
        })
      }
    } finally {
      setCheckingIn(false)
    }
  }

  // ==========================================================================
  // RENDER LOGIN SCREEN IF NOT AUTHORIZED
  // ==========================================================================

  if (!authorized || !bundle?.property) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-lg shadow-lg shadow-blue-600/30">
              GH
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Guest Hub · Staff Login</h1>
              <p className="text-xs text-slate-400">
                Reception, Housekeeping &amp; Department Screen
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {showSlugField && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Hotel Code / Slug
                </label>
                <input
                  type="text"
                  value={hotelSlug}
                  onChange={(e) => setHotelSlug(e.target.value)}
                  placeholder="e.g. madhureela-holiday-home"
                  className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Staff Login ID
              </label>
              <input
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. reception1"
                className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-600/25 transition active:scale-95"
            >
              {loggingIn ? 'Signing in...' : 'Sign In to Staff Screen'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // AUTHORIZED STAFF PORTAL
  // ==========================================================================

  const { actor, property, hubSettings, rooms = [], stays = [], requests = [] } = bundle
  const primaryColor = hubSettings?.branding?.primaryColor || '#2563eb'
  const hotelName = hubSettings?.branding?.hotelName || property.name

  const canManageRoomsAndCheckin =
    actor.actorRole === 'admin' ||
    actor.actorRole === 'manager' ||
    actor.actorRole === 'platform_owner' ||
    actor.departments?.includes('front_desk')

  const allowedDepartments: string[] =
    actor.actorRole === 'admin' ||
    actor.actorRole === 'manager' ||
    actor.actorRole === 'platform_owner'
      ? ['front_desk', 'restaurant', 'housekeeping', 'emergency']
      : actor.departments || []

  // Map active stays by room_id
  const now = new Date()
  const activeStayByRoomId: Record<string, any> = {}
  stays.forEach((st: any) => {
    if (!st.ended_at && new Date(st.access_ends_at) > now && !activeStayByRoomId[st.room_id]) {
      activeStayByRoomId[st.room_id] = st
    }
  })

  // Filter requests by allowed departments and selected department filter
  const visibleRequests = requests.filter((req: any) => {
    if (!allowedDepartments.includes(req.department)) return false
    if (deptFilter !== 'all' && req.department !== deptFilter) return false
    return true
  })

  // Group requests by room (One row per room with its latest request and time, newest first)
  const roomRows = useMemo(() => {
    const map = new Map<
      string,
      {
        roomId: string
        roomNumber: string
        guestName: string
        latestRequest: any
        unreadCount: number
        allRequests: any[]
      }
    >()

    visibleRequests.forEach((req: any) => {
      const existing = map.get(req.room_id)
      const isPending = req.status === 'received' || req.status === 'seen'
      if (!existing) {
        map.set(req.room_id, {
          roomId: req.room_id,
          roomNumber: req.room_number,
          guestName: req.guest_name,
          latestRequest: req,
          unreadCount: isPending ? 1 : 0,
          allRequests: [req],
        })
      } else {
        existing.allRequests.push(req)
        if (isPending) existing.unreadCount += 1
      }
    })

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.latestRequest.created_at).getTime() -
        new Date(a.latestRequest.created_at).getTime()
    )
  }, [visibleRequests])

  const selectedRoomThread = roomRows.find((r) => r.roomId === selectedRoomId) || null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* FULL-SCREEN NEW REQUEST ALERT */}
      {fullScreenAlertReq && (
        <div className="fixed inset-0 z-[100] bg-blue-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-blue-500 rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500 text-blue-400 flex items-center justify-center mx-auto animate-bounce">
              <Bell className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-black uppercase tracking-widest">
                New Guest Request
              </span>
              <h2 className="text-3xl font-black mt-3">
                Room {fullScreenAlertReq.room_number}
              </h2>
              <p className="text-sm text-slate-300 font-bold mt-1">
                {fullScreenAlertReq.guest_name} ·{' '}
                <span className="uppercase text-blue-400">
                  {fullScreenAlertReq.service.replace('_', ' ')}
                </span>
              </p>
            </div>

            {Array.isArray(fullScreenAlertReq.items) &&
              fullScreenAlertReq.items.length > 0 && (
                <div className="bg-slate-800/90 rounded-2xl p-4 text-left text-xs space-y-1.5 max-h-40 overflow-y-auto">
                  {fullScreenAlertReq.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between font-bold">
                      <span>
                        {it.qty} × {it.name}
                      </span>
                      {it.price > 0 && <span>₹{it.price * it.qty}</span>}
                    </div>
                  ))}
                </div>
              )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFullScreenAlertReq(null)}
                className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-sm"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  const roomId = fullScreenAlertReq.room_id
                  setFullScreenAlertReq(null)
                  setActiveTab('inbox')
                  setSelectedRoomId(roomId)
                }}
                className="py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-lg"
              >
                Open Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP STAFF BAR */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow"
            style={{ backgroundColor: primaryColor }}
          >
            {hubSettings?.branding?.monogram || 'GH'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base leading-tight">{hotelName}</h1>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-black uppercase text-slate-300">
                {actor.actorName} ({actor.actorRole})
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live Staff Console · Updates automatically
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {ownerProperties.length > 1 && (
            <select
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value)
                refreshBundle(e.target.value)
              }}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
            >
              {ownerProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={enableDeskModeAndTestSound}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition ${
              soundEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            {soundEnabled
              ? wakeLockActive
                ? 'Test Sound (Desk Awake)'
                : 'Test Sound'
              : 'Tap to Enable Sound & Alerts'}
          </button>

          {!actor.isOwnerOrSuperAdmin && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* MAIN TABS */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 py-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition ${
              activeTab === 'inbox'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Requests Inbox ({visibleRequests.length})
          </button>

          {canManageRoomsAndCheckin && (
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition ${
                activeTab === 'rooms'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <DoorOpen className="w-4 h-4" />
              Rooms &amp; Check-in ({Object.keys(activeStayByRoomId).length}/{rooms.length} Occupied)
            </button>
          )}
        </div>

        {activeTab === 'inbox' && (
          <div className="flex items-center gap-1.5 py-2 overflow-x-auto">
            <button
              onClick={() => setDeptFilter('all')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize ${
                deptFilter === 'all'
                  ? 'bg-slate-200 text-slate-900'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              All Depts
            </button>
            {allowedDepartments.map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize ${
                  deptFilter === d
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {d.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 p-4 max-w-7xl w-full mx-auto">
        {/* TAB 1: REQUESTS INBOX & ROOM THREAD */}
        {activeTab === 'inbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: One row per room with its latest request and time, newest first */}
            <div className="lg:col-span-5 space-y-2.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                Active Room Threads ({roomRows.length})
              </h2>

              {roomRows.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">
                  <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-sm text-slate-300">No requests yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    New guest requests will alert on this screen automatically within seconds.
                  </p>
                </div>
              ) : (
                roomRows.map((row) => {
                  const isSelected = selectedRoomId === row.roomId
                  const latest = row.latestRequest
                  return (
                    <button
                      key={row.roomId}
                      onClick={() => setSelectedRoomId(row.roomId)}
                      className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-black text-xs">
                            Room {row.roomNumber}
                          </span>
                          <span className="font-bold text-sm truncate">
                            {row.guestName}
                          </span>
                          {row.unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                              {row.unreadCount} Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 font-semibold mt-1.5 truncate capitalize">
                          {latest.service.replace('_', ' ')} —{' '}
                          {Array.isArray(latest.items) && latest.items.length > 0
                            ? latest.items.map((i: any) => `${i.qty}× ${i.name}`).join(', ')
                            : latest.note || 'Request'}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-bold text-slate-400">
                          {new Date(latest.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            latest.status === 'received'
                              ? 'bg-blue-500/20 text-blue-400'
                              : latest.status === 'seen'
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : latest.status === 'accepted'
                              ? 'bg-amber-500/20 text-amber-400'
                              : latest.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {latest.status}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Right Column: Room Thread */}
            <div className="lg:col-span-7">
              {!selectedRoomThread ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center">
                  <Sparkles className="w-10 h-10 text-slate-600 mb-3" />
                  <p className="font-bold text-slate-300">
                    Select a room from the inbox to view its request thread
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-black">
                        Room {selectedRoomThread.roomNumber} ·{' '}
                        {selectedRoomThread.guestName}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedRoomThread.allRequests.length} request(s) in thread
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    {selectedRoomThread.allRequests.map((req: any) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                              {req.service.replace('_', ' ')} ({req.department.replace('_', ' ')})
                            </span>
                            <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mt-1">
                              <span>
                                Received:{' '}
                                <strong className="text-slate-200">
                                  {new Date(req.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </strong>
                              </span>
                              {req.accepted_at && (
                                <span>
                                  Accepted:{' '}
                                  <strong className="text-amber-400">
                                    {new Date(req.accepted_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}{' '}
                                    ({req.accepted_by})
                                  </strong>
                                </span>
                              )}
                              {req.completed_at && (
                                <span>
                                  Completed:{' '}
                                  <strong className="text-emerald-400">
                                    {new Date(req.completed_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}{' '}
                                    ({req.completed_by})
                                  </strong>
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-900 text-slate-200">
                            {req.status}
                          </span>
                        </div>

                        {/* Items */}
                        {Array.isArray(req.items) && req.items.length > 0 && (
                          <div className="bg-slate-900/70 rounded-xl p-3 space-y-1 text-xs">
                            {req.items.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between">
                                <span className="font-bold">
                                  {it.qty} × {it.name}
                                </span>
                                {it.price > 0 && <span>₹{it.price * it.qty}</span>}
                              </div>
                            ))}
                            {req.total > 0 && (
                              <div className="flex justify-between font-black pt-1.5 border-t border-slate-800">
                                <span>Total</span>
                                <span>₹{req.total}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {req.note && (
                          <p className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-xl">
                            Guest Note: “{req.note}”
                          </p>
                        )}

                        {req.status === 'declined' && req.decline_reason && (
                          <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-xl">
                            Declined ({req.declined_by}): {req.decline_reason}
                          </p>
                        )}

                        {/* Action Buttons: Accept, Mark as Completed, Decline with reason */}
                        {req.status !== 'completed' && req.status !== 'declined' && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {req.status !== 'accepted' && (
                              <button
                                onClick={async () => {
                                  await updateHubRequestStatusAction({
                                    propertyId: selectedPropertyId,
                                    requestId: req.id,
                                    status: 'accepted',
                                  })
                                  refreshBundle(selectedPropertyId)
                                }}
                                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                              </button>
                            )}

                            <button
                              onClick={async () => {
                                await updateHubRequestStatusAction({
                                  propertyId: selectedPropertyId,
                                  requestId: req.id,
                                  status: 'completed',
                                })
                                refreshBundle(selectedPropertyId)
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Completed
                            </button>

                            <button
                              onClick={() => {
                                setDecliningRequestId(req.id)
                                setDeclineReason('')
                              }}
                              className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 font-black text-xs flex items-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS & CHECK-IN */}
        {activeTab === 'rooms' && canManageRoomsAndCheckin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Rooms &amp; Check-In Board</h2>
                <p className="text-xs text-slate-400">
                  Check a guest into a room to activate its QR and generate a 4-digit stay PIN.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rooms.map((room: any) => {
                const activeStay = activeStayByRoomId[room.id]
                const isOccupied = Boolean(activeStay)

                return (
                  <div
                    key={room.id}
                    className={`p-5 rounded-3xl border flex flex-col justify-between gap-4 ${
                      isOccupied
                        ? 'bg-slate-900 border-emerald-500/40'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-black">
                          Room {room.room_number}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isOccupied
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isOccupied ? 'Occupied' : 'Vacant'}
                        </span>
                      </div>

                      {isOccupied ? (
                        <div className="space-y-2 text-xs">
                          <div className="p-3 rounded-2xl bg-slate-800/80 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">
                                Guest
                              </p>
                              <p className="font-black text-sm text-white">
                                {activeStay.guest_name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">
                                4-Digit PIN
                              </p>
                              <p className="font-mono font-black text-base text-emerald-400 tracking-widest">
                                {activeStay.pin_code}
                              </p>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-400">
                            Access ends:{' '}
                            <strong className="text-slate-200">
                              {new Date(activeStay.access_ends_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </strong>
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Room QR currently shows &ldquo;Please contact reception&rdquo;.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      {!isOccupied ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openCheckinModal(room)}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Check Guest In
                          </button>
                          <button
                            onClick={() => setQrModalRoom(room)}
                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Show Room QR"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={async () => {
                              await extendStayAction({
                                propertyId: selectedPropertyId,
                                stayId: activeStay.id,
                                additionalHours: 24,
                              })
                              refreshBundle(selectedPropertyId)
                            }}
                            className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px]"
                          >
                            +24h Extend
                          </button>
                          <button
                            onClick={() => setQrModalRoom(room)}
                            className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1"
                          >
                            <QrCode className="w-3 h-3" /> QR
                          </button>
                          <button
                            onClick={async () => {
                              if (
                                confirm(
                                  `End stay for ${activeStay.guest_name} in Room ${room.room_number}?`
                                )
                              ) {
                                await endStayAction(selectedPropertyId, activeStay.id)
                                refreshBundle(selectedPropertyId)
                              }
                            }}
                            className="py-2 px-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-[11px]"
                          >
                            End Stay
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* CHECK-IN MODAL */}
      {checkinRoom && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">
                Check In · Room {checkinRoom.room_number}
              </h3>
              <button
                onClick={() => setCheckinRoom(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCheckin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Guest Name *
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm font-bold text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Phone Number (Optional — kept private for records)
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm font-bold text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Check-in Time
                  </label>
                  <input
                    type="datetime-local"
                    value={checkinAtStr}
                    onChange={(e) => setCheckinAtStr(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-2 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Access Ends (Default +24h)
                  </label>
                  <input
                    type="datetime-local"
                    value={accessEndsAtStr}
                    onChange={(e) => setAccessEndsAtStr(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-2 text-xs font-bold text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckinRoom(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkingIn}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs"
                >
                  {checkingIn ? 'Checking In...' : 'Check In & Generate PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATED STAY PIN MODAL */}
      {createdStayPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-500/50 rounded-3xl p-7 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Room {createdStayPinModal.roomNumber} Checked In
              </p>
              <h3 className="text-xl font-black mt-1">
                {createdStayPinModal.guestName}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Share this 4-digit PIN with the guest for their first room QR scan:
              </p>
            </div>

            <div className="py-4 px-6 rounded-2xl bg-slate-800 border border-slate-700 text-4xl font-mono font-black tracking-[0.4em] text-emerald-400">
              {createdStayPinModal.pinCode}
            </div>

            <button
              onClick={() => setCreatedStayPinModal(null)}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ROOM QR PREVIEW MODAL */}
      {qrModalRoom && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-7 text-center space-y-4 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">
              {hotelName}
            </p>
            <h3 className="text-2xl font-black">Room {qrModalRoom.room_number}</h3>

            <div className="p-4 bg-slate-50 rounded-2xl inline-block border border-slate-200">
              <QRCodeCanvas
                value={`${origin}/g/${qrModalRoom.qr_token}`}
                size={200}
                level="H"
              />
            </div>

            <p className="text-xs text-slate-500 font-medium break-all">
              {origin}/g/{qrModalRoom.qr_token}
            </p>

            <div className="flex gap-2">
              <a
                href={`/g/${qrModalRoom.qr_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs"
              >
                Open Guest Page
              </a>
              <button
                onClick={() => setQrModalRoom(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-200 text-slate-800 font-black text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DECLINE REQUEST MODAL */}
      {decliningRequestId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-black">Decline Request with Reason</h3>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Let the guest know why this request cannot be fulfilled..."
              className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-xs font-bold text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setDecliningRequestId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!declineReason.trim()}
                onClick={async () => {
                  await updateHubRequestStatusAction({
                    propertyId: selectedPropertyId,
                    requestId: decliningRequestId,
                    status: 'declined',
                    declineReason,
                  })
                  setDecliningRequestId(null)
                  refreshBundle(selectedPropertyId)
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
