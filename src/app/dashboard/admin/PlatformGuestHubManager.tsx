'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  QrCode,
  Plus,
  PauseCircle,
  PlayCircle,
  Trash2,
  ExternalLink,
  Settings,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import {
  getPlatformGuestHubOverview,
  adminOnboardHotelAction,
  adminUpdateHotelHubStatus,
  adminSavePlatformSettings,
} from '@/app/actions/guest-hub'
import type { ServiceId } from '@/lib/guest-hub/starter'

const ALL_SERVICES: { id: ServiceId; label: string }[] = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'housekeeping', label: 'Housekeeping' },
  { id: 'minibar', label: 'Mini Bar' },
  { id: 'spa', label: 'Spa' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'taxi', label: 'Taxi' },
  { id: 'special_occasions', label: 'Special Occasions' },
]

export default function PlatformGuestHubManager() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'hotels' | 'onboard' | 'settings'>('hotels')

  // Onboard form state
  const [existingPropertyId, setExistingPropertyId] = useState('')
  const [hotelName, setHotelName] = useState('')
  const [city, setCity] = useState('Alibag')
  const [address, setAddress] = useState('')
  const [numRooms, setNumRooms] = useState(12)
  const [countryCode, setCountryCode] = useState('91')
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [enabledServices, setEnabledServices] = useState<Record<ServiceId, boolean>>({
    restaurant: true,
    housekeeping: true,
    minibar: true,
    spa: true,
    laundry: true,
    taxi: true,
    special_occasions: true,
  })
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminLoginId, setAdminLoginId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [onboarding, setOnboarding] = useState(false)

  // Platform settings state
  const [productName, setProductName] = useState('Guest Hub')
  const [pricePerRoom, setPricePerRoom] = useState(20)
  const [savingSettings, setSavingSettings] = useState(false)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    const res = await getPlatformGuestHubOverview()
    if (!res.error) {
      setData(res)
      if (res.platformSettings) {
        setProductName(res.platformSettings.product_name || 'Guest Hub')
        setPricePerRoom(Number(res.platformSettings.price_per_room_monthly || 20))
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const prefillMadhureelaPilot = () => {
    setExistingPropertyId('')
    setHotelName('Madhureela Holiday Home')
    setCity('Alibag')
    setAddress('Madhureela Holiday Home, Alibag, Maharashtra')
    setNumRooms(12)
    setCountryCode('91')
    setPrimaryColor('#0f766e')
    setAdminName('Madhureela Admin')
    setAdminEmail('madhureela@fixystays.com')
    setAdminLoginId('madhureela_admin')
    setAdminPassword('madhureela2026')
  }

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hotelName.trim() || !adminLoginId.trim() || !adminPassword.trim()) {
      alert('Hotel name, Admin Login ID, and Password are required.')
      return
    }
    setOnboarding(true)
    const res = await adminOnboardHotelAction({
      existingPropertyId: existingPropertyId || undefined,
      hotelName,
      city,
      address: address || `${hotelName}, ${city}`,
      numRooms,
      countryCode,
      primaryColor,
      enabledServices,
      adminName: adminName || `${hotelName} Admin`,
      adminEmail: adminEmail || `${adminLoginId}@fixystays.com`,
      adminLoginId,
      adminPassword,
      monthsGranted: 12,
    })
    setOnboarding(false)

    if (res.error) {
      alert(res.error)
    } else {
      alert(`${hotelName} onboarded with starter content and ${numRooms} room QRs!`)
      setTab('hotels')
      loadOverview()
    }
  }

  const hubSettingsList = data?.hubSettings || []
  const propertiesMap = new Map<string, any>(
    (data?.properties || []).map((p: any) => [p.id, p])
  )

  return (
    <div className="bg-white rounded-3xl border border-blue-100 p-6 md:p-8 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-gray-900">
                {productName} · Platform Back End
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
                ₹{pricePerRoom}/room/mo
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Onboard hotels, pause/resume access, open any hotel&apos;s back end, and manage subscriptions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('hotels')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${
              tab === 'hotels'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Hotels ({hubSettingsList.length})
          </button>
          <button
            onClick={() => setTab('onboard')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 transition ${
              tab === 'onboard'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Onboard a Hotel
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 transition ${
              tab === 'settings'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm font-bold text-gray-400">
          Loading Guest Hub platform data...
        </div>
      ) : (
        <>
          {/* TAB 1: HOTELS LIST */}
          {tab === 'hotels' && (
            <div className="space-y-4">
              {hubSettingsList.length === 0 ? (
                <div className="p-10 rounded-2xl bg-gray-50 border border-dashed text-center space-y-3">
                  <Building2 className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="font-black text-gray-800">
                    No hotels onboarded to {productName} yet
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button
                      onClick={() => {
                        prefillMadhureelaPilot()
                        setTab('onboard')
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" /> Onboard Madhureela Holiday Home (Pilot)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {hubSettingsList
                    .filter((h: any) => h.hub_status !== 'removed')
                    .map((hub: any) => {
                      const prop = propertiesMap.get(hub.property_id)
                      const roomCount = (data?.rooms || []).filter(
                        (r: any) => r.property_id === hub.property_id
                      ).length
                      const reqCount = (data?.requests || []).filter(
                        (r: any) => r.property_id === hub.property_id
                      ).length
                      const isPaused = hub.hub_status === 'paused'

                      return (
                        <div
                          key={hub.id}
                          className="p-5 rounded-2xl border bg-gray-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center"
                                style={{
                                  backgroundColor:
                                    hub.branding?.primaryColor || '#2563eb',
                                }}
                              >
                                {hub.branding?.monogram || 'GH'}
                              </span>
                              <h3 className="font-black text-base text-gray-900">
                                {hub.branding?.hotelName || prop?.name || 'Hotel'}
                              </h3>
                              <span className="px-2 py-0.5 rounded bg-white border font-mono text-[11px] text-gray-600">
                                {hub.slug}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isPaused
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {hub.hub_status}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  hub.subscription_status === 'active'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                Sub: {hub.subscription_status}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 font-medium">
                              City: <strong>{hub.branding?.city || prop?.city || '—'}</strong> ·
                              Rooms: <strong>{roomCount} / {hub.paid_rooms_limit} paid</strong> ·
                              Total Requests: <strong>{reqCount}</strong>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/owner?tab=guest-hub&propertyId=${hub.property_id}`}
                              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Open Back End
                            </Link>

                            <Link
                              href={`/staff?propertyId=${hub.property_id}`}
                              target="_blank"
                              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center gap-1.5"
                            >
                              Staff Screen
                            </Link>

                            {isPaused ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  await adminUpdateHotelHubStatus({
                                    propertyId: hub.property_id,
                                    hubStatus: 'active',
                                  })
                                  loadOverview()
                                }}
                                className="rounded-xl text-xs font-bold text-emerald-700 border-emerald-200 gap-1"
                              >
                                <PlayCircle className="w-3.5 h-3.5" /> Resume
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  await adminUpdateHotelHubStatus({
                                    propertyId: hub.property_id,
                                    hubStatus: 'paused',
                                  })
                                  loadOverview()
                                }}
                                className="rounded-xl text-xs font-bold text-amber-700 border-amber-200 gap-1"
                              >
                                <PauseCircle className="w-3.5 h-3.5" /> Pause
                              </Button>
                            )}

                            <button
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Remove ${hub.branding?.hotelName || 'this hotel'} from active Guest Hub list?`
                                  )
                                ) {
                                  await adminUpdateHotelHubStatus({
                                    propertyId: hub.property_id,
                                    hubStatus: 'removed',
                                  })
                                  loadOverview()
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Remove Hotel"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ONBOARD A HOTEL */}
          {tab === 'onboard' && (
            <form onSubmit={handleOnboardSubmit} className="space-y-5 max-w-3xl">
              <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                <div>
                  <p className="text-xs font-black text-blue-950">
                    Pilot Quick-Fill Available
                  </p>
                  <p className="text-[11px] text-blue-700">
                    Click to pre-populate the onboarding form for Madhureela Holiday Home
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={prefillMadhureelaPilot}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Fill Madhureela Holiday Home
                </Button>
              </div>

              <div>
                <Label className="text-xs font-bold">
                  Link to Existing FixyStays Property (Optional — leave blank to create a new standalone hotel)
                </Label>
                <select
                  value={existingPropertyId}
                  onChange={(e) => {
                    const pid = e.target.value
                    setExistingPropertyId(pid)
                    const p = propertiesMap.get(pid)
                    if (p) {
                      setHotelName(p.name || '')
                      setCity(p.city_area || p.city || 'Alibag')
                    }
                  }}
                  className="w-full h-10 mt-1 rounded-xl border border-gray-300 px-3 text-xs font-bold bg-white"
                >
                  <option value="">+ Create Brand New Hotel Property</option>
                  {(data?.properties || []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city_area || p.city || 'No city'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-bold">Hotel Name *</Label>
                  <Input
                    required
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    placeholder="Madhureela Holiday Home"
                    className="mt-1 font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">City *</Label>
                  <Input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Alibag"
                    className="mt-1 font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Number of Rooms *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={numRooms}
                    onChange={(e) =>
                      setNumRooms(Math.max(1, parseInt(e.target.value || '1', 10)))
                    }
                    className="mt-1 font-black"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <Label className="text-xs font-bold">Country Code</Label>
                  <Input
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    placeholder="91"
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs font-bold">Brand Colour</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs font-bold">Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold block mb-2">
                  Services to Switch On
                </Label>
                <div className="flex flex-wrap gap-3">
                  {ALL_SERVICES.map((srv) => (
                    <label
                      key={srv.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-gray-50 text-xs font-bold cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={enabledServices[srv.id] !== false}
                        onChange={(e) =>
                          setEnabledServices({
                            ...enabledServices,
                            [srv.id]: e.target.checked,
                          })
                        }
                      />
                      {srv.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Hotel Admin Credentials
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Admin Name *</Label>
                    <Input
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Hotel Manager Name"
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Admin Owner Email</Label>
                    <Input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="owner@hotel.com"
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Staff Login ID *</Label>
                    <Input
                      required
                      value={adminLoginId}
                      onChange={(e) => setAdminLoginId(e.target.value)}
                      placeholder="madhureela_admin"
                      className="mt-1 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Staff Login Password *</Label>
                    <Input
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Password"
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={onboarding}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl px-8 h-11"
              >
                {onboarding
                  ? 'Onboarding Hotel...'
                  : 'Create Hotel with Starter Content & Room QRs'}
              </Button>
            </form>
          )}

          {/* TAB 3: PLATFORM SETTINGS */}
          {tab === 'settings' && (
            <div className="max-w-md space-y-4">
              <div>
                <Label className="text-xs font-bold">Product Name</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="mt-1 font-bold"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">
                  Per-Room Monthly Fee (₹ / room / month)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={pricePerRoom}
                  onChange={(e) => setPricePerRoom(Number(e.target.value || 20))}
                  className="mt-1 font-black"
                />
              </div>
              <Button
                disabled={savingSettings}
                onClick={async () => {
                  setSavingSettings(true)
                  await adminSavePlatformSettings(productName, pricePerRoom)
                  setSavingSettings(false)
                  alert('Platform settings updated!')
                  loadOverview()
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl"
              >
                Save Platform Settings
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
