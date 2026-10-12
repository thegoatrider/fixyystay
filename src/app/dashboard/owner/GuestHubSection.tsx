'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  QrCode,
  Sparkles,
  Palette,
  PhoneCall,
  Wifi,
  UtensilsCrossed,
  ClipboardList,
  ToggleLeft,
  MapPin,
  DoorOpen,
  Users,
  Printer,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Lock,
  Save,
  ShieldCheck,
  Building2,
  CalendarDays,
  Clock,
} from 'lucide-react'
import {
  getPropertyGuestHubBundle,
  createGuestHubOrder,
  verifyGuestHubPayment,
  saveGuestHubSection,
  addHubRoomAction,
  renameHubRoomAction,
  removeHubRoomAction,
  saveHubStaffUserAction,
  deleteHubStaffUserAction,
} from '@/app/actions/guest-hub'
import type { ServiceId } from '@/lib/guest-hub/starter'
import GuestHubHistoryExplorer from '@/components/guest-hub/GuestHubHistoryExplorer'

type ConfigTab =
  | 'rooms_qr'
  | 'history'
  | 'branding'
  | 'departments'
  | 'house_info'
  | 'services'
  | 'menu'
  | 'request_items'
  | 'local_guide'
  | 'staff'

export default function GuestHubSection({
  ownerId,
  ownerEmail,
  properties = [],
  isSuperAdmin = false,
  initialPropertyId,
}: {
  ownerId: string
  ownerEmail: string
  properties: any[]
  isSuperAdmin?: boolean
  initialPropertyId?: string
}) {
  const defaultProp =
    properties.find((p: any) =>
      `${p?.name || ''} ${p?.slug || ''}`.toLowerCase().includes('madhur')
    ) || properties[0]

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    initialPropertyId || defaultProp?.id || ''
  )
  const [bundle, setBundle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<ConfigTab>('rooms_qr')
  const [saving, setSaving] = useState(false)
  const [saveToast, setSaveToast] = useState<string | null>(null)

  // Subscription / Activation Calculator State (₹20 / room / month)
  const [roomsToBuy, setRoomsToBuy] = useState(10)
  const [monthsToBuy, setMonthsToBuy] = useState(1)
  const [payingSub, setPayingSub] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Editable sections state
  const [branding, setBranding] = useState<any>({})
  const [departments, setDepartments] = useState<any>({})
  const [houseInfo, setHouseInfo] = useState<any>({})
  const [policiesText, setPoliciesText] = useState<string>('')
  const [services, setServices] = useState<any>({})
  const [menu, setMenu] = useState<any[]>([])
  const [requestItems, setRequestItems] = useState<any>({})
  const [localGuide, setLocalGuide] = useState<any[]>([])

  // Room management state
  const [newRoomName, setNewRoomName] = useState('')
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [editingRoomValue, setEditingRoomValue] = useState('')

  // Staff form state
  const [staffName, setStaffName] = useState('')
  const [staffLoginId, setStaffLoginId] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [staffRole, setStaffRole] = useState<'admin' | 'manager' | 'staff' | 'kitchen'>('staff')
  const [staffDepts, setStaffDepts] = useState<string[]>(['housekeeping'])

  const origin =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      : 'https://www.fixystays.com'

  const loadPropertyBundle = useCallback(async (propId: string) => {
    if (!propId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await getPropertyGuestHubBundle(propId)
    if (!res.error) {
      setBundle(res)
      const hs = res.hubSettings
      if (hs) {
        setBranding(hs.branding || {})
        setDepartments(hs.departments || {})
        setHouseInfo(hs.house_info || {})
        setPoliciesText(Array.isArray(hs.policies) ? hs.policies.join('\n') : '')
        setServices(hs.services || {})
        setMenu(Array.isArray(hs.menu) ? hs.menu : [])
        setRequestItems(hs.request_items || {})
        setLocalGuide(Array.isArray(hs.local_guide) ? hs.local_guide : [])
      }
      if (res.rooms && res.rooms.length > 0) {
        setRoomsToBuy(Math.max(res.rooms.length, 5))
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selectedPropertyId) {
      loadPropertyBundle(selectedPropertyId)
    } else if (properties[0]?.id) {
      setSelectedPropertyId(properties[0].id)
    } else {
      setLoading(false)
    }
  }, [selectedPropertyId, properties, loadPropertyBundle])

  const triggerToast = (msg: string) => {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(null), 3500)
  }

  const handleSaveSection = async (
    section:
      | 'branding'
      | 'departments'
      | 'house_info'
      | 'policies'
      | 'services'
      | 'menu'
      | 'request_items'
      | 'local_guide',
    payload: any
  ) => {
    setSaving(true)
    const res = await saveGuestHubSection(selectedPropertyId, section, payload)
    setSaving(false)
    if (res.error) {
      alert(res.error)
    } else {
      triggerToast('Saved changes successfully!')
      loadPropertyBundle(selectedPropertyId)
    }
  }

  // Handle Razorpay Payment for ₹20 / room / month
  const handleSubscribeGuestHub = async () => {
    if (!selectedPropertyId) return
    setPayingSub(true)
    try {
      const currentProp = properties.find((p) => p.id === selectedPropertyId)
      const res = await createGuestHubOrder({
        email: ownerEmail,
        roomsCount: roomsToBuy,
        monthsCount: monthsToBuy,
        propertyId: selectedPropertyId,
        ownerId,
        hotelName: currentProp?.name || 'Hotel',
        city: currentProp?.city_area || currentProp?.city || 'Alibag',
      })

      if (res.error) {
        alert(res.error)
        setPayingSub(false)
        return
      }

      const options = {
        key: res.key,
        amount: res.amount,
        currency: 'INR',
        name: 'FixyStays · Guest Hub',
        description: `Guest Hub: ${roomsToBuy} Rooms × ₹20/mo (${monthsToBuy} mo)`,
        order_id: res.orderId,
        prefill: { email: ownerEmail },
        theme: { color: '#2563eb' },
        handler: async function (response: any) {
          const verifyRes = await verifyGuestHubPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id
          )
          if (verifyRes.error) {
            alert(`Payment received, but activation returned: ${verifyRes.error}`)
          } else {
            setShowUpgradeModal(false)
            triggerToast('Guest Hub activated for your property!')
            await loadPropertyBundle(selectedPropertyId)
          }
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed.')
    } finally {
      setPayingSub(false)
    }
  }

  // Print QR Card for a single room or all rooms
  const printRoomQrCards = (roomsToPrint: any[]) => {
    if (!roomsToPrint || roomsToPrint.length === 0) return
    const hotelTitle = branding?.hotelName || bundle?.property?.name || 'Hotel'
    const accent = branding?.primaryColor || '#2563eb'

    const cardsHtml = roomsToPrint
      .map((r) => {
        const canvas = document.getElementById(
          `qr-canvas-${r.id}`
        ) as HTMLCanvasElement | null
        const dataUrl = canvas ? canvas.toDataURL('image/png') : ''
        const roomUrl = `${origin}/g/${r.qr_token}`
        return `
          <div class="card">
            <div class="badge">WELCOME TO</div>
            <div class="hotel">${hotelTitle}</div>
            <div class="room-pill">ROOM ${r.room_number}</div>
            <div class="qr-box">
              <img src="${dataUrl}" alt="Room ${r.room_number} QR" />
            </div>
            <div class="scan-title">Scan for Guest Hub</div>
            <div class="scan-sub">Wi-Fi · Room Service · Housekeeping · Menu · Reception</div>
            <div class="scan-note">Enter the 4-digit PIN given at check-in · No app or phone number needed</div>
            <div class="url-foot">${roomUrl}</div>
          </div>
        `
      })
      .join('')

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>${hotelTitle} - Room QR Cards</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 24px;
              background: #f8fafc;
              display: flex;
              flex-wrap: wrap;
              gap: 24px;
              justify-content: center;
            }
            .card {
              width: 340px;
              background: white;
              border: 8px solid ${accent};
              border-radius: 28px;
              padding: 28px 20px;
              text-align: center;
              page-break-inside: avoid;
            }
            .badge {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 2.5px;
              color: #64748b;
            }
            .hotel {
              font-size: 22px;
              font-weight: 900;
              color: #0f172a;
              margin: 6px 0 12px;
            }
            .room-pill {
              display: inline-block;
              background: ${accent};
              color: white;
              font-size: 14px;
              font-weight: 900;
              padding: 5px 16px;
              border-radius: 999px;
              letter-spacing: 1px;
              margin-bottom: 16px;
            }
            .qr-box {
              padding: 14px;
              border: 2px dashed #cbd5e1;
              border-radius: 20px;
              display: inline-block;
              margin-bottom: 16px;
            }
            .qr-box img {
              width: 190px;
              height: 190px;
              display: block;
            }
            .scan-title {
              font-size: 17px;
              font-weight: 900;
              color: ${accent};
              text-transform: uppercase;
            }
            .scan-sub {
              font-size: 12px;
              font-weight: 700;
              color: #334155;
              margin-top: 4px;
            }
            .scan-note {
              font-size: 10px;
              color: #64748b;
              margin-top: 8px;
            }
            .url-foot {
              font-size: 9px;
              color: #94a3b8;
              margin-top: 12px;
              font-family: monospace;
            }
            @media print {
              body { background: white; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${cardsHtml}
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `)
    win.document.close()
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-3xl border p-12 text-center shadow-sm">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-xl font-black text-gray-900">No Properties Found</h3>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Add your property first in Profile &amp; Plan, or onboard directly on the standalone Guest Hub page.
        </p>
        <Link href="/pricing/guest-hub">
          <Button className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl">
            Set Up Standalone Guest Hub
          </Button>
        </Link>
      </div>
    )
  }

  const hubSettings = bundle?.hubSettings
  const isSubscribedAndActive =
    isSuperAdmin ||
    (hubSettings &&
      hubSettings.subscription_status === 'active' &&
      (!hubSettings.subscription_end_date ||
        new Date(hubSettings.subscription_end_date) > new Date()))

  return (
    <div className="space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* Top Property Bar */}
      <div className="bg-white rounded-3xl border border-gray-150 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-900">Guest Hub Control Center</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-black">
                ₹20 / Room / Month
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              In-room QR guest portal, live department requests, menu ordering &amp; staff screens
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {properties.length > 1 && (
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-800"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {isSubscribedAndActive && (
            <>
              <Link
                href={`/staff?propertyId=${selectedPropertyId}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Live Staff Screen
              </Link>
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(true)}
                className="rounded-xl text-xs font-bold h-10"
              >
                + Add / Renew Rooms
              </Button>
            </>
          )}
        </div>
      </div>

      {saveToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-black flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl border p-12 text-center text-sm font-bold text-gray-400">
          Loading Guest Hub configuration...
        </div>
      ) : !isSubscribedAndActive ? (
        /* ====================================================================
           PAYWALL / ACTIVATION CARD FOR EXISTING OWNERS (₹20 / ROOM / MONTH)
           ==================================================================== */
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 md:p-10 shadow-2xl border border-blue-800/40">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Add-On Service for Property Owners
              </span>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                Activate Guest Hub for{' '}
                <span className="text-blue-400">
                  {bundle?.property?.name || 'Your Property'}
                </span>
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Let your guests scan a permanent QR in their room and—without installing any app or sharing their phone number—view Wi-Fi, order food from your menu, and send requests straight to Reception, Housekeeping, and Kitchen screens with instant audio alerts.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs font-semibold text-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Permanent QR per room + 4-digit Stay PIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Zero WhatsApp · 100% guest phone privacy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>7 Guest Services &amp; In-Room Dining Menu</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Dedicated Staff Logins &amp; Live Audio Alerts</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 bg-white text-slate-900 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-baseline justify-between border-b pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                    Simple Per-Room Pricing
                  </p>
                  <p className="text-3xl font-black mt-1">
                    ₹20{' '}
                    <span className="text-sm font-bold text-slate-500">
                      / room / month
                    </span>
                  </p>
                </div>
                <ShieldCheck className="w-8 h-8 text-blue-600" />
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-black uppercase text-slate-500">
                    Number of Rooms
                  </Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={roomsToBuy}
                      onChange={(e) =>
                        setRoomsToBuy(Math.max(1, parseInt(e.target.value || '1', 10)))
                      }
                      className="font-black text-lg h-11"
                    />
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                      × ₹20 / mo
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-black uppercase text-slate-500">
                    Billing Duration
                  </Label>
                  <div className="grid grid-cols-4 gap-2 mt-1.5">
                    {[1, 3, 6, 12].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMonthsToBuy(m)}
                        className={`py-2.5 rounded-xl text-xs font-black border transition ${
                          monthsToBuy === m
                            ? 'bg-blue-600 text-white border-blue-600 shadow'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {m} {m === 1 ? 'Mo' : 'Mos'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-900">
                      {roomsToBuy} Rooms × {monthsToBuy} Month(s)
                    </p>
                    <p className="text-[11px] text-blue-600">
                      Instant setup with starter menu &amp; services
                    </p>
                  </div>
                  <p className="text-2xl font-black text-blue-700">
                    ₹{roomsToBuy * 20 * monthsToBuy}
                  </p>
                </div>

                <Button
                  onClick={handleSubscribeGuestHub}
                  disabled={payingSub}
                  className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg"
                >
                  {payingSub
                    ? 'Opening Checkout...'
                    : `Pay ₹${roomsToBuy * 20 * monthsToBuy} & Activate Guest Hub`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ====================================================================
           ACTIVE PROPERTY BACK END (9 CONFIGURATION TABS)
           ==================================================================== */
        <>
          {/* Subscription Info Strip */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Guest Hub Active ·{' '}
                <strong>
                  {bundle?.rooms?.length || 0} / {hubSettings?.paid_rooms_limit || '∞'}{' '}
                  Rooms
                </strong>{' '}
                configured
              </span>
              {hubSettings?.slug && (
                <span className="px-2 py-0.5 rounded bg-white border text-slate-600 font-mono text-[11px]">
                  Hotel Code: {hubSettings.slug}
                </span>
              )}
            </div>
            {hubSettings?.subscription_end_date && (
              <span className="text-blue-700 font-semibold">
                Valid until{' '}
                {new Date(hubSettings.subscription_end_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* 10 Sub-navigation Pills */}
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border shadow-sm">
            {[
              { id: 'rooms_qr', label: 'Rooms & QR Cards', icon: QrCode },
              { id: 'history', label: 'History & Calendar', icon: CalendarDays },
              { id: 'branding', label: 'Branding', icon: Palette },
              { id: 'departments', label: 'Departments & Shifts', icon: PhoneCall },
              { id: 'house_info', label: 'House & Wi-Fi', icon: Wifi },
              { id: 'services', label: 'Services & Routing', icon: ToggleLeft },
              { id: 'menu', label: 'Menu & Timings', icon: UtensilsCrossed },
              { id: 'request_items', label: 'Request Items', icon: ClipboardList },
              { id: 'local_guide', label: 'Local Guide', icon: MapPin },
              { id: 'staff', label: 'Staff Logins', icon: Users },
            ].map((t) => {
              const Icon = t.icon
              const active = activeSubTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveSubTab(t.id as ConfigTab)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* TAB: HISTORY & CALENDAR + CUSTOMER SUMMARY */}
          {activeSubTab === 'history' && (
            <GuestHubHistoryExplorer
              rooms={bundle?.rooms || []}
              stays={bundle?.stays || []}
              requests={bundle?.requests || []}
              hotelName={branding?.hotelName || bundle?.property?.name || 'Hotel'}
              primaryColor={branding?.primaryColor || '#2563eb'}
              theme="light"
            />
          )}

          {/* TAB: ROOMS & QR CARDS */}
          {activeSubTab === 'rooms_qr' && (
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Rooms &amp; Permanent QR Cards
                  </h3>
                  <p className="text-xs text-gray-500">
                    Each room has a permanent, unguessable QR link. Print and place one card in each room.
                  </p>
                </div>
                <Button
                  onClick={() => printRoomQrCards(bundle?.rooms || [])}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl gap-2"
                >
                  <Printer className="w-4 h-4" /> Print All Room QR Cards ({bundle?.rooms?.length || 0})
                </Button>
              </div>

              {/* Add Room Form */}
              <div className="flex flex-wrap items-center gap-2 max-w-md">
                <Input
                  placeholder="Room number or name (e.g. 105 or Cottage A)"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="flex-1 h-10 text-xs font-bold"
                />
                <Button
                  onClick={async () => {
                    if (!newRoomName.trim()) return
                    const res = await addHubRoomAction(selectedPropertyId, newRoomName)
                    if (res.error) {
                      alert(res.error)
                      if ((res as any).limitReached) setShowUpgradeModal(true)
                    } else {
                      setNewRoomName('')
                      loadPropertyBundle(selectedPropertyId)
                    }
                  }}
                  className="bg-slate-900 hover:bg-black text-white font-black text-xs h-10 rounded-xl gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Room
                </Button>
              </div>

              {/* Rooms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(bundle?.rooms || []).map((room: any) => (
                  <div
                    key={room.id}
                    className="border rounded-2xl p-4 flex flex-col items-center text-center gap-3 bg-gray-50/60"
                  >
                    {editingRoomId === room.id ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <Input
                          value={editingRoomValue}
                          onChange={(e) => setEditingRoomValue(e.target.value)}
                          className="h-8 text-xs font-bold"
                        />
                        <Button
                          size="sm"
                          onClick={async () => {
                            await renameHubRoomAction(
                              selectedPropertyId,
                              room.id,
                              editingRoomValue
                            )
                            setEditingRoomId(null)
                            loadPropertyBundle(selectedPropertyId)
                          }}
                          className="h-8 px-2.5 text-xs font-bold bg-blue-600 text-white"
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="font-black text-base text-gray-900">
                          Room {room.room_number}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingRoomId(room.id)
                              setEditingRoomValue(room.room_number)
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:underline px-1.5"
                          >
                            Rename
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Remove Room ${room.room_number}?`)) {
                                await removeHubRoomAction(selectedPropertyId, room.id)
                                loadPropertyBundle(selectedPropertyId)
                              }
                            }}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white p-3 rounded-2xl border shadow-sm">
                      <QRCodeCanvas
                        id={`qr-canvas-${room.id}`}
                        value={`${origin}/g/${room.qr_token}`}
                        size={150}
                        level="H"
                      />
                    </div>

                    <p className="text-[10px] font-mono text-gray-400 truncate w-full">
                      /g/{room.qr_token}
                    </p>

                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printRoomQrCards([room])}
                        className="flex-1 text-xs font-bold rounded-xl gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Card
                      </Button>
                      <a
                        href={`/g/${room.qr_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center"
                        title="Preview Guest Page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BRANDING */}
          {activeSubTab === 'branding' && (
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-5 max-w-2xl">
              <h3 className="text-lg font-black text-gray-900">Hotel Branding</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Hotel Display Name</Label>
                  <Input
                    value={branding.hotelName || ''}
                    onChange={(e) =>
                      setBranding({ ...branding, hotelName: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Monogram (2 Letters)</Label>
                  <Input
                    maxLength={3}
                    value={branding.monogram || ''}
                    onChange={(e) =>
                      setBranding({
                        ...branding,
                        monogram: e.target.value.toUpperCase(),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={branding.city || ''}
                    onChange={(e) => setBranding({ ...branding, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Brand Accent Colour</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={branding.primaryColor || '#2563eb'}
                      onChange={(e) =>
                        setBranding({ ...branding, primaryColor: e.target.value })
                      }
                      className="w-12 h-10 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={branding.primaryColor || '#2563eb'}
                      onChange={(e) =>
                        setBranding({ ...branding, primaryColor: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Hotel Address (Used for Local Guide Maps searches)</Label>
                <Input
                  value={branding.address || ''}
                  onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Logo URL (Optional — overrides Monogram)</Label>
                <Input
                  value={branding.logoUrl || ''}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Welcome Message on Guest Home Screen</Label>
                <textarea
                  rows={3}
                  value={branding.welcomeMessage || ''}
                  onChange={(e) =>
                    setBranding({ ...branding, welcomeMessage: e.target.value })
                  }
                  className="w-full mt-1 rounded-xl border border-gray-300 p-3 text-sm"
                />
              </div>

              <Button
                disabled={saving}
                onClick={() => handleSaveSection('branding', branding)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl gap-2"
              >
                <Save className="w-4 h-4" /> Save Branding
              </Button>
            </div>
          )}

          {/* TAB: DEPARTMENTS & SHIFT ROUTING */}
          {activeSubTab === 'departments' && (
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Departments &amp; Shift Call Routing
                </h3>
                <p className="text-xs text-gray-500">
                  Configure room-phone extensions and either a fixed phone number or shift-based numbers.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {['front_desk', 'restaurant', 'housekeeping', 'emergency'].map(
                  (deptKey) => {
                    const dept = departments[deptKey] || {
                      id: deptKey,
                      name: deptKey.replace('_', ' '),
                      extension: '',
                      routingMode: 'fixed',
                      fixedPhone: '',
                      fallbackPhone: '',
                      shifts: [],
                    }
                    const updateDept = (patch: any) => {
                      setDepartments({
                        ...departments,
                        [deptKey]: { ...dept, ...patch },
                      })
                    }

                    return (
                      <div
                        key={deptKey}
                        className="p-5 rounded-2xl border bg-gray-50/60 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-sm uppercase tracking-wider text-blue-600">
                            {dept.name}
                          </h4>
                          <select
                            value={dept.routingMode || 'fixed'}
                            onChange={(e) =>
                              updateDept({ routingMode: e.target.value })
                            }
                            className="text-xs font-bold border rounded-lg px-2.5 py-1 bg-white"
                          >
                            <option value="fixed">Fixed Number</option>
                            <option value="shift">Set by Shift</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Room Extension</Label>
                            <Input
                              value={dept.extension || ''}
                              onChange={(e) =>
                                updateDept({ extension: e.target.value })
                              }
                              placeholder="e.g. 9"
                              className="h-9 text-xs mt-1 bg-white"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              {dept.routingMode === 'shift'
                                ? 'Fallback Phone'
                                : 'Phone Number'}
                            </Label>
                            <Input
                              value={
                                dept.routingMode === 'shift'
                                  ? dept.fallbackPhone || ''
                                  : dept.fixedPhone || ''
                              }
                              onChange={(e) =>
                                dept.routingMode === 'shift'
                                  ? updateDept({ fallbackPhone: e.target.value })
                                  : updateDept({
                                      fixedPhone: e.target.value,
                                      fallbackPhone: e.target.value,
                                    })
                              }
                              placeholder="10-digit number"
                              className="h-9 text-xs mt-1 bg-white"
                            />
                          </div>
                        </div>

                        {dept.routingMode === 'shift' && (
                          <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black uppercase text-gray-500">
                                Shift Windows (Can cross midnight)
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDept({
                                    shifts: [
                                      ...(dept.shifts || []),
                                      {
                                        id: `sh_${Date.now()}`,
                                        label: 'Shift',
                                        start: '08:00',
                                        end: '20:00',
                                        phone: '',
                                      },
                                    ],
                                  })
                                }
                                className="text-xs font-bold text-blue-600"
                              >
                                + Add Shift
                              </button>
                            </div>
                            {(dept.shifts || []).map((sh: any, idx: number) => (
                              <div
                                key={sh.id || idx}
                                className="grid grid-cols-12 gap-1.5 items-center"
                              >
                                <input
                                  type="time"
                                  value={sh.start}
                                  onChange={(e) => {
                                    const next = [...dept.shifts]
                                    next[idx] = { ...sh, start: e.target.value }
                                    updateDept({ shifts: next })
                                  }}
                                  className="col-span-3 border rounded-lg p-1.5 text-xs bg-white"
                                />
                                <input
                                  type="time"
                                  value={sh.end}
                                  onChange={(e) => {
                                    const next = [...dept.shifts]
                                    next[idx] = { ...sh, end: e.target.value }
                                    updateDept({ shifts: next })
                                  }}
                                  className="col-span-3 border rounded-lg p-1.5 text-xs bg-white"
                                />
                                <input
                                  type="tel"
                                  placeholder="Shift phone"
                                  value={sh.phone}
                                  onChange={(e) => {
                                    const next = [...dept.shifts]
                                    next[idx] = { ...sh, phone: e.target.value }
                                    updateDept({ shifts: next })
                                  }}
                                  className="col-span-5 border rounded-lg p-1.5 text-xs bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = dept.shifts.filter(
                                      (_: any, i: number) => i !== idx
                                    )
                                    updateDept({ shifts: next })
                                  }}
                                  className="col-span-1 text-red-500 text-xs font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }
                )}
              </div>

              <Button
                disabled={saving}
                onClick={() => handleSaveSection('departments', departments)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl gap-2"
              >
                <Save className="w-4 h-4" /> Save Departments
              </Button>
            </div>
          )}

          {/* TAB: HOUSE & WI-FI + POLICIES */}
          {activeSubTab === 'house_info' && (
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-6 max-w-3xl">
              <h3 className="text-lg font-black text-gray-900">
                House Info, Wi-Fi, Timings &amp; Policies
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Wi-Fi Network Name (SSID)</Label>
                  <Input
                    value={houseInfo.wifiName || ''}
                    onChange={(e) =>
                      setHouseInfo({ ...houseInfo, wifiName: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Wi-Fi Password</Label>
                  <Input
                    value={houseInfo.wifiPassword || ''}
                    onChange={(e) =>
                      setHouseInfo({ ...houseInfo, wifiPassword: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Check-in Time</Label>
                  <Input
                    value={houseInfo.checkinTime || ''}
                    onChange={(e) =>
                      setHouseInfo({ ...houseInfo, checkinTime: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Check-out Time</Label>
                  <Input
                    value={houseInfo.checkoutTime || ''}
                    onChange={(e) =>
                      setHouseInfo({ ...houseInfo, checkoutTime: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Breakfast Start</Label>
                  <Input
                    value={houseInfo.breakfastStart || ''}
                    onChange={(e) =>
                      setHouseInfo({ ...houseInfo, breakfastStart: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Breakfast End</Label>
                  <Input
                    value={houseInfo.breakfastEnd || ''}
                    onChange={(e) =>
                      setHouseInfo({ ...houseInfo, breakfastEnd: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2 p-4 rounded-2xl border border-blue-100 bg-blue-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Restaurant Ordering Availability
                      </p>
                      <p className="text-xs text-gray-500">
                        Choose whether guests can order food 24×7 or only between specific opening &amp; closing hours.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border">
                      <button
                        type="button"
                        onClick={() =>
                          setHouseInfo({ ...houseInfo, restaurantAlwaysOpen: true })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                          houseInfo.restaurantAlwaysOpen !== false
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Open 24×7 (Always Open)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHouseInfo({ ...houseInfo, restaurantAlwaysOpen: false })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                          houseInfo.restaurantAlwaysOpen === false
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Scheduled Hours
                      </button>
                    </div>
                  </div>

                  {houseInfo.restaurantAlwaysOpen === false && (
                    <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-blue-100">
                      <div>
                        <Label>Restaurant Opening Time (24h HH:mm)</Label>
                        <Input
                          type="time"
                          value={houseInfo.restaurantOpen || '07:30'}
                          onChange={(e) =>
                            setHouseInfo({ ...houseInfo, restaurantOpen: e.target.value })
                          }
                          className="mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <Label>Restaurant Closing Time (24h HH:mm)</Label>
                        <Input
                          type="time"
                          value={houseInfo.restaurantClose || '22:30'}
                          onChange={(e) =>
                            setHouseInfo({ ...houseInfo, restaurantClose: e.target.value })
                          }
                          className="mt-1 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>House Policies (One rule per line)</Label>
                <textarea
                  rows={5}
                  value={policiesText}
                  onChange={(e) => setPoliciesText(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-gray-300 p-3 text-xs font-medium"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  disabled={saving}
                  onClick={async () => {
                    await handleSaveSection('house_info', houseInfo)
                    await handleSaveSection(
                      'policies',
                      policiesText
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl gap-2"
                >
                  <Save className="w-4 h-4" /> Save House Info &amp; Policies
                </Button>
              </div>
            </div>
          )}

          {/* TAB: SERVICES & ROUTING */}
          {activeSubTab === 'services' && (
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Guest Services &amp; Department Routing
                </h3>
                <p className="text-xs text-gray-500">
                  Switch each service on or off and choose which department receives its requests.
                </p>
              </div>

              <div className="space-y-3">
                {(
                  [
                    'restaurant',
                    'housekeeping',
                    'minibar',
                    'spa',
                    'laundry',
                    'taxi',
                    'special_occasions',
                  ] as ServiceId[]
                ).map((srvKey) => {
                  const conf = services[srvKey] || {
                    enabled: true,
                    department: 'front_desk',
                    label: srvKey.replace('_', ' '),
                    description: '',
                  }
                  return (
                    <div
                      key={srvKey}
                      className="p-4 rounded-2xl border bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={conf.enabled !== false}
                          onChange={(e) =>
                            setServices({
                              ...services,
                              [srvKey]: { ...conf, enabled: e.target.checked },
                            })
                          }
                          className="w-5 h-5 rounded accent-blue-600"
                        />
                        <div>
                          <p className="font-black text-sm capitalize">
                            {srvKey.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500">{conf.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">
                          Routes to:
                        </span>
                        <select
                          value={conf.department || 'front_desk'}
                          onChange={(e) =>
                            setServices({
                              ...services,
                              [srvKey]: { ...conf, department: e.target.value },
                            })
                          }
                          className="border rounded-xl px-3 py-2 text-xs font-bold bg-white"
                        >
                          <option value="front_desk">Front Desk</option>
                          <option value="restaurant">Restaurant</option>
                          <option value="housekeeping">Housekeeping</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>

              <Button
                disabled={saving}
                onClick={() => handleSaveSection('services', services)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl gap-2"
              >
                <Save className="w-4 h-4" /> Save Services Routing
              </Button>
            </div>
          )}

          {/* TAB: MENU */}
          {activeSubTab === 'menu' && (
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
              {/* Restaurant Operating Hours & 24x7 Setting Box */}
              <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h4 className="font-black text-sm text-gray-900">
                        Restaurant Timings &amp; Order Availability
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          houseInfo.restaurantAlwaysOpen !== false
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {houseInfo.restaurantAlwaysOpen !== false
                          ? 'Open 24×7 (Never Closes)'
                          : `Scheduled (${houseInfo.restaurantOpen || '07:30'} – ${houseInfo.restaurantClose || '22:30'})`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Control when guests can place food orders from their room QR so the restaurant never unexpectedly shows closed.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border">
                      <button
                        type="button"
                        onClick={() =>
                          setHouseInfo({ ...houseInfo, restaurantAlwaysOpen: true })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                          houseInfo.restaurantAlwaysOpen !== false
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Open 24×7 (Always Open)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHouseInfo({ ...houseInfo, restaurantAlwaysOpen: false })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                          houseInfo.restaurantAlwaysOpen === false
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Set Opening &amp; Closing Hours
                      </button>
                    </div>

                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={() => handleSaveSection('house_info', houseInfo)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl gap-1.5 h-9"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Timings
                    </Button>
                  </div>
                </div>

                {houseInfo.restaurantAlwaysOpen === false && (
                  <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-blue-200/70">
                    <div>
                      <Label className="text-xs font-bold text-gray-700">
                        Opening Time (24-Hour Format, e.g. 07:30)
                      </Label>
                      <Input
                        type="time"
                        value={houseInfo.restaurantOpen || '07:30'}
                        onChange={(e) =>
                          setHouseInfo({ ...houseInfo, restaurantOpen: e.target.value })
                        }
                        className="mt-1 bg-white font-bold text-xs h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-gray-700">
                        Closing Time (24-Hour Format — supports past midnight, e.g. 23:30 or 02:00)
                      </Label>
                      <Input
                        type="time"
                        value={houseInfo.restaurantClose || '22:30'}
                        onChange={(e) =>
                          setHouseInfo({ ...houseInfo, restaurantClose: e.target.value })
                        }
                        className="mt-1 bg-white font-bold text-xs h-9"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Restaurant Menu</h3>
                  <p className="text-xs text-gray-500">
                    Categories and dishes with price, veg/non-veg flag, and availability toggle.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setMenu([
                      ...menu,
                      {
                        id: `cat_${Date.now()}`,
                        name: 'New Category',
                        items: [],
                      },
                    ])
                  }
                  className="rounded-xl text-xs font-bold"
                >
                  + Add Category
                </Button>
              </div>

              <div className="space-y-6">
                {menu.map((cat, cIdx) => (
                  <div
                    key={cat.id || cIdx}
                    className="p-5 rounded-2xl border bg-gray-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={cat.name}
                        onChange={(e) => {
                          const next = [...menu]
                          next[cIdx] = { ...cat, name: e.target.value }
                          setMenu(next)
                        }}
                        className="font-black text-sm max-w-xs bg-white"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const next = [...menu]
                            next[cIdx] = {
                              ...cat,
                              items: [
                                ...(cat.items || []),
                                {
                                  id: `m_${Date.now()}`,
                                  name: '',
                                  price: 150,
                                  isVeg: true,
                                  available: true,
                                },
                              ],
                            }
                            setMenu(next)
                          }}
                          className="text-xs font-bold rounded-xl"
                        >
                          + Add Dish
                        </Button>
                        <button
                          onClick={() =>
                            setMenu(menu.filter((_, idx) => idx !== cIdx))
                          }
                          className="text-red-500 text-xs font-bold px-2"
                        >
                          Delete Category
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(cat.items || []).map((item: any, iIdx: number) => (
                        <div
                          key={item.id || iIdx}
                          className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border"
                        >
                          <Input
                            placeholder="Dish name"
                            value={item.name}
                            onChange={(e) => {
                              const next = [...menu]
                              const items = [...cat.items]
                              items[iIdx] = { ...item, name: e.target.value }
                              next[cIdx] = { ...cat, items }
                              setMenu(next)
                            }}
                            className="col-span-5 h-9 text-xs font-bold"
                          />
                          <Input
                            type="number"
                            placeholder="Price ₹"
                            value={item.price}
                            onChange={(e) => {
                              const next = [...menu]
                              const items = [...cat.items]
                              items[iIdx] = {
                                ...item,
                                price: Number(e.target.value || 0),
                              }
                              next[cIdx] = { ...cat, items }
                              setMenu(next)
                            }}
                            className="col-span-2 h-9 text-xs font-bold"
                          />
                          <select
                            value={item.isVeg ? 'veg' : 'nonveg'}
                            onChange={(e) => {
                              const next = [...menu]
                              const items = [...cat.items]
                              items[iIdx] = {
                                ...item,
                                isVeg: e.target.value === 'veg',
                              }
                              next[cIdx] = { ...cat, items }
                              setMenu(next)
                            }}
                            className="col-span-2 border rounded-lg h-9 text-xs font-bold px-2"
                          >
                            <option value="veg">🟢 Veg</option>
                            <option value="nonveg">🔴 Non-Veg</option>
                          </select>
                          <label className="col-span-2 flex items-center gap-1.5 text-xs font-bold">
                            <input
                              type="checkbox"
                              checked={item.available !== false}
                              onChange={(e) => {
                                const next = [...menu]
                                const items = [...cat.items]
                                items[iIdx] = {
                                  ...item,
                                  available: e.target.checked,
                                }
                                next[cIdx] = { ...cat, items }
                                setMenu(next)
                              }}
                            />
                            Available
                          </label>
                          <button
                            onClick={() => {
                              const next = [...menu]
                              next[cIdx] = {
                                ...cat,
                                items: cat.items.filter(
                                  (_: any, idx: number) => idx !== iIdx
                                ),
                              }
                              setMenu(next)
                            }}
                            className="col-span-1 text-red-500 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                disabled={saving}
                onClick={() => handleSaveSection('menu', menu)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl gap-2"
              >
                <Save className="w-4 h-4" /> Save Menu
              </Button>
            </div>
          )}

          {/* TAB: REQUEST ITEMS (HOUSEKEEPING, MINIBAR, LAUNDRY, SPA) */}
          {activeSubTab === 'request_items' && (
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-gray-900">
                Service Request Items Catalog
              </h3>

              {/* Mini Bar */}
              <div className="p-4 rounded-2xl border bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm">Mini Bar Items (Priced)</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRequestItems({
                        ...requestItems,
                        minibar: [
                          ...(requestItems.minibar || []),
                          { id: `mb_${Date.now()}`, name: '', price: 50 },
                        ],
                      })
                    }
                    className="text-xs font-bold rounded-xl"
                  >
                    + Add Mini Bar Item
                  </Button>
                </div>
                {(requestItems.minibar || []).map((it: any, idx: number) => (
                  <div key={it.id || idx} className="flex gap-2 items-center">
                    <Input
                      value={it.name}
                      onChange={(e) => {
                        const list = [...(requestItems.minibar || [])]
                        list[idx] = { ...it, name: e.target.value }
                        setRequestItems({ ...requestItems, minibar: list })
                      }}
                      placeholder="Item name"
                      className="h-9 text-xs font-bold bg-white"
                    />
                    <Input
                      type="number"
                      value={it.price}
                      onChange={(e) => {
                        const list = [...(requestItems.minibar || [])]
                        list[idx] = { ...it, price: Number(e.target.value || 0) }
                        setRequestItems({ ...requestItems, minibar: list })
                      }}
                      placeholder="Price ₹"
                      className="w-28 h-9 text-xs font-bold bg-white"
                    />
                    <button
                      onClick={() => {
                        const list = (requestItems.minibar || []).filter(
                          (_: any, i: number) => i !== idx
                        )
                        setRequestItems({ ...requestItems, minibar: list })
                      }}
                      className="text-red-500 text-xs font-bold px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Laundry */}
              <div className="p-4 rounded-2xl border bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm">Laundry Items (Priced)</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRequestItems({
                        ...requestItems,
                        laundry: [
                          ...(requestItems.laundry || []),
                          { id: `ld_${Date.now()}`, name: '', price: 60 },
                        ],
                      })
                    }
                    className="text-xs font-bold rounded-xl"
                  >
                    + Add Laundry Item
                  </Button>
                </div>
                {(requestItems.laundry || []).map((it: any, idx: number) => (
                  <div key={it.id || idx} className="flex gap-2 items-center">
                    <Input
                      value={it.name}
                      onChange={(e) => {
                        const list = [...(requestItems.laundry || [])]
                        list[idx] = { ...it, name: e.target.value }
                        setRequestItems({ ...requestItems, laundry: list })
                      }}
                      placeholder="Item name"
                      className="h-9 text-xs font-bold bg-white"
                    />
                    <Input
                      type="number"
                      value={it.price}
                      onChange={(e) => {
                        const list = [...(requestItems.laundry || [])]
                        list[idx] = { ...it, price: Number(e.target.value || 0) }
                        setRequestItems({ ...requestItems, laundry: list })
                      }}
                      placeholder="Price ₹"
                      className="w-28 h-9 text-xs font-bold bg-white"
                    />
                    <button
                      onClick={() => {
                        const list = (requestItems.laundry || []).filter(
                          (_: any, i: number) => i !== idx
                        )
                        setRequestItems({ ...requestItems, laundry: list })
                      }}
                      className="text-red-500 text-xs font-bold px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Spa Treatments */}
              <div className="p-4 rounded-2xl border bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm">Spa Treatments</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRequestItems({
                        ...requestItems,
                        spa: [
                          ...(requestItems.spa || []),
                          {
                            id: `sp_${Date.now()}`,
                            name: '',
                            duration: '60 mins',
                            price: 1500,
                          },
                        ],
                      })
                    }
                    className="text-xs font-bold rounded-xl"
                  >
                    + Add Spa Treatment
                  </Button>
                </div>
                {(requestItems.spa || []).map((it: any, idx: number) => (
                  <div key={it.id || idx} className="flex gap-2 items-center">
                    <Input
                      value={it.name}
                      onChange={(e) => {
                        const list = [...(requestItems.spa || [])]
                        list[idx] = { ...it, name: e.target.value }
                        setRequestItems({ ...requestItems, spa: list })
                      }}
                      placeholder="Treatment name"
                      className="h-9 text-xs font-bold bg-white"
                    />
                    <Input
                      value={it.duration}
                      onChange={(e) => {
                        const list = [...(requestItems.spa || [])]
                        list[idx] = { ...it, duration: e.target.value }
                        setRequestItems({ ...requestItems, spa: list })
                      }}
                      placeholder="Duration"
                      className="w-28 h-9 text-xs font-bold bg-white"
                    />
                    <Input
                      type="number"
                      value={it.price}
                      onChange={(e) => {
                        const list = [...(requestItems.spa || [])]
                        list[idx] = { ...it, price: Number(e.target.value || 0) }
                        setRequestItems({ ...requestItems, spa: list })
                      }}
                      placeholder="Price ₹"
                      className="w-28 h-9 text-xs font-bold bg-white"
                    />
                    <button
                      onClick={() => {
                        const list = (requestItems.spa || []).filter(
                          (_: any, i: number) => i !== idx
                        )
                        setRequestItems({ ...requestItems, spa: list })
                      }}
                      className="text-red-500 text-xs font-bold px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <Button
                disabled={saving}
                onClick={() => handleSaveSection('request_items', requestItems)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl gap-2"
              >
                <Save className="w-4 h-4" /> Save Request Items
              </Button>
            </div>
          )}

          {/* TAB: LOCAL GUIDE */}
          {activeSubTab === 'local_guide' && (
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Local Guide Places</h3>
                  <p className="text-xs text-gray-500">
                    Places with a category, a name, and one line of description.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setLocalGuide([
                      ...localGuide,
                      {
                        id: `lg_${Date.now()}`,
                        category: 'Sights & Beaches',
                        name: '',
                        description: '',
                      },
                    ])
                  }
                  className="text-xs font-bold rounded-xl"
                >
                  + Add Place
                </Button>
              </div>

              <div className="space-y-2.5">
                {localGuide.map((pl, idx) => (
                  <div
                    key={pl.id || idx}
                    className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-2xl border"
                  >
                    <select
                      value={pl.category}
                      onChange={(e) => {
                        const next = [...localGuide]
                        next[idx] = { ...pl, category: e.target.value }
                        setLocalGuide(next)
                      }}
                      className="col-span-3 border rounded-xl h-9 px-2 text-xs font-bold bg-white"
                    >
                      <option value="Food & Cafes">Food &amp; Cafes</option>
                      <option value="Sights & Beaches">Sights &amp; Beaches</option>
                      <option value="Shopping & Markets">Shopping &amp; Markets</option>
                      <option value="ATMs & Pharmacy">ATMs &amp; Pharmacy</option>
                    </select>
                    <Input
                      placeholder="Place Name"
                      value={pl.name}
                      onChange={(e) => {
                        const next = [...localGuide]
                        next[idx] = { ...pl, name: e.target.value }
                        setLocalGuide(next)
                      }}
                      className="col-span-4 h-9 text-xs font-bold bg-white"
                    />
                    <Input
                      placeholder="One-line description"
                      value={pl.description}
                      onChange={(e) => {
                        const next = [...localGuide]
                        next[idx] = { ...pl, description: e.target.value }
                        setLocalGuide(next)
                      }}
                      className="col-span-4 h-9 text-xs bg-white"
                    />
                    <button
                      onClick={() =>
                        setLocalGuide(localGuide.filter((_, i) => i !== idx))
                      }
                      className="col-span-1 text-red-500 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <Button
                disabled={saving}
                onClick={() => handleSaveSection('local_guide', localGuide)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl gap-2"
              >
                <Save className="w-4 h-4" /> Save Local Guide
              </Button>
            </div>
          )}

          {/* TAB: STAFF LOGINS */}
          {activeSubTab === 'staff' && (
            <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Hotel Staff Logins
                </h3>
                <p className="text-xs text-gray-500">
                  Create logins for Reception, Housekeeping, Restaurant, or Kitchen staff. Staff sign in at{' '}
                  <Link href="/staff" className="text-blue-600 font-bold underline">
                    /staff
                  </Link>
                  .
                </p>
              </div>

              {/* Add Staff Form */}
              <div className="p-5 rounded-2xl border bg-gray-50/70 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Create New Staff Login
                </h4>
                <div className="grid sm:grid-cols-4 gap-3">
                  <Input
                    placeholder="Staff Name (e.g. Suresh)"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="bg-white text-xs font-bold"
                  />
                  <Input
                    placeholder="Login ID (e.g. suresh_hk)"
                    value={staffLoginId}
                    onChange={(e) => setStaffLoginId(e.target.value)}
                    className="bg-white text-xs font-bold"
                  />
                  <Input
                    type="password"
                    placeholder="Password (min 4 chars)"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="bg-white text-xs font-bold"
                  />
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as any)}
                    className="border rounded-xl px-3 text-xs font-bold bg-white h-10"
                  >
                    <option value="staff">Department Staff</option>
                    <option value="manager">Reception / Manager</option>
                    <option value="admin">Hotel Admin</option>
                    <option value="kitchen">Kitchen (Phase 3)</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                    <span className="text-gray-500">Departments:</span>
                    {['front_desk', 'restaurant', 'housekeeping', 'emergency'].map(
                      (d) => (
                        <label key={d} className="flex items-center gap-1.5 capitalize">
                          <input
                            type="checkbox"
                            checked={staffDepts.includes(d)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setStaffDepts([...staffDepts, d])
                              } else {
                                setStaffDepts(staffDepts.filter((x) => x !== d))
                              }
                            }}
                          />
                          {d.replace('_', ' ')}
                        </label>
                      )
                    )}
                  </div>

                  <Button
                    onClick={async () => {
                      const res = await saveHubStaffUserAction({
                        propertyId: selectedPropertyId,
                        name: staffName,
                        loginId: staffLoginId,
                        password: staffPassword,
                        role: staffRole,
                        departments: staffDepts,
                      })
                      if (res.error) {
                        alert(res.error)
                      } else {
                        setStaffName('')
                        setStaffLoginId('')
                        setStaffPassword('')
                        triggerToast('Staff login created!')
                        loadPropertyBundle(selectedPropertyId)
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl"
                  >
                    + Create Staff Login
                  </Button>
                </div>
              </div>

              {/* Staff List */}
              <div className="space-y-2.5">
                {(bundle?.staffUsers || []).map((su: any) => (
                  <div
                    key={su.id}
                    className="p-4 rounded-2xl border flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{su.name}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold">
                          ID: {su.login_id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-black uppercase">
                          {su.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 capitalize">
                        Departments: {(su.departments || []).join(', ').replace(/_/g, ' ')}
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        if (confirm(`Remove staff login "${su.login_id}"?`)) {
                          await deleteHubStaffUserAction(selectedPropertyId, su.id)
                          loadPropertyBundle(selectedPropertyId)
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* UPGRADE / RENEW ROOMS MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">Add Rooms / Extend Guest Hub</h3>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-gray-700 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Guest Hub is billed at <strong>₹20 / room / month</strong>. Choose your total room count and duration below:
            </p>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold">Total Rooms</Label>
                <Input
                  type="number"
                  min={1}
                  value={roomsToBuy}
                  onChange={(e) =>
                    setRoomsToBuy(Math.max(1, parseInt(e.target.value || '1', 10)))
                  }
                  className="mt-1 font-black"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Months</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonthsToBuy(m)}
                      className={`py-2 rounded-xl text-xs font-black border ${
                        monthsToBuy === m
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {m} Mo
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">Amount Payable</span>
              <span className="text-xl font-black text-blue-700">
                ₹{roomsToBuy * 20 * monthsToBuy}
              </span>
            </div>

            <Button
              onClick={handleSubscribeGuestHub}
              disabled={payingSub}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl"
            >
              {payingSub ? 'Processing...' : `Pay ₹${roomsToBuy * 20 * monthsToBuy}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
