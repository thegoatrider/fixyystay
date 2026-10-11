'use client'

import React, { useState, useEffect } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  QrCode,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Bell,
  UtensilsCrossed,
  Lock,
  ArrowRight,
} from 'lucide-react'
import {
  createGuestHubOrder,
  verifyGuestHubPayment,
} from '@/app/actions/guest-hub'

export default function StandaloneGuestHubClient() {
  const [hotelName, setHotelName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [roomsCount, setRoomsCount] = useState(10)
  const [monthsCount, setMonthsCount] = useState(3)
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then((res: any) => {
      const user = res?.data?.user
      if (user?.email) {
        setEmail(user.email)
        setAdminName(user.user_metadata?.name || '')
        setIsLoggedIn(true)
      }
    })
  }, [])

  const totalAmount = Math.max(1, roomsCount) * 20 * monthsCount

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hotelName.trim() || !city.trim() || !email.trim()) {
      alert('Please fill in your Hotel Name, City, and Email.')
      return
    }
    if (!isLoggedIn && password.trim().length < 6) {
      alert('Please set a password (minimum 6 characters) for your Hotel Admin login.')
      return
    }

    setLoading(true)
    try {
      const orderRes = await createGuestHubOrder({
        email: email.trim(),
        roomsCount,
        monthsCount,
        hotelName: hotelName.trim(),
        city: city.trim(),
        address: address.trim() || `${hotelName.trim()}, ${city.trim()}`,
        adminName: adminName.trim() || hotelName.trim(),
      })

      if (orderRes.error) {
        alert(orderRes.error)
        setLoading(false)
        return
      }

      const options = {
        key: orderRes.key,
        amount: orderRes.amount,
        currency: 'INR',
        name: 'FixyStays · Guest Hub',
        description: `${hotelName.trim()} (${roomsCount} Rooms × ${monthsCount} Mo)`,
        order_id: orderRes.orderId,
        prefill: {
          email: email.trim(),
          name: adminName.trim(),
        },
        theme: { color: primaryColor },
        handler: async function (response: any) {
          setLoading(true)
          const verifyRes = await verifyGuestHubPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            {
              hotelName: hotelName.trim(),
              city: city.trim(),
              address: address.trim() || `${hotelName.trim()}, ${city.trim()}`,
              adminName: adminName.trim() || 'Hotel Admin',
              password: password.trim() || undefined,
              primaryColor,
            }
          )

          if (verifyRes.error) {
            alert(
              `Payment succeeded, but setup encountered an issue: ${verifyRes.error}. Please contact support.`
            )
          } else {
            window.location.href = `/dashboard/owner?tab=guest-hub&propertyId=${verifyRes.propertyId}`
          }
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      alert(err.message || 'Payment failed to initialize.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-16 px-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="max-w-6xl mx-auto space-y-14">
        {/* Top Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-widest">
            <QrCode className="w-4 h-4" /> Standalone Or Add-On Product
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            In-Room QR <span className="text-blue-500">Guest Hub</span> for Hotels &amp; Villas
          </h1>
          <p className="text-base md:text-lg text-slate-400 leading-relaxed">
            Guests scan the QR in their room and—without installing an app or sharing their phone number—see Wi-Fi, order food, and send housekeeping or reception requests that ring live on your staff screens.
          </p>
        </div>

        {/* Main Grid: Features + Interactive Calculator & Onboarding Form */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left: Product Highlights */}
          <div className="lg:col-span-5 space-y-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-400">
                Transparent Per-Room Rate
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-black">₹20</span>
                <span className="text-slate-400 font-bold text-sm">
                  / room / month
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Available as a standalone service for any hotel or resort—no main marketplace subscription required.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800 text-sm">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">100% Guest Privacy · Zero WhatsApp</p>
                  <p className="text-xs text-slate-400">
                    Guests never type a phone number. Protected by a 4-digit check-in PIN per stay.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UtensilsCrossed className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">7 Guest Services &amp; Digital Menu</p>
                  <p className="text-xs text-slate-400">
                    Restaurant, Housekeeping, Mini Bar, Spa, Laundry, Taxi &amp; Special Occasions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">Dedicated Staff Screens &amp; Desk Alerts</p>
                  <p className="text-xs text-slate-400">
                    Separate logins for Reception, Housekeeping &amp; Kitchen with full-screen audio alerts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">Instant Printable Room QR Cards</p>
                  <p className="text-xs text-slate-400">
                    Pre-loaded with starter menus, housekeeping lists, and policies—ready in 2 minutes.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Already an existing FixyStays Partner?</span>
              <Link
                href="/dashboard/owner?tab=guest-hub"
                className="text-blue-400 font-black hover:underline flex items-center gap-1"
              >
                Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right: Onboarding & Payment Form */}
          <form
            onSubmit={handleCheckout}
            className="lg:col-span-7 bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-black">Set Up Your Hotel Guest Hub</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Your hotel portal, starter content &amp; room QRs are created immediately after payment.
                </p>
              </div>
              <ShieldCheck className="w-8 h-8 text-blue-600 flex-shrink-0" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Hotel / Property Name *</Label>
                <Input
                  required
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  placeholder="e.g. Madhureela Holiday Home"
                  className="mt-1 font-bold"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">City / Town *</Label>
                <Input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Alibag"
                  className="mt-1 font-bold"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full street address for Google Maps guide"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Brand Colour</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Room Calculator */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 items-center">
                <div>
                  <Label className="text-xs font-black uppercase text-slate-500">
                    Number of Rooms (₹20 / room / mo)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={roomsCount}
                    onChange={(e) =>
                      setRoomsCount(Math.max(1, parseInt(e.target.value || '1', 10)))
                    }
                    className="mt-1.5 text-lg font-black bg-white h-11"
                  />
                </div>

                <div>
                  <Label className="text-xs font-black uppercase text-slate-500">
                    Billing Duration
                  </Label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                    {[1, 3, 6, 12].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMonthsCount(m)}
                        className={`py-2.5 rounded-xl text-xs font-black border transition ${
                          monthsCount === m
                            ? 'bg-blue-600 text-white border-blue-600 shadow'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {m} {m === 1 ? 'Mo' : 'Mos'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-600">
                  {roomsCount} Room(s) × ₹20 × {monthsCount} Month(s)
                </div>
                <div className="text-2xl font-black text-blue-600">
                  ₹{totalAmount}
                </div>
              </div>
            </div>

            {/* Admin Account Credentials */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Hotel Admin Account Details
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold">Admin Name *</Label>
                  <Input
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Your Full Name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Admin Email *</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@hotel.com"
                    className="mt-1"
                  />
                </div>
              </div>

              {!isLoggedIn && (
                <div>
                  <Label className="text-xs font-bold">
                    Create Password * (For your Hotel Back End login)
                  </Label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: primaryColor }}
              className="w-full h-14 rounded-2xl text-white font-black text-base shadow-xl transition active:scale-[0.99]"
            >
              {loading
                ? 'Setting up your Hotel...'
                : `Pay ₹${totalAmount} & Launch Guest Hub`}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
