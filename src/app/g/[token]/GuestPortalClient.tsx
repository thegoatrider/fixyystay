'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Wifi,
  Sparkles,
  MapPin,
  Phone,
  ShieldAlert,
  FileText,
  UtensilsCrossed,
  BedDouble,
  Wine,
  Flower2,
  Shirt,
  Car,
  PartyPopper,
  Copy,
  Check,
  ChevronLeft,
  Clock,
  Lock,
  Plus,
  Minus,
  Send,
  Sun,
  Moon,
  Navigation,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  Bell,
} from 'lucide-react'
import {
  deptNumber,
  isRestaurantOpen,
  type ServiceId,
} from '@/lib/guest-hub/starter'
import {
  verifyGuestStayPinAction,
  submitGuestHubRequestAction,
  getGuestPortalDataByToken,
} from '@/app/actions/guest-hub'

type ScreenId =
  | 'home'
  | 'wifi'
  | 'services'
  | 'service_form'
  | 'menu'
  | 'requests'
  | 'guide'
  | 'contacts'
  | 'policies'
  | 'emergency'

const SERVICE_META: Record<
  ServiceId,
  { icon: React.ComponentType<any>; defaultLabel: string; badge: string }
> = {
  restaurant: {
    icon: UtensilsCrossed,
    defaultLabel: 'Restaurant & Dining',
    badge: 'Menu & Order',
  },
  housekeeping: {
    icon: BedDouble,
    defaultLabel: 'Housekeeping',
    badge: 'Towels & Room Care',
  },
  minibar: {
    icon: Wine,
    defaultLabel: 'Mini Bar',
    badge: 'Drinks & Snacks',
  },
  spa: {
    icon: Flower2,
    defaultLabel: 'Spa & Wellness',
    badge: 'Book Treatment',
  },
  laundry: {
    icon: Shirt,
    defaultLabel: 'Laundry & Ironing',
    badge: 'Wash & Press',
  },
  taxi: {
    icon: Car,
    defaultLabel: 'Taxi & Transfers',
    badge: 'Cab Booking',
  },
  special_occasions: {
    icon: PartyPopper,
    defaultLabel: 'Special Occasions',
    badge: 'Celebrations',
  },
}

const GUIDE_CATEGORIES = [
  'Food & Cafes',
  'Sights & Beaches',
  'Shopping & Markets',
  'ATMs & Pharmacy',
] as const

export default function GuestPortalClient({
  qrToken,
  initialData,
}: {
  qrToken: string
  initialData: any
}) {
  const router = useRouter()
  const [portalData, setPortalData] = useState<any>(initialData)
  const [darkMode, setDarkMode] = useState(false)
  const [screen, setScreen] = useState<ScreenId>('home')
  const [activeService, setActiveService] = useState<ServiceId | null>(null)

  // PIN entry state
  const [pinDigits, setPinDigits] = useState('')
  const [pinError, setPinError] = useState('')
  const [verifyingPin, setVerifyingPin] = useState(false)

  // Copy Wi-Fi state
  const [copiedWifi, setCopiedWifi] = useState(false)

  // Form states for Guest Services & Menu
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [vegOnly, setVegOnly] = useState(false)

  // Spa form state
  const [spaDate, setSpaDate] = useState(new Date().toISOString().split('T')[0])
  const [spaPeopleCount, setSpaPeopleCount] = useState(1)
  const [spaSelections, setSpaSelections] = useState<
    { treatmentId: string; time: string }[]
  >([{ treatmentId: '', time: '16:00' }])

  // Taxi form state
  const [taxiDestination, setTaxiDestination] = useState('')
  const [taxiDate, setTaxiDate] = useState(new Date().toISOString().split('T')[0])
  const [taxiTime, setTaxiTime] = useState('10:00')
  const [taxiPeople, setTaxiPeople] = useState(2)

  // Special occasions state
  const [occasionType, setOccasionType] = useState('')
  const [occasionDate, setOccasionDate] = useState(new Date().toISOString().split('T')[0])
  const [occasionDetails, setOccasionDetails] = useState('')

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'food' | 'services'>('all')

  // Sync theme preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gh_theme')
      if (saved === 'dark') setDarkMode(true)
    }
  }, [])

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('gh_theme', next ? 'dark' : 'light')
    }
  }

  // Live Realtime updates for requests & stay status
  useEffect(() => {
    if (portalData?.state !== 'active' || !portalData?.stay?.id) return

    const supabase = createClient()
    const stayId = portalData.stay.id

    const refreshPortal = async () => {
      const fresh = await getGuestPortalDataByToken(qrToken)
      if (fresh) setPortalData(fresh)
    }

    const channel = supabase
      .channel(`guest_stay_${stayId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hub_requests',
          filter: `stay_id=eq.${stayId}`,
        },
        () => {
          refreshPortal()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hub_stays',
          filter: `id=eq.${stayId}`,
        },
        () => {
          refreshPortal()
        }
      )
      .subscribe()

    // Lightweight 8s fallback poll to guarantee mobile reliability even on flaky carrier WebSockets
    const interval = setInterval(refreshPortal, 8000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [portalData?.state, portalData?.stay?.id, qrToken])

  // Check if access time expired client-side
  useEffect(() => {
    if (portalData?.state !== 'active' || !portalData?.stay?.accessEndsAt) return
    const msRemaining =
      new Date(portalData.stay.accessEndsAt).getTime() - Date.now()
    if (msRemaining <= 0) {
      getGuestPortalDataByToken(qrToken).then(setPortalData)
      return
    }
    const timer = setTimeout(() => {
      getGuestPortalDataByToken(qrToken).then(setPortalData)
    }, Math.min(msRemaining + 1000, 60000))
    return () => clearTimeout(timer)
  }, [portalData?.state, portalData?.stay?.accessEndsAt, qrToken])

  const primaryColor = portalData?.primaryColor || '#2563eb'
  const hotelName = portalData?.hotelName || 'Hotel'
  const monogram = portalData?.monogram || 'GH'
  const logoUrl = portalData?.logoUrl || ''

  const resetFormState = () => {
    setItemQuantities({})
    setNote('')
    setSubmitError('')
    setTaxiDestination('')
    setOccasionType('')
    setOccasionDetails('')
  }

  const updateQty = (itemId: string, delta: number, maxQty = 20) => {
    setItemQuantities((prev) => {
      const current = prev[itemId] || 0
      const next = Math.max(0, Math.min(maxQty, current + delta))
      const copy = { ...prev }
      if (next === 0) delete copy[itemId]
      else copy[itemId] = next
      return copy
    })
  }

  // Adjust spa people array when count changes
  const handleSpaPeopleChange = (newCount: number) => {
    const count = Math.max(1, Math.min(6, newCount))
    setSpaPeopleCount(count)
    setSpaSelections((prev) => {
      const next = [...prev]
      while (next.length < count) {
        next.push({ treatmentId: '', time: '16:00' })
      }
      return next.slice(0, count)
    })
  }

  // Handle PIN verification
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError('')
    setVerifyingPin(true)
    try {
      const res = await verifyGuestStayPinAction(qrToken, pinDigits)
      if (res.error) {
        setPinError(res.error)
      } else {
        const fresh = await getGuestPortalDataByToken(qrToken)
        setPortalData(fresh)
        router.refresh()
      }
    } catch {
      setPinError('Could not verify PIN. Please try again.')
    } finally {
      setVerifyingPin(false)
    }
  }

  // Compute selected items, total, and validation hint for current service form
  const formSummary = useMemo(() => {
    if (portalData?.state !== 'active') {
      return { valid: false, hint: '', items: [], details: {}, total: 0 }
    }
    const hotel = portalData.hotel

    if (screen === 'menu') {
      const open = isRestaurantOpen(
        hotel.houseInfo?.restaurantOpen,
        hotel.houseInfo?.restaurantClose,
        hotel.timezone,
        hotel.houseInfo?.restaurantAlwaysOpen
      )
      if (!open) {
        return {
          valid: false,
          hint: `Restaurant is currently closed (Open ${hotel.houseInfo?.restaurantOpen} – ${hotel.houseInfo?.restaurantClose})`,
          items: [],
          details: {},
          total: 0,
        }
      }
      const chosen: { name: string; qty: number; price: number; category?: string }[] = []
      for (const cat of hotel.menu || []) {
        for (const item of cat.items || []) {
          if (!item.name || !item.available) continue
          const q = itemQuantities[item.id] || 0
          if (q > 0) {
            chosen.push({
              name: item.name,
              qty: q,
              price: Number(item.price || 0),
              category: cat.name,
            })
          }
        }
      }
      const total = chosen.reduce((s, i) => s + i.price * i.qty, 0)
      return {
        valid: chosen.length > 0,
        hint: chosen.length === 0 ? 'Add at least one dish to place your order' : '',
        items: chosen,
        details: {},
        total,
      }
    }

    if (screen === 'service_form' && activeService) {
      if (activeService === 'housekeeping') {
        const chosen: { name: string; qty: number; price: number; category?: string }[] = []
        for (const grp of hotel.requestItems?.housekeeping || []) {
          for (const item of grp.items || []) {
            if (!item.name) continue
            const q = itemQuantities[item.id] || 0
            if (q > 0) {
              chosen.push({ name: item.name, qty: q, price: 0, category: grp.name })
            }
          }
        }
        const hasNote = note.trim().length > 0
        return {
          valid: chosen.length > 0 || hasNote,
          hint:
            chosen.length === 0 && !hasNote
              ? 'Choose at least one item or type a note below'
              : '',
          items: chosen,
          details: {},
          total: 0,
        }
      }

      if (activeService === 'minibar' || activeService === 'laundry') {
        const list =
          activeService === 'minibar'
            ? hotel.requestItems?.minibar || []
            : hotel.requestItems?.laundry || []
        const chosen: { name: string; qty: number; price: number }[] = []
        for (const item of list) {
          if (!item.name) continue
          const q = itemQuantities[item.id] || 0
          if (q > 0) {
            chosen.push({
              name: item.name,
              qty: q,
              price: Number(item.price || 0),
            })
          }
        }
        const total = chosen.reduce((s, i) => s + i.price * i.qty, 0)
        return {
          valid: chosen.length > 0,
          hint: chosen.length === 0 ? 'Select at least one item with +' : '',
          items: chosen,
          details: {},
          total,
        }
      }

      if (activeService === 'spa') {
        const treatments = hotel.requestItems?.spa || []
        const missingIdx = spaSelections.findIndex((s) => !s.treatmentId || !s.time)
        if (!spaDate) {
          return { valid: false, hint: 'Please choose a date', items: [], details: {}, total: 0 }
        }
        if (missingIdx !== -1) {
          return {
            valid: false,
            hint: `Select a treatment and time for Guest ${missingIdx + 1}`,
            items: [],
            details: {},
            total: 0,
          }
        }
        const chosen = spaSelections.map((sel, idx) => {
          const tr = treatments.find((t: any) => t.id === sel.treatmentId)
          return {
            name: `${tr?.name || 'Treatment'} (Guest ${idx + 1} @ ${sel.time})`,
            qty: 1,
            price: Number(tr?.price || 0),
          }
        })
        const total = chosen.reduce((s, i) => s + i.price, 0)
        return {
          valid: true,
          hint: '',
          items: chosen,
          details: { date: spaDate, people: spaPeopleCount, selections: spaSelections },
          total,
        }
      }

      if (activeService === 'taxi') {
        if (!taxiDestination.trim()) {
          return {
            valid: false,
            hint: 'Enter your destination to book a taxi',
            items: [],
            details: {},
            total: 0,
          }
        }
        if (!taxiDate || !taxiTime) {
          return {
            valid: false,
            hint: 'Select pickup date and time',
            items: [],
            details: {},
            total: 0,
          }
        }
        return {
          valid: true,
          hint: '',
          items: [
            {
              name: `Taxi to ${taxiDestination.trim()} (${taxiPeople} pax on ${taxiDate} at ${taxiTime})`,
              qty: 1,
              price: 0,
            },
          ],
          details: {
            destination: taxiDestination.trim(),
            date: taxiDate,
            time: taxiTime,
            people: taxiPeople,
          },
          total: 0,
        }
      }

      if (activeService === 'special_occasions') {
        if (!occasionType.trim()) {
          return {
            valid: false,
            hint: 'Enter the occasion (e.g. Birthday, Anniversary)',
            items: [],
            details: {},
            total: 0,
          }
        }
        if (!occasionDetails.trim()) {
          return {
            valid: false,
            hint: 'Add details of what you would like arranged',
            items: [],
            details: {},
            total: 0,
          }
        }
        return {
          valid: true,
          hint: '',
          items: [
            {
              name: `${occasionType.trim()} (${occasionDate}) — ${occasionDetails.trim()}`,
              qty: 1,
              price: 0,
            },
          ],
          details: {
            occasion: occasionType.trim(),
            date: occasionDate,
            details: occasionDetails.trim(),
          },
          total: 0,
        }
      }
    }

    return { valid: false, hint: '', items: [], details: {}, total: 0 }
  }, [
    portalData,
    screen,
    activeService,
    itemQuantities,
    note,
    spaDate,
    spaPeopleCount,
    spaSelections,
    taxiDestination,
    taxiDate,
    taxiTime,
    taxiPeople,
    occasionType,
    occasionDate,
    occasionDetails,
  ])

  const handleSendRequest = async () => {
    const serviceToSend: ServiceId | null =
      screen === 'menu' ? 'restaurant' : activeService
    if (!serviceToSend || !formSummary.valid) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await submitGuestHubRequestAction({
        qrToken,
        service: serviceToSend,
        items: formSummary.items,
        details: formSummary.details,
        note,
      })

      if (res.error) {
        setSubmitError(res.error)
      } else {
        resetFormState()
        const fresh = await getGuestPortalDataByToken(qrToken)
        setPortalData(fresh)
        setScreen('requests')
        setToastMsg('Your request has been sent to hotel staff!')
        setTimeout(() => setToastMsg(null), 4000)
      }
    } catch {
      setSubmitError('Network error while sending request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Theme classes
  const bgPage = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
  const bgCard = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200/80 text-slate-900'
  const bgMuted = darkMode ? 'bg-slate-800/70 text-slate-300' : 'bg-slate-50 text-slate-600'
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500'

  // ==========================================================================
  // NON-ACTIVE STATES: INVALID, PAUSED, NOT_ACTIVE, PIN_REQUIRED
  // ==========================================================================

  if (portalData?.state === 'invalid') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bgPage}`}>
        <div className={`w-full max-w-[390px] rounded-3xl border p-8 text-center shadow-lg ${bgCard}`}>
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black mb-2">Invalid Room QR</h1>
          <p className={`text-sm ${textSub}`}>Please contact hotel reception for assistance.</p>
        </div>
      </div>
    )
  }

  if (portalData?.state === 'paused') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bgPage}`}>
        <div className={`w-full max-w-[390px] rounded-3xl border p-8 text-center shadow-lg ${bgCard}`}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white font-black text-xl shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            {monogram}
          </div>
          <h1 className="text-xl font-black mb-2">{hotelName}</h1>
          <p className={`text-sm font-medium ${textSub}`}>
            This page is paused. Please contact reception.
          </p>
        </div>
      </div>
    )
  }

  if (portalData?.state === 'not_active') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bgPage}`}>
        <div className={`w-full max-w-[390px] rounded-3xl border p-8 text-center shadow-lg ${bgCard}`}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white font-black text-xl shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            {monogram}
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1">{hotelName}</h1>
          {portalData.roomNumber && (
            <p className={`text-xs font-bold uppercase tracking-widest mb-6 ${textSub}`}>
              Room {portalData.roomNumber}
            </p>
          )}
          <div className={`p-5 rounded-2xl border ${bgMuted} border-slate-200/50`}>
            <p className="text-base font-bold">Please contact reception</p>
            <p className={`text-xs mt-1 ${textSub}`}>
              This room does not have an active check-in session right now.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (portalData?.state === 'pin_required') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bgPage}`}>
        <div className={`w-full max-w-[390px] rounded-3xl border p-7 shadow-xl ${bgCard}`}>
          <div className="flex flex-col items-center text-center mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-white font-black text-lg shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              {monogram}
            </div>
            <h1 className="text-xl font-black">{hotelName}</h1>
            <span
              className="mt-1 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Room {portalData.roomNumber}
            </span>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div className="text-center">
              <label className="block text-sm font-bold mb-1">
                Enter your 4-digit Room PIN
              </label>
              <p className={`text-xs ${textSub}`}>
                Asked once on this phone for your stay. Given at reception during check-in.
              </p>
            </div>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={pinDigits}
              onChange={(e) => setPinDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="• • • •"
              className={`w-full text-center text-3xl font-black tracking-[0.6em] py-4 rounded-2xl border-2 outline-none transition ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
              autoFocus
            />

            {pinError && (
              <p className="text-xs font-bold text-red-500 text-center bg-red-500/10 p-2.5 rounded-xl">
                {pinError}
              </p>
            )}

            <button
              type="submit"
              disabled={pinDigits.length !== 4 || verifyingPin}
              style={{
                backgroundColor:
                  pinDigits.length === 4 ? primaryColor : '#94a3b8',
              }}
              className="w-full py-3.5 rounded-2xl text-white font-black text-sm tracking-wide shadow-md transition active:scale-95 disabled:opacity-50"
            >
              {verifyingPin ? 'Verifying...' : 'Open Guest Hub'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // ACTIVE STAY PORTAL
  // ==========================================================================

  const { stay, hotel, requests = [], roomNumber } = portalData
  const enabledServices = (Object.keys(SERVICE_META) as ServiceId[]).filter(
    (k) => hotel.services?.[k]?.enabled
  )
  const restaurantOpen = isRestaurantOpen(
    hotel.houseInfo?.restaurantOpen,
    hotel.houseInfo?.restaurantClose,
    hotel.timezone,
    hotel.houseInfo?.restaurantAlwaysOpen
  )

  const staySpendTotal = requests
    .filter((r: any) => r.status !== 'declined')
    .reduce((sum: number, r: any) => sum + Number(r.total || 0), 0)

  const activeRequestsCount = requests.filter(
    (r: any) => r.status !== 'completed' && r.status !== 'declined'
  ).length

  return (
    <div className={`min-h-screen flex justify-center ${bgPage}`}>
      <div className="w-full max-w-[400px] min-h-screen flex flex-col pb-24">
        {/* Top Sticky Header */}
        <header
          className={`sticky top-0 z-30 px-4 py-3.5 border-b backdrop-blur-md flex items-center justify-between ${
            darkMode
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white/90 border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {screen !== 'home' ? (
              <button
                onClick={() => {
                  if (screen === 'service_form' || screen === 'menu') {
                    setScreen('services')
                  } else {
                    setScreen('home')
                  }
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={hotelName}
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {monogram}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="font-black text-sm leading-tight truncate">{hotelName}</h1>
              <p className={`text-xs font-semibold truncate ${textSub}`}>
                Room {roomNumber} · {stay.guestName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setScreen('requests')}
              className={`relative px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                screen === 'requests'
                  ? 'text-white border-transparent'
                  : darkMode
                  ? 'border-slate-700 bg-slate-800'
                  : 'border-slate-200 bg-slate-50'
              }`}
              style={screen === 'requests' ? { backgroundColor: primaryColor } : {}}
            >
              <Bell
                className="w-3.5 h-3.5"
                style={{ color: screen === 'requests' ? '#ffffff' : primaryColor }}
              />
              <span>My History</span>
              {requests.length > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-black text-white"
                  style={{
                    backgroundColor: screen === 'requests' ? 'rgba(0,0,0,0.25)' : primaryColor,
                  }}
                >
                  {requests.length}
                </span>
              )}
            </button>

            <button
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Toast Banner */}
        {toastMsg && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Main Content Body */}
        <main className="flex-1 p-4 space-y-4">
          {/* SCREEN: WELCOME & HOME */}
          {screen === 'home' && (
            <>
              {/* Welcome Banner */}
              <div
                className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="relative z-10">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest mb-2">
                    Room {roomNumber} · Active Stay
                  </span>
                  <h2 className="text-xl font-black leading-snug mb-1.5">
                    Welcome, {stay.guestName}!
                  </h2>
                  <p className="text-xs text-white/90 leading-relaxed">
                    {hotel.branding?.welcomeMessage}
                  </p>
                </div>
              </div>

              {/* Stay Orders & Request History Banner (Always visible so guest can view history anytime) */}
              <button
                onClick={() => setScreen('requests')}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition active:scale-[0.99] shadow-sm ${bgCard}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black">
                        My Orders &amp; Request History ({requests.length})
                      </p>
                      {staySpendTotal > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          ₹{staySpendTotal}
                        </span>
                      )}
                    </div>
                    {requests.length > 0 ? (
                      <p className={`text-[11px] truncate mt-0.5 ${textSub}`}>
                        Latest: {requests[0].service.replace('_', ' ')} —{' '}
                        <span className="font-bold uppercase">
                          {requests[0].status === 'received' ? 'Sent' : requests[0].status}
                        </span>
                      </p>
                    ) : (
                      <p className={`text-[11px] truncate mt-0.5 ${textSub}`}>
                        View everything you order or request during your stay
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-black flex-shrink-0" style={{ color: primaryColor }}>
                  History &rarr;
                </span>
              </button>

              {/* Six Main Navigation Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setScreen('wifi')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition active:scale-[0.98] ${bgCard}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                  >
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">House &amp; Wi-Fi</h3>
                    <p className={`text-[11px] mt-0.5 ${textSub}`}>
                      Wi-Fi password &amp; timings
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setScreen('services')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition active:scale-[0.98] ${bgCard}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Guest Services</h3>
                    <p className={`text-[11px] mt-0.5 ${textSub}`}>
                      Food, housekeeping &amp; more
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setScreen('guide')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition active:scale-[0.98] ${bgCard}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                  >
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Local Guide</h3>
                    <p className={`text-[11px] mt-0.5 ${textSub}`}>
                      Places &amp; Maps directions
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setScreen('contacts')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition active:scale-[0.98] ${bgCard}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                  >
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Contacts</h3>
                    <p className={`text-[11px] mt-0.5 ${textSub}`}>
                      Reception &amp; departments
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setScreen('policies')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition active:scale-[0.98] ${bgCard}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Policies</h3>
                    <p className={`text-[11px] mt-0.5 ${textSub}`}>
                      Hotel house rules
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setScreen('emergency')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-3 transition active:scale-[0.98] ${bgCard}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15 text-red-500">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-red-500">Emergency</h3>
                    <p className={`text-[11px] mt-0.5 ${textSub}`}>
                      24/7 helplines &amp; urgent call
                    </p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* SCREEN: HOUSE & WI-FI */}
          {screen === 'wifi' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black">House &amp; Wi-Fi</h2>

              <div className={`p-5 rounded-3xl border space-y-4 ${bgCard}`}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                  >
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase ${textSub}`}>Guest Wi-Fi</p>
                    <p className="text-base font-black">
                      {hotel.houseInfo?.wifiName || 'Not set'}
                    </p>
                  </div>
                </div>

                {hotel.houseInfo?.wifiPassword && (
                  <div className={`p-3.5 rounded-2xl flex items-center justify-between ${bgMuted}`}>
                    <div>
                      <p className={`text-[10px] font-bold uppercase ${textSub}`}>Password</p>
                      <p className="font-mono font-black text-sm">
                        {hotel.houseInfo.wifiPassword}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(hotel.houseInfo.wifiPassword)
                        setCopiedWifi(true)
                        setTimeout(() => setCopiedWifi(false), 2000)
                      }}
                      style={{ backgroundColor: primaryColor }}
                      className="px-3.5 py-2 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
                    >
                      {copiedWifi ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className={`p-5 rounded-3xl border space-y-3 ${bgCard}`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Hotel Timings
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className={`p-3 rounded-2xl ${bgMuted}`}>
                    <p className={textSub}>Check-in</p>
                    <p className="font-black text-sm mt-0.5">
                      {hotel.houseInfo?.checkinTime || '12:00 PM'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl ${bgMuted}`}>
                    <p className={textSub}>Check-out</p>
                    <p className="font-black text-sm mt-0.5">
                      {hotel.houseInfo?.checkoutTime || '11:00 AM'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl ${bgMuted}`}>
                    <p className={textSub}>Breakfast</p>
                    <p className="font-black text-sm mt-0.5">
                      {hotel.houseInfo?.breakfastStart} – {hotel.houseInfo?.breakfastEnd}
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl ${bgMuted}`}>
                    <p className={textSub}>Restaurant</p>
                    <p className="font-black text-sm mt-0.5">
                      {hotel.houseInfo?.restaurantAlwaysOpen !== false
                        ? 'Open 24×7'
                        : `${hotel.houseInfo?.restaurantOpen} – ${hotel.houseInfo?.restaurantClose}`}
                    </p>
                  </div>
                </div>

                {(hotel.houseInfo?.extraTimings || [])
                  .filter((et: any) => et.label && et.value)
                  .map((et: any) => (
                    <div
                      key={et.id}
                      className={`p-3 rounded-2xl flex items-center justify-between text-xs ${bgMuted}`}
                    >
                      <span className="font-bold">{et.label}</span>
                      <span className="font-black">{et.value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SCREEN: GUEST SERVICES LIST */}
          {screen === 'services' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black">Guest Services</h2>
                  <p className={`text-xs ${textSub}`}>
                    Select a service below. Your request goes straight to our team.
                  </p>
                </div>
                <button
                  onClick={() => setScreen('requests')}
                  className="px-3 py-1.5 rounded-xl text-xs font-black border"
                  style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
                >
                  My History ({requests.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {enabledServices.map((srvId) => {
                  const meta = SERVICE_META[srvId]
                  const srvConf = hotel.services?.[srvId]
                  const Icon = meta.icon
                  return (
                    <button
                      key={srvId}
                      onClick={() => {
                        resetFormState()
                        setActiveService(srvId)
                        if (srvId === 'restaurant') {
                          setScreen('menu')
                        } else {
                          setScreen('service_form')
                        }
                      }}
                      className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition active:scale-[0.99] ${bgCard}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-sm">
                            {srvConf?.label || meta.defaultLabel}
                          </h3>
                          <p className={`text-xs truncate ${textSub}`}>
                            {srvConf?.description || meta.badge}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-black px-2.5 py-1 rounded-xl flex-shrink-0"
                        style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                      >
                        Open
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* SCREEN: RESTAURANT MENU & ORDER */}
          {screen === 'menu' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black">Menu &amp; In-Room Dining</h2>
                  <p className={`text-xs ${textSub}`}>
                    {hotel.houseInfo?.restaurantAlwaysOpen !== false
                      ? 'Open 24×7 for In-Room Dining'
                      : `Hours: ${hotel.houseInfo?.restaurantOpen} – ${hotel.houseInfo?.restaurantClose}`}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                    restaurantOpen
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-red-500/15 text-red-500'
                  }`}
                >
                  {restaurantOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>

              {!restaurantOpen && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  The restaurant is currently closed. You can browse the menu, and ordering will resume during opening hours.
                </div>
              )}

              {/* Veg Only Filter */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setVegOnly(!vegOnly)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    vegOnly
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                      : bgCard
                  }`}
                >
                  <span className="w-3 h-3 rounded-sm border border-emerald-600 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  </span>
                  Pure Veg Only
                </button>
              </div>

              {/* Categories & Items */}
              <div className="space-y-5">
                {(hotel.menu || []).map((cat: any) => {
                  const visibleItems = (cat.items || []).filter(
                    (it: any) =>
                      it.name &&
                      it.name.trim() !== '' &&
                      it.available !== false &&
                      (!vegOnly || it.isVeg)
                  )
                  if (visibleItems.length === 0) return null

                  return (
                    <div key={cat.id} className="space-y-2.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        {cat.name}
                      </h3>
                      {visibleItems.map((item: any) => {
                        const qty = itemQuantities[item.id] || 0
                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${bgCard}`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                                    item.isVeg ? 'border-emerald-600' : 'border-red-600'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                                    }`}
                                  />
                                </span>
                                <p className="font-bold text-sm truncate">{item.name}</p>
                              </div>
                              {item.description && (
                                <p className={`text-[11px] mt-0.5 line-clamp-1 ${textSub}`}>
                                  {item.description}
                                </p>
                              )}
                              <p className="text-xs font-black mt-1">₹{item.price}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {qty > 0 ? (
                                <div className="flex items-center gap-2 bg-slate-500/10 rounded-xl p-1">
                                  <button
                                    onClick={() => updateQty(item.id, -1)}
                                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 shadow flex items-center justify-center"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-black w-4 text-center">
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => updateQty(item.id, 1)}
                                    style={{ backgroundColor: primaryColor }}
                                    className="w-7 h-7 rounded-lg text-white shadow flex items-center justify-center"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => updateQty(item.id, 1)}
                                  className="px-3 py-1.5 rounded-xl border text-xs font-black"
                                  style={{ borderColor: primaryColor, color: primaryColor }}
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Order Summary & Note */}
              <div className={`p-4 rounded-3xl border space-y-3 ${bgCard}`}>
                {formSummary.items.length > 0 && (
                  <div className="space-y-1.5 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                    <p className="text-xs font-black uppercase text-slate-400">Order Summary</p>
                    {formSummary.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>
                          {it.qty} × {it.name}
                        </span>
                        <span className="font-bold">₹{(it.price || 0) * it.qty}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-black pt-1">
                      <span>Total</span>
                      <span>₹{formSummary.total}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Cooking instructions / Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Less spicy, no onion..."
                    className={`w-full rounded-xl border p-2.5 text-xs outline-none ${bgMuted}`}
                  />
                </div>

                {submitError && (
                  <p className="text-xs font-bold text-red-500">{submitError}</p>
                )}

                <button
                  onClick={handleSendRequest}
                  disabled={!formSummary.valid || submitting}
                  style={{
                    backgroundColor: formSummary.valid ? primaryColor : '#94a3b8',
                  }}
                  className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting
                    ? 'Sending Order...'
                    : formSummary.total > 0
                    ? `Send Order · ₹${formSummary.total}`
                    : 'Send Order'}
                </button>
                {formSummary.hint && (
                  <p className={`text-[11px] text-center font-medium ${textSub}`}>
                    {formSummary.hint}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SCREEN: SERVICE REQUEST FORMS */}
          {screen === 'service_form' && activeService && (
            <div className="space-y-4">
              <h2 className="text-lg font-black">
                {hotel.services?.[activeService]?.label ||
                  SERVICE_META[activeService].defaultLabel}
              </h2>

              {/* HOUSEKEEPING */}
              {activeService === 'housekeeping' && (
                <div className="space-y-4">
                  {(hotel.requestItems?.housekeeping || []).map((grp: any) => {
                    const validItems = (grp.items || []).filter(
                      (i: any) => i.name && i.name.trim() !== ''
                    )
                    if (validItems.length === 0) return null
                    return (
                      <div key={grp.id} className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                          {grp.name}
                        </h3>
                        {validItems.map((item: any) => {
                          const qty = itemQuantities[item.id] || 0
                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-2xl border flex items-center justify-between ${bgCard}`}
                            >
                              <span className="text-sm font-bold">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQty(item.id, -1, item.maxQty || 10)}
                                  className={`w-8 h-8 rounded-xl border flex items-center justify-center ${bgMuted}`}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-black w-5 text-center">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateQty(item.id, 1, item.maxQty || 10)}
                                  style={{ backgroundColor: primaryColor }}
                                  className="w-8 h-8 rounded-xl text-white flex items-center justify-center"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* MINI BAR & LAUNDRY */}
              {(activeService === 'minibar' || activeService === 'laundry') && (
                <div className="space-y-2.5">
                  {(
                    (activeService === 'minibar'
                      ? hotel.requestItems?.minibar
                      : hotel.requestItems?.laundry) || []
                  )
                    .filter((i: any) => i.name && i.name.trim() !== '')
                    .map((item: any) => {
                      const qty = itemQuantities[item.id] || 0
                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between ${bgCard}`}
                        >
                          <div>
                            <p className="text-sm font-bold">{item.name}</p>
                            <p className={`text-xs font-black ${textSub}`}>₹{item.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className={`w-8 h-8 rounded-xl border flex items-center justify-center ${bgMuted}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-black w-5 text-center">{qty}</span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              style={{ backgroundColor: primaryColor }}
                              className="w-8 h-8 rounded-xl text-white flex items-center justify-center"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* SPA */}
              {activeService === 'spa' && (
                <div className={`p-4 rounded-3xl border space-y-4 ${bgCard}`}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">Preferred Date</label>
                      <input
                        type="date"
                        value={spaDate}
                        onChange={(e) => setSpaDate(e.target.value)}
                        className={`w-full rounded-xl border p-2.5 text-xs font-bold ${bgMuted}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Number of Guests</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSpaPeopleChange(spaPeopleCount - 1)}
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center ${bgMuted}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-sm flex-1 text-center">
                          {spaPeopleCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSpaPeopleChange(spaPeopleCount + 1)}
                          style={{ backgroundColor: primaryColor }}
                          className="w-9 h-9 rounded-xl text-white flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {spaSelections.map((sel, idx) => (
                    <div key={idx} className={`p-3.5 rounded-2xl space-y-2.5 ${bgMuted}`}>
                      <p className="text-xs font-black">Guest {idx + 1}</p>
                      <select
                        value={sel.treatmentId}
                        onChange={(e) => {
                          const next = [...spaSelections]
                          next[idx] = { ...next[idx], treatmentId: e.target.value }
                          setSpaSelections(next)
                        }}
                        className={`w-full rounded-xl border p-2.5 text-xs font-bold ${bgCard}`}
                      >
                        <option value="">Select Treatment...</option>
                        {(hotel.requestItems?.spa || [])
                          .filter((t: any) => t.name && t.name.trim() !== '')
                          .map((t: any) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.duration}) — ₹{t.price}
                            </option>
                          ))}
                      </select>
                      <div>
                        <label className="block text-[11px] font-bold mb-1">
                          Preferred Time
                        </label>
                        <input
                          type="time"
                          value={sel.time}
                          onChange={(e) => {
                            const next = [...spaSelections]
                            next[idx] = { ...next[idx], time: e.target.value }
                            setSpaSelections(next)
                          }}
                          className={`w-full rounded-xl border p-2 text-xs font-bold ${bgCard}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAXI */}
              {activeService === 'taxi' && (
                <div className={`p-4 rounded-3xl border space-y-3.5 ${bgCard}`}>
                  <div>
                    <label className="block text-xs font-bold mb-1">Destination *</label>
                    <input
                      type="text"
                      value={taxiDestination}
                      onChange={(e) => setTaxiDestination(e.target.value)}
                      placeholder="e.g. Mandwa Jetty, Airport, Sightseeing..."
                      className={`w-full rounded-xl border p-3 text-xs font-bold outline-none ${bgMuted}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">Pickup Date *</label>
                      <input
                        type="date"
                        value={taxiDate}
                        onChange={(e) => setTaxiDate(e.target.value)}
                        className={`w-full rounded-xl border p-2.5 text-xs font-bold ${bgMuted}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Pickup Time *</label>
                      <input
                        type="time"
                        value={taxiTime}
                        onChange={(e) => setTaxiTime(e.target.value)}
                        className={`w-full rounded-xl border p-2.5 text-xs font-bold ${bgMuted}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Number of Passengers</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setTaxiPeople(Math.max(1, taxiPeople - 1))}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center ${bgMuted}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-black text-sm">{taxiPeople} Passengers</span>
                      <button
                        type="button"
                        onClick={() => setTaxiPeople(Math.min(20, taxiPeople + 1))}
                        style={{ backgroundColor: primaryColor }}
                        className="w-9 h-9 rounded-xl text-white flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SPECIAL OCCASIONS */}
              {activeService === 'special_occasions' && (
                <div className={`p-4 rounded-3xl border space-y-3.5 ${bgCard}`}>
                  <div>
                    <label className="block text-xs font-bold mb-1">Occasion *</label>
                    <input
                      type="text"
                      value={occasionType}
                      onChange={(e) => setOccasionType(e.target.value)}
                      placeholder="e.g. Birthday, Anniversary, Honeymoon"
                      className={`w-full rounded-xl border p-3 text-xs font-bold outline-none ${bgMuted}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Date *</label>
                    <input
                      type="date"
                      value={occasionDate}
                      onChange={(e) => setOccasionDate(e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-xs font-bold ${bgMuted}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Celebration Details *
                    </label>
                    <textarea
                      rows={3}
                      value={occasionDetails}
                      onChange={(e) => setOccasionDetails(e.target.value)}
                      placeholder="Tell us about cake flavour, flower bouquet, room decoration, or timing..."
                      className={`w-full rounded-xl border p-2.5 text-xs outline-none ${bgMuted}`}
                    />
                  </div>
                </div>
              )}

              {/* Common Note + Total + Send Button */}
              <div className={`p-4 rounded-3xl border space-y-3 ${bgCard}`}>
                {formSummary.total > 0 && (
                  <div className="flex items-center justify-between text-sm font-black pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <span>Estimated Total</span>
                    <span>₹{formSummary.total}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Additional Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any extra instructions for staff..."
                    className={`w-full rounded-xl border p-2.5 text-xs outline-none ${bgMuted}`}
                  />
                </div>

                {submitError && (
                  <p className="text-xs font-bold text-red-500">{submitError}</p>
                )}

                <button
                  onClick={handleSendRequest}
                  disabled={!formSummary.valid || submitting}
                  style={{
                    backgroundColor: formSummary.valid ? primaryColor : '#94a3b8',
                  }}
                  className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting
                    ? 'Sending...'
                    : formSummary.total > 0
                    ? `Send Request · ₹${formSummary.total}`
                    : 'Send Request'}
                </button>

                {formSummary.hint && (
                  <p className={`text-[11px] text-center font-medium ${textSub}`}>
                    {formSummary.hint}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SCREEN: MY REQUESTS & STAY ORDER HISTORY (LIVE STATUS) */}
          {screen === 'requests' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black">My Stay Orders &amp; History</h2>
                  <p className={`text-xs ${textSub}`}>
                    Room {roomNumber} · {stay.guestName}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Updates
                </span>
              </div>

              {/* Stay Summary Card */}
              <div className={`p-4 rounded-3xl border space-y-3 ${bgCard}`}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className={`p-2.5 rounded-2xl ${bgMuted}`}>
                    <p className={`text-[10px] font-bold uppercase ${textSub}`}>Total Sent</p>
                    <p className="text-lg font-black mt-0.5">{requests.length}</p>
                  </div>
                  <div className={`p-2.5 rounded-2xl ${bgMuted}`}>
                    <p className={`text-[10px] font-bold uppercase ${textSub}`}>In Progress</p>
                    <p className="text-lg font-black mt-0.5 text-amber-500">
                      {activeRequestsCount}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-2xl ${bgMuted}`}>
                    <p className={`text-[10px] font-bold uppercase ${textSub}`}>Stay Bill</p>
                    <p className="text-lg font-black mt-0.5 text-emerald-500">
                      ₹{staySpendTotal}
                    </p>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { id: 'all', label: `All (${requests.length})` },
                    {
                      id: 'food',
                      label: `Food (${
                        requests.filter(
                          (r: any) =>
                            r.service === 'restaurant' || r.service === 'minibar'
                        ).length
                      })`,
                    },
                    {
                      id: 'services',
                      label: `Services (${
                        requests.filter(
                          (r: any) =>
                            r.service !== 'restaurant' && r.service !== 'minibar'
                        ).length
                      })`,
                    },
                  ].map((tab) => {
                    const active = historyFilter === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setHistoryFilter(tab.id as any)}
                        style={active ? { backgroundColor: primaryColor } : {}}
                        className={`py-2 rounded-xl text-xs font-black transition ${
                          active ? 'text-white shadow-sm' : bgMuted
                        }`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {(() => {
                const filteredReqs = requests.filter((r: any) => {
                  if (historyFilter === 'food') {
                    return r.service === 'restaurant' || r.service === 'minibar'
                  }
                  if (historyFilter === 'services') {
                    return r.service !== 'restaurant' && r.service !== 'minibar'
                  }
                  return true
                })

                if (filteredReqs.length === 0) {
                  return (
                    <div className={`p-8 rounded-3xl border text-center space-y-3 ${bgCard}`}>
                      <Clock className={`w-8 h-8 mx-auto ${textSub}`} />
                      <div>
                        <p className="font-bold text-sm">No orders or requests yet</p>
                        <p className={`text-xs mt-1 ${textSub}`}>
                          Everything you order from the restaurant or request from housekeeping during your stay will be saved here.
                        </p>
                      </div>
                      <button
                        onClick={() => setScreen('services')}
                        style={{ backgroundColor: primaryColor }}
                        className="px-4 py-2.5 rounded-xl text-white text-xs font-black inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Browse Services &amp; Menu
                      </button>
                    </div>
                  )
                }

                return filteredReqs.map((req: any) => {
                  const statusMap: Record<
                    string,
                    { label: string; color: string; step: number }
                  > = {
                    received: {
                      label: 'Sent',
                      color: 'bg-blue-500/15 text-blue-500',
                      step: 1,
                    },
                    seen: {
                      label: 'Seen',
                      color: 'bg-indigo-500/15 text-indigo-500',
                      step: 2,
                    },
                    accepted: {
                      label: 'Accepted',
                      color: 'bg-amber-500/15 text-amber-500',
                      step: 3,
                    },
                    preparing: {
                      label: 'Preparing',
                      color: 'bg-amber-500/15 text-amber-500',
                      step: 3,
                    },
                    on_the_way: {
                      label: 'On the way',
                      color: 'bg-purple-500/15 text-purple-500',
                      step: 3,
                    },
                    delivered: {
                      label: 'Delivered',
                      color: 'bg-emerald-500/15 text-emerald-500',
                      step: 4,
                    },
                    completed: {
                      label: 'Completed',
                      color: 'bg-emerald-500/15 text-emerald-500',
                      step: 4,
                    },
                    declined: {
                      label: 'Declined',
                      color: 'bg-red-500/15 text-red-500',
                      step: 0,
                    },
                  }
                  const badge = statusMap[req.status] || statusMap.received

                  return (
                    <div
                      key={req.id}
                      className={`p-4 rounded-3xl border space-y-3 ${bgCard}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider">
                            {req.service.replace('_', ' ')}
                          </span>
                          <p className={`text-[11px] ${textSub}`}>
                            {new Date(req.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* 4-Step Progress Bar (Sent -> Seen -> Accepted -> Completed) */}
                      {req.status !== 'declined' && (
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          {['Sent', 'Seen', 'Accepted', 'Completed'].map((stLabel, idx) => {
                            const active = badge.step >= idx + 1
                            return (
                              <div key={stLabel} className="text-center">
                                <div
                                  className={`h-1.5 rounded-full mb-1 transition-all ${
                                    active ? '' : 'bg-slate-200 dark:bg-slate-800'
                                  }`}
                                  style={active ? { backgroundColor: primaryColor } : {}}
                                />
                                <span
                                  className={`text-[9px] font-bold uppercase ${
                                    active ? 'font-black' : textSub
                                  }`}
                                >
                                  {stLabel}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Items */}
                      {Array.isArray(req.items) && req.items.length > 0 && (
                        <div className={`p-3 rounded-2xl space-y-1 text-xs ${bgMuted}`}>
                          {req.items.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between">
                              <span>
                                {it.qty} × {it.name}
                              </span>
                              {it.price > 0 && (
                                <span className="font-bold">₹{it.price * it.qty}</span>
                              )}
                            </div>
                          ))}
                          {req.total > 0 && (
                            <div className="flex justify-between font-black pt-1 border-t border-slate-300/40">
                              <span>Total</span>
                              <span>₹{req.total}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {req.note && (
                        <p className={`text-xs italic ${textSub}`}>Note: “{req.note}”</p>
                      )}

                      {(req.accepted_at || req.completed_at) && (
                        <div className={`flex flex-wrap gap-3 text-[10px] pt-1 ${textSub}`}>
                          {req.accepted_at && (
                            <span>
                              Accepted at{' '}
                              {new Date(req.accepted_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          {req.completed_at && (
                            <span className="text-emerald-500 font-bold">
                              Completed at{' '}
                              {new Date(req.completed_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      )}

                      {req.status === 'declined' && req.decline_reason && (
                        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
                          Reason: {req.decline_reason}
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {/* SCREEN: LOCAL GUIDE */}
          {screen === 'guide' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-black">Local Guide</h2>
                <p className={`text-xs ${textSub}`}>
                  Curated recommendations around {hotel.branding?.city || hotelName}
                </p>
              </div>

              {GUIDE_CATEGORIES.map((category) => {
                const places = (hotel.localGuide || []).filter(
                  (p: any) =>
                    p.category === category && p.name && p.name.trim() !== ''
                )
                const cityStr = hotel.branding?.city || ''
                const hotelAddr = hotel.branding?.address || `${hotelName} ${cityStr}`
                const moreMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${category} near ${hotelAddr}`
                )}`

                return (
                  <div key={category} className={`p-4 rounded-3xl border space-y-3 ${bgCard}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: primaryColor }}>
                        {category}
                      </h3>
                      <a
                        href={moreMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold flex items-center gap-1 hover:underline"
                        style={{ color: primaryColor }}
                      >
                        More on Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {places.length === 0 ? (
                      <p className={`text-xs ${textSub}`}>
                        Tap &ldquo;More on Google Maps&rdquo; above to explore {category.toLowerCase()}.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {places.map((pl: any) => {
                          const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            `${pl.name}, ${cityStr}`
                          )}`
                          return (
                            <div
                              key={pl.id}
                              className={`p-3 rounded-2xl flex items-center justify-between gap-3 ${bgMuted}`}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-black truncate">{pl.name}</p>
                                {pl.description && (
                                  <p className={`text-[11px] line-clamp-1 ${textSub}`}>
                                    {pl.description}
                                  </p>
                                )}
                              </div>
                              <a
                                href={dirUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ backgroundColor: primaryColor }}
                                className="px-3 py-1.5 rounded-xl text-white text-[11px] font-black flex items-center gap-1 flex-shrink-0"
                              >
                                <Navigation className="w-3 h-3" /> Directions
                              </a>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* SCREEN: CONTACTS */}
          {screen === 'contacts' && (
            <div className="space-y-3">
              <h2 className="text-lg font-black">Hotel Contacts</h2>
              <p className={`text-xs ${textSub}`}>
                Dial the room-phone extension from your room landline or call directly from your phone.
              </p>

              {Object.values(hotel.departments || {}).map((dept: any) => {
                const resolvedPhone = deptNumber(
                  dept,
                  hotel.countryCode,
                  hotel.timezone
                )
                return (
                  <div
                    key={dept.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${bgCard}`}
                  >
                    <div>
                      <h3 className="font-black text-sm">{dept.name}</h3>
                      {dept.extension && (
                        <p className={`text-xs font-semibold mt-0.5 ${textSub}`}>
                          Room Phone Extension:{' '}
                          <span className="font-black text-slate-900 dark:text-white">
                            Dial {dept.extension}
                          </span>
                        </p>
                      )}
                    </div>

                    {resolvedPhone && (
                      <a
                        href={`tel:${resolvedPhone}`}
                        style={{ backgroundColor: primaryColor }}
                        className="px-4 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* SCREEN: POLICIES */}
          {screen === 'policies' && (
            <div className="space-y-3">
              <h2 className="text-lg font-black">Hotel Policies &amp; House Rules</h2>
              <div className={`p-5 rounded-3xl border space-y-3 ${bgCard}`}>
                {(hotel.policies || [])
                  .filter((p: string) => p && p.trim() !== '')
                  .map((rule: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-medium">{rule}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SCREEN: EMERGENCY */}
          {screen === 'emergency' && (
            <div className="space-y-3">
              <h2 className="text-lg font-black text-red-500">Emergency &amp; Helplines</h2>
              <p className={`text-xs ${textSub}`}>
                Tap any button below to place an immediate phone call.
              </p>

              {/* Hotel Emergency Line */}
              {(() => {
                const emDept = hotel.departments?.emergency || hotel.departments?.front_desk
                const emPhone = deptNumber(emDept, hotel.countryCode, hotel.timezone)
                return (
                  <div className="p-4 rounded-3xl border-2 border-red-500/40 bg-red-500/10 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-red-500">
                        Hotel 24/7 Emergency Desk
                      </p>
                      <p className="text-sm font-black mt-0.5">
                        {emDept?.extension ? `Room Ext: ${emDept.extension}` : hotelName}
                      </p>
                    </div>
                    {emPhone && (
                      <a
                        href={`tel:${emPhone}`}
                        className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call Desk
                      </a>
                    )}
                  </div>
                )
              })()}

              {/* Public Helplines */}
              <div className="space-y-2.5">
                {(hotel.emergencyContacts || [])
                  .filter((c: any) => c.label && c.phone)
                  .map((c: any) => (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border flex items-center justify-between ${bgCard}`}
                    >
                      <div>
                        <p className="font-black text-sm">{c.label}</p>
                        <p className={`text-xs font-mono font-bold ${textSub}`}>{c.phone}</p>
                      </div>
                      <a
                        href={`tel:${c.phone}`}
                        className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call {c.phone}
                      </a>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
