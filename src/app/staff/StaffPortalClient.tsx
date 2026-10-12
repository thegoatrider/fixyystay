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
  CalendarDays,
  User,
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
import GuestHubHistoryExplorer, {
  getCustomerKey,
} from '@/components/guest-hub/GuestHubHistoryExplorer'

let sharedStaffAudioCtx: AudioContext | null = null

function getStaffAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedStaffAudioCtx) {
    sharedStaffAudioCtx = new AudioCtx()
  }
  if (sharedStaffAudioCtx.state === 'suspended') {
    sharedStaffAudioCtx.resume().catch(() => {})
  }
  return sharedStaffAudioCtx
}

// High-output urgent multi-oscillator desk alarm & siren (maximum clarity & loudness)
function playDeskAlertChime() {
  try {
    const ctx = getStaffAudioContext()
    if (!ctx) return

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-24, ctx.currentTime)
    compressor.knee.setValueAtTime(10, ctx.currentTime)
    compressor.ratio.setValueAtTime(12, ctx.currentTime)
    compressor.attack.setValueAtTime(0.002, ctx.currentTime)
    compressor.release.setValueAtTime(0.15, ctx.currentTime)
    compressor.connect(ctx.destination)

    // 6-pulse urgent alternating high-low siren + buzzer burst (B5 <-> E6 + harmonic octave)
    const sirenPulses = [
      { freq: 987.77, start: 0.0, dur: 0.16 },
      { freq: 1318.51, start: 0.18, dur: 0.16 },
      { freq: 987.77, start: 0.36, dur: 0.16 },
      { freq: 1318.51, start: 0.54, dur: 0.16 },
      { freq: 1174.66, start: 0.74, dur: 0.22 },
      { freq: 1567.98, start: 0.98, dur: 0.38 },
    ]

    sirenPulses.forEach(({ freq, start, dur }) => {
      const t0 = ctx.currentTime + start
      const tEnd = t0 + dur

      // Primary aggressive sawtooth wave for cut-through loudness
      const oscSaw = ctx.createOscillator()
      const gainSaw = ctx.createGain()
      oscSaw.type = 'sawtooth'
      oscSaw.frequency.setValueAtTime(freq, t0)
      gainSaw.gain.setValueAtTime(0.01, t0)
      gainSaw.gain.exponentialRampToValueAtTime(0.85, t0 + 0.015)
      gainSaw.gain.setValueAtTime(0.85, tEnd - 0.025)
      gainSaw.gain.exponentialRampToValueAtTime(0.001, tEnd)
      oscSaw.connect(gainSaw)
      gainSaw.connect(compressor)
      oscSaw.start(t0)
      oscSaw.stop(tEnd + 0.01)

      // Secondary square wave 1 octave lower for body & buzz
      const oscSq = ctx.createOscillator()
      const gainSq = ctx.createGain()
      oscSq.type = 'square'
      oscSq.frequency.setValueAtTime(freq * 0.5, t0)
      gainSq.gain.setValueAtTime(0.01, t0)
      gainSq.gain.exponentialRampToValueAtTime(0.65, t0 + 0.015)
      gainSq.gain.setValueAtTime(0.65, tEnd - 0.025)
      gainSq.gain.exponentialRampToValueAtTime(0.001, tEnd)
      oscSq.connect(gainSq)
      gainSq.connect(compressor)
      oscSq.start(t0)
      oscSq.stop(tEnd + 0.01)
    })
  } catch (e) {
    console.warn('Audio playback blocked until user interaction:', e)
  }
}

const QUICK_DECLINE_REASONS = [
  'Item currently out of stock',
  'Kitchen / Service is closed right now',
  'Unavailable at this moment',
  'Please contact Front Desk Reception',
]

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
  const [activeTab, setActiveTab] = useState<'inbox' | 'rooms' | 'history'>('inbox')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [focusCustomerQuery, setFocusCustomerQuery] = useState<string | null>(null)

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
  const [updatingReqId, setUpdatingReqId] = useState<string | null>(null)

  // Full-screen Strobe Alert & Desk Wake-Lock state
  const [fullScreenAlertReq, setFullScreenAlertReq] = useState<any | null>(null)
  const [testStrobeActive, setTestStrobeActive] = useState(false)
  const [strobePhase, setStrobePhase] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const seenRequestIdsRef = useRef<Set<string>>(
    new Set((initialBundle?.requests || []).map((r: any) => r.id))
  )
  const autoSeenMarkedRef = useRef<Set<string>>(new Set())

  const origin =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      : 'https://www.fixystays.com'

  // Unlock Web Audio automatically on first tap/click anywhere on the staff screen
  useEffect(() => {
    const unlock = () => {
      const ctx = getStaffAudioContext()
      if (ctx && ctx.state === 'running') {
        setSoundEnabled(true)
      }
    }
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Rapid strobe flasher + continuous alarm loop while a new request alert is active
  useEffect(() => {
    if (!fullScreenAlertReq && !testStrobeActive) {
      setStrobePhase(0)
      return
    }

    const strobeInterval = setInterval(() => {
      setStrobePhase((prev) => (prev + 1) % 4)
    }, 150)

    const alarmLoop = fullScreenAlertReq
      ? setInterval(() => {
          playDeskAlertChime()
        }, 2100)
      : null

    return () => {
      clearInterval(strobeInterval)
      if (alarmLoop) clearInterval(alarmLoop)
    }
  }, [fullScreenAlertReq, testStrobeActive])

  const refreshBundle = useCallback(
    async (propId?: string) => {
      const targetId = propId || selectedPropertyId || bundle?.property?.id
      if (!targetId) return
      const res = await getPropertyGuestHubBundle(targetId)
      if (!res.error && res.property) {
        setBundle(res)
        res.requests?.forEach((r: any) => seenRequestIdsRef.current.add(r.id))
      }
    },
    [selectedPropertyId, bundle?.property?.id]
  )

  // Central optimistic status update helper (handles Accept, Completed, Declined)
  const handleRequestStatusChange = useCallback(
    async (
      requestId: string,
      status: 'seen' | 'accepted' | 'completed' | 'declined',
      reason?: string
    ) => {
      const propId = selectedPropertyId || bundle?.property?.id || ''
      const nowIso = new Date().toISOString()
      const actorName = bundle?.actor?.actorName || 'Staff'

      setUpdatingReqId(requestId)

      // Optimistically update local bundle state immediately so UI responds in 0ms
      setBundle((prev: any) => {
        if (!prev?.requests) return prev
        return {
          ...prev,
          requests: prev.requests.map((r: any) => {
            if (r.id !== requestId) return r
            return {
              ...r,
              status,
              updated_at: nowIso,
              ...(status === 'accepted'
                ? { accepted_at: nowIso, accepted_by: actorName }
                : {}),
              ...(status === 'completed'
                ? { completed_at: nowIso, completed_by: actorName }
                : {}),
              ...(status === 'declined'
                ? {
                    declined_at: nowIso,
                    declined_by: actorName,
                    decline_reason: reason?.trim() || 'Unavailable at this moment',
                  }
                : {}),
            }
          }),
        }
      })

      try {
        const res = await updateHubRequestStatusAction({
          propertyId: propId,
          requestId,
          status,
          declineReason: reason,
        })
        if (res?.error) {
          alert(res.error)
        }
        await refreshBundle(propId)
      } finally {
        setUpdatingReqId(null)
      }
    },
    [selectedPropertyId, bundle?.property?.id, bundle?.actor?.actorName, refreshBundle]
  )

  // Request browser notification permission, Wake Lock & test alarm + strobe
  const enableDeskModeAndTestSound = async () => {
    playDeskAlertChime()
    setSoundEnabled(true)
    setTestStrobeActive(true)
    setTimeout(() => setTestStrobeActive(false), 2000)

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
                new Notification(`🚨 Room ${req.room_number} · New Order / Request`, {
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

    const pollInterval = setInterval(handleIncomingRequests, 4500)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [authorized, selectedPropertyId, refreshBundle])

  // Auto-mark requests as 'seen' sequentially when staff opens a room thread
  useEffect(() => {
    if (!selectedRoomId || !bundle?.requests || !selectedPropertyId) return
    const unseen = bundle.requests.filter(
      (r: any) =>
        r.room_id === selectedRoomId &&
        r.status === 'received' &&
        !autoSeenMarkedRef.current.has(r.id)
    )
    if (unseen.length === 0) return

    unseen.forEach((r: any) => autoSeenMarkedRef.current.add(r.id))
    ;(async () => {
      for (const req of unseen) {
        await updateHubRequestStatusAction({
          propertyId: selectedPropertyId,
          requestId: req.id,
          status: 'seen',
        })
      }
      await refreshBundle(selectedPropertyId)
    })()
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

  const strobeBgClass =
    strobePhase === 0
      ? 'bg-red-600/95'
      : strobePhase === 1
      ? 'bg-white/95'
      : strobePhase === 2
      ? 'bg-blue-600/95'
      : 'bg-amber-500/95'

  const strobeBorderClass =
    strobePhase === 0
      ? 'border-white shadow-[0_0_80px_rgba(239,68,68,1)]'
      : strobePhase === 1
      ? 'border-red-600 shadow-[0_0_80px_rgba(255,255,255,1)]'
      : strobePhase === 2
      ? 'border-amber-400 shadow-[0_0_80px_rgba(37,99,235,1)]'
      : 'border-red-500 shadow-[0_0_80px_rgba(245,158,11,1)]'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* TEST STROBE FLASH OVERLAY */}
      {testStrobeActive && !fullScreenAlertReq && (
        <div
          className={`fixed inset-0 z-[95] pointer-events-none transition-colors duration-75 ${strobeBgClass} opacity-60`}
        />
      )}

      {/* FULL-SCREEN FLASHING STROBE NEW REQUEST ALERT */}
      {fullScreenAlertReq && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-colors duration-75 ${strobeBgClass}`}
        >
          {/* Flashing Corner Strobe Beacons */}
          <div className="fixed top-0 left-0 right-0 h-4 bg-gradient-to-r from-red-500 via-white to-blue-500 animate-pulse" />
          <div className="fixed bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-amber-400 via-red-600 to-white animate-pulse" />

          <div
            className={`w-full max-w-lg bg-slate-950 border-4 rounded-3xl p-6 sm:p-8 text-center space-y-5 transition-all duration-75 ${strobeBorderClass}`}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border-4 transition-colors duration-75 ${
                strobePhase % 2 === 0
                  ? 'bg-red-600 border-white text-white scale-110'
                  : 'bg-amber-400 border-red-600 text-slate-950 scale-100'
              }`}
            >
              <Bell className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <span
                className={`inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                  strobePhase % 2 === 0
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                🚨 URGENT · NEW GUEST ORDER / REQUEST 🚨
              </span>
              <h2 className="text-4xl sm:text-5xl font-black mt-3 text-white tracking-tight">
                Room {fullScreenAlertReq.room_number}
              </h2>
              <p className="text-base text-slate-200 font-extrabold mt-1">
                {fullScreenAlertReq.guest_name} ·{' '}
                <span className="uppercase text-amber-400">
                  {fullScreenAlertReq.service.replace('_', ' ')}
                </span>
              </p>
            </div>

            {Array.isArray(fullScreenAlertReq.items) &&
              fullScreenAlertReq.items.length > 0 && (
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-left text-sm space-y-1.5 max-h-44 overflow-y-auto">
                  {fullScreenAlertReq.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between font-black text-white">
                      <span>
                        {it.qty} × {it.name}
                      </span>
                      {it.price > 0 && (
                        <span className="text-emerald-400">₹{it.price * it.qty}</span>
                      )}
                    </div>
                  ))}
                  {fullScreenAlertReq.total > 0 && (
                    <div className="flex justify-between font-black pt-2 border-t border-slate-800 text-amber-400">
                      <span>Order Total</span>
                      <span>₹{fullScreenAlertReq.total}</span>
                    </div>
                  )}
                </div>
              )}

            {fullScreenAlertReq.note && (
              <p className="text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 p-3 rounded-xl">
                Guest Note: “{fullScreenAlertReq.note}”
              </p>
            )}

            {/* Direct Action Buttons right inside the Strobe Alert */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={async () => {
                  const req = fullScreenAlertReq
                  setFullScreenAlertReq(null)
                  setActiveTab('inbox')
                  setSelectedRoomId(req.room_id)
                  await handleRequestStatusChange(req.id, 'accepted')
                }}
                className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" /> Accept Order Now
              </button>

              <button
                onClick={() => {
                  const req = fullScreenAlertReq
                  setFullScreenAlertReq(null)
                  setActiveTab('inbox')
                  setSelectedRoomId(req.room_id)
                  setDecliningRequestId(req.id)
                  setDeclineReason('')
                }}
                className="py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <XCircle className="w-4 h-4" /> Decline Order
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFullScreenAlertReq(null)}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs"
              >
                Stop Alarm &amp; Dismiss
              </button>
              <button
                onClick={() => {
                  const roomId = fullScreenAlertReq.room_id
                  setFullScreenAlertReq(null)
                  setActiveTab('inbox')
                  setSelectedRoomId(roomId)
                }}
                className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg"
              >
                Open Room Thread
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
              Live Staff Console · Loud Siren &amp; Strobe Alerts Active
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
                : 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            {soundEnabled
              ? wakeLockActive
                ? 'Test Loud Alarm & Strobe (Awake)'
                : 'Test Loud Alarm & Strobe'
              : 'Tap to Enable Loud Alarm & Strobe'}
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

          <button
            onClick={() => {
              setFocusCustomerQuery(null)
              setActiveTab('history')
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            History &amp; Customer Summary ({stays.length} Stays)
          </button>
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
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 gap-3 flex-wrap">
                    <div>
                      <h3 className="text-lg font-black">
                        Room {selectedRoomThread.roomNumber} ·{' '}
                        {selectedRoomThread.guestName}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedRoomThread.allRequests.length} request(s) in thread
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const stayObj =
                          activeStayByRoomId[selectedRoomThread.roomId] ||
                          stays.find((s: any) => s.room_id === selectedRoomThread.roomId) || {
                            guest_name: selectedRoomThread.guestName,
                          }
                        setFocusCustomerQuery(getCustomerKey(stayObj))
                        setActiveTab('history')
                      }}
                      className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-black flex items-center gap-1.5 transition"
                    >
                      <User className="w-3.5 h-3.5" /> Customer Full Summary
                    </button>
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
                                disabled={updatingReqId === req.id}
                                onClick={() => handleRequestStatusChange(req.id, 'accepted')}
                                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                              </button>
                            )}

                            <button
                              disabled={updatingReqId === req.id}
                              onClick={() => handleRequestStatusChange(req.id, 'completed')}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Completed
                            </button>

                            <button
                              disabled={updatingReqId === req.id}
                              onClick={() => {
                                setDecliningRequestId(req.id)
                                setDeclineReason('')
                              }}
                              className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-black text-xs flex items-center gap-1.5 disabled:opacity-50"
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
                        <div className="space-y-1.5">
                          <button
                            onClick={() => {
                              setFocusCustomerQuery(getCustomerKey(activeStay))
                              setActiveTab('history')
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-black text-[11px] flex items-center justify-center gap-1.5"
                          >
                            <User className="w-3.5 h-3.5" /> Customer Summary &amp; Stay Orders
                          </button>
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
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HISTORY & CUSTOMER SUMMARY */}
        {activeTab === 'history' && (
          <GuestHubHistoryExplorer
            rooms={rooms}
            stays={stays}
            requests={requests}
            hotelName={hotelName}
            primaryColor={primaryColor}
            theme="dark"
            initialCustomerKey={focusCustomerQuery}
          />
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
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                Decline Order / Request
              </h3>
              <button
                onClick={() => setDecliningRequestId(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400">
                Tap a quick reason or type a custom note for the guest:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_DECLINE_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeclineReason(preset)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                      declineReason === preset
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Optional custom reason (defaults to 'Unavailable at this moment')..."
              className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-xs font-bold text-white outline-none focus:border-red-500"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDecliningRequestId(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingReqId === decliningRequestId}
                onClick={async () => {
                  const targetReqId = decliningRequestId
                  const finalReason =
                    declineReason.trim() || 'Unavailable at this moment'
                  setDecliningRequestId(null)
                  setDeclineReason('')
                  await handleRequestStatusChange(targetReqId, 'declined', finalReason)
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {updatingReqId === decliningRequestId
                  ? 'Declining...'
                  : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
