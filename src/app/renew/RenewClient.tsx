'use client'

import React, { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Building2,
  Calendar,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Phone,
} from 'lucide-react'
import Script from 'next/script'
import { createPropertySubscriptionOrder, verifyPropertyPayment } from '@/app/pricing/business/actions'

interface PropertyRenewData {
  id: string
  name: string
  city: string
  declared_room_count: number | null
  physical_rooms_count: number
  effective_rooms: number
  monthly_fee: number | null
  subscription: {
    status: string
    end_date: string
    months: number
    plan_name?: string
  } | null
  approval_status: string
}

interface RenewClientProps {
  owner: {
    id: string
    name: string
    email: string
    phone?: string | null
  }
  properties: PropertyRenewData[]
}

const MONTH_OPTIONS = [
  { months: 1, label: '1 Month' },
  { months: 3, label: '3 Months' },
  { months: 6, label: '6 Months' },
  { months: 12, label: '12 Months (1 Year)' },
]

export default function RenewClient({ owner, properties }: RenewClientProps) {
  const [isNative, setIsNative] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<Record<string, number>>({})
  const [customRooms, setCustomRooms] = useState<Record<string, number>>({})
  const [loadingPropertyId, setLoadingPropertyId] = useState<string | null>(null)
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})

  useEffect(() => {
    // Check if running on Android/iOS Capacitor native wrapper
    try {
      if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
        setIsNative(true)
      }
    } catch {
      // Safe fallback in standard browser
      setIsNative(false)
    }

    // Default 1 month selected for each property
    const defaults: Record<string, number> = {}
    properties.forEach((p) => {
      defaults[p.id] = 1
    })
    setSelectedMonths(defaults)
  }, [properties])

  const handlePay = async (property: PropertyRenewData) => {
    const months = selectedMonths[property.id] || 1
    setErrorMap((prev) => ({ ...prev, [property.id]: '' }))
    setLoadingPropertyId(property.id)

    try {
      const res = await createPropertySubscriptionOrder(property.id, months)
      if (res.error) {
        setErrorMap((prev) => ({ ...prev, [property.id]: res.error || 'Failed to create order' }))
        setLoadingPropertyId(null)
        return
      }

      if (!res.orderId || !res.key) {
        setErrorMap((prev) => ({ ...prev, [property.id]: 'Invalid order response from server.' }))
        setLoadingPropertyId(null)
        return
      }

      const options = {
        key: res.key,
        amount: res.amount,
        currency: 'INR',
        name: 'FixyStays Property Subscription',
        description: `${property.name} - ${months} Month Subscription`,
        order_id: res.orderId,
        prefill: {
          name: owner.name,
          email: owner.email,
          contact: owner.phone || '',
        },
        theme: { color: '#4F46E5' },
        handler: async function (response: any) {
          setLoadingPropertyId(property.id)
          // Verify via server action
          const verifyRes = await verifyPropertyPayment({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })

          if (verifyRes.success) {
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          } else {
            alert(`Payment verification note: ${verifyRes.error || 'Done'}. Redirecting...`)
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPropertyId(null)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      setErrorMap((prev) => ({ ...prev, [property.id]: err.message || 'Payment initiation failed' }))
      setLoadingPropertyId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Property Subscriptions & Renewal</h1>
        <p className="text-gray-500 mt-2 text-base">
          Manage per-property access and renew subscriptions. Each property subscription is priced strictly by verified rentable room count.
        </p>
      </div>

      {/* Owner Phone Notification if missing */}
      {!owner.phone && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Phone className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <span className="font-semibold">Phone number required:</span> Please update your WhatsApp contact number in your profile so FixyStays admin can assist with property approval and instant booking notifications.
          </div>
        </div>
      )}

      {/* Properties List */}
      <div className="space-y-6">
        {properties.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 border-dashed">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700">No properties found</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">You have not registered any properties under this account yet.</p>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <a href="/onboarding">Add New Property</a>
            </Button>
          </Card>
        ) : (
          properties.map((prop) => {
            const hasSub = Boolean(prop.subscription)
            const isSubActive =
              prop.subscription?.status === 'active' &&
              new Date(prop.subscription.end_date) > new Date()
            const months = selectedMonths[prop.id] || 1
            const effectiveRooms = prop.effective_rooms || 1
            const monthlyFee = prop.monthly_fee || 100
            const totalFee = monthlyFee * months

            return (
              <Card key={prop.id} className="border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/70 border-b border-gray-100 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold text-gray-900">{prop.name}</CardTitle>
                        {isSubActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            Active Subscription
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            Subscription Expired
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border border-gray-200 text-gray-600 capitalize">
                          Approval: {prop.approval_status}
                        </span>
                      </div>
                      <CardDescription className="text-xs text-gray-500 mt-1">
                        Location: {prop.city} &bull; Property ID: {prop.id.slice(0, 8)}...
                      </CardDescription>
                    </div>

                    {prop.subscription && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Valid Until:</span>
                        </div>
                        <div className="font-semibold text-sm text-gray-800">
                          {new Date(prop.subscription.end_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {/* Room Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-xl text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Declared Rooms</span>
                      <span className="font-bold text-gray-800 text-base">
                        {prop.declared_room_count !== null ? `${prop.declared_room_count} Rooms` : 'Not declared'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Physical Room Units</span>
                      <span className="font-bold text-gray-800 text-base">{prop.physical_rooms_count} Units</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Effective Billable Tier</span>
                      <span className="font-bold text-indigo-600 text-base">
                        {effectiveRooms} Rooms (₹{monthlyFee}/mo)
                      </span>
                    </div>
                  </div>

                  {/* NATIVE APP EXEMPTION (Capacitor): show status and expiry only */}
                  {isNative ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
                      <p className="font-semibold mb-1">Android Mobile App Mode</p>
                      <p className="text-xs text-blue-800">
                        In-app purchases are managed through our web portal. To recharge or renew this property subscription, please visit <span className="font-mono font-bold">www.fixystays.com/renew</span> in your mobile browser.
                      </p>
                    </div>
                  ) : (
                    /* WEB PAYMENT UI */
                    <div className="space-y-5">
                      {/* Duration Selector */}
                      <div>
                        <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                          Select Renewal Period
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {MONTH_OPTIONS.map((opt) => {
                            const isSelected = months === opt.months
                            return (
                              <button
                                key={opt.months}
                                type="button"
                                onClick={() =>
                                  setSelectedMonths((prev) => ({ ...prev, [prop.id]: opt.months }))
                                }
                                className={`py-3 px-3 rounded-xl border text-center transition-all ${
                                  isSelected
                                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700 text-sm'
                                }`}
                              >
                                <div className="text-sm font-semibold">{opt.label}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  ₹{monthlyFee * opt.months}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Error Banner */}
                      {errorMap[prop.id] && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{errorMap[prop.id]}</span>
                        </div>
                      )}

                      {/* Summary & Checkout Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-100 gap-4">
                        <div>
                          <div className="text-xs text-gray-400">Total payable (inclusive of GST)</div>
                          <div className="text-2xl font-black text-gray-900">
                            ₹{totalFee.toLocaleString('en-IN')}
                            <span className="text-xs text-gray-400 font-normal ml-1">
                              for {months} {months === 1 ? 'month' : 'months'}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handlePay(prop)}
                          disabled={loadingPropertyId === prop.id}
                          className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                        >
                          {loadingPropertyId === prop.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              {isSubActive ? 'Extend Subscription' : 'Renew Subscription'}
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
