'use client'

import React, { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Phone,
  Lock,
  Building,
  MapPin,
  Camera,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Building2,
  BedDouble,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Script from 'next/script'
import { compressImageClient } from '@/lib/client-image-compression'
import {
  submitOnboarding,
  uploadOnboardingPhoto,
  OnboardingInput,
} from './actions'
import {
  createPropertySubscriptionOrder,
  verifyPropertyPayment,
} from '@/app/pricing/business/actions'

const PROPERTY_TYPES = [
  'Villa',
  'Homestay',
  'Hotel',
  'Resort',
  'Apartment',
  'Farmhouse / Cottage',
  'Guest House',
]

const MONTH_OPTIONS = [
  { months: 1, label: '1 Month' },
  { months: 3, label: '3 Months' },
  { months: 6, label: '6 Months' },
  { months: 12, label: '12 Months (1 Year)' },
]

export default function OnboardingPage() {
  // Step 1: Form | Step 2: Payment Duration & Checkout
  const [step, setStep] = useState<1 | 2>(1)

  // Form Fields
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [propertyType, setPropertyType] = useState('Villa')
  const [fullAddress, setFullAddress] = useState('')
  const [pincode, setPincode] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [samePhoneForHelpdesk, setSamePhoneForHelpdesk] = useState(true)
  const [helpdeskNumber, setHelpdeskNumber] = useState('')

  // Rooms & Live Pricing
  const [roomCount, setRoomCount] = useState<number | ''>(1)
  const [monthlyFee, setMonthlyFee] = useState<number>(100)
  const [isOverLimit, setIsOverLimit] = useState<boolean>(false)

  // Room Categories
  const [roomCategories, setRoomCategories] = useState<
    Array<{ name: string; basePrice: number; capacity: number }>
  >([{ name: 'Standard Room', basePrice: 2500, capacity: 2 }])

  // Photos
  const [photos, setPhotos] = useState<string[]>([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Pincode auto-lookup
  const [isDetectingPin, setIsDetectingPin] = useState(false)
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)

  // Form Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 2 State
  const [createdProperty, setCreatedProperty] = useState<{
    propertyId: string
    propertyName: string
    roomCount: number
    monthlyFee: number
    ownerEmail: string
    ownerPhone: string
  } | null>(null)
  const [selectedMonths, setSelectedMonths] = useState<number>(1)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Live Tier Fee Computation based on roomCount
  useEffect(() => {
    const count = typeof roomCount === 'number' ? roomCount : (parseInt(String(roomCount), 10) || 1)
    if (count > 100) {
      setIsOverLimit(true)
      setMonthlyFee(0)
      return
    }
    setIsOverLimit(false)

    if (count <= 6) setMonthlyFee(100)
    else if (count <= 12) setMonthlyFee(150)
    else if (count <= 20) setMonthlyFee(250)
    else if (count <= 30) setMonthlyFee(350)
    else if (count <= 50) setMonthlyFee(500)
    else if (count <= 75) setMonthlyFee(750)
    else setMonthlyFee(1000)
  }, [roomCount])

  // Pincode auto-lookup
  const handlePincodeChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6)
    setPincode(cleaned)
    setPinError(null)

    if (cleaned.length === 6) {
      setIsDetectingPin(true)
      try {
        const res = await fetch(`/api/pincode/${cleaned}`)
        const data = await res.json()
        if (data.success) {
          setDetectedLocation(`${data.city}, ${data.state}`)
          if (data.city) setCity(data.city)
          if (data.state) setState(data.state)
        } else {
          setPinError('Pincode not recognized')
          setDetectedLocation(null)
        }
      } catch {
        setPinError('Could not verify pincode')
      } finally {
        setIsDetectingPin(false)
      }
    } else {
      setDetectedLocation(null)
    }
  }

  // Handle Photo Upload with client-side compression & multiple file support
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const fileList = Array.from(e.target.files)
    setIsUploadingPhoto(true)
    setPhotoError(null)

    try {
      for (const file of fileList) {
        // Automatically compress on client to prevent 413 Payload Too Large on mobile
        const compressed = await compressImageClient(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.8,
          mimeType: 'image/jpeg',
        })

        const formData = new FormData()
        formData.append('file', compressed)
        const res = await uploadOnboardingPhoto(formData)
        if (res.error) {
          setPhotoError(res.error)
          break
        } else if (res.url) {
          setPhotos((prev) => [...prev, res.url])
        }
      }
    } catch (err: any) {
      console.error('[handlePhotoUpload] Upload error:', err)
      setPhotoError(err?.message || 'Image upload failed. Please try again.')
    } finally {
      setIsUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  // Room category handlers
  const addRoomCategory = () => {
    setRoomCategories((prev) => [
      ...prev,
      { name: `Room Type ${prev.length + 1}`, basePrice: 3000, capacity: 2 },
    ])
  }

  const updateCategory = (
    index: number,
    field: 'name' | 'basePrice' | 'capacity',
    value: string | number
  ) => {
    setRoomCategories((prev) =>
      prev.map((cat, i) => (i === index ? { ...cat, [field]: value } : cat))
    )
  }

  const removeCategory = (index: number) => {
    if (roomCategories.length === 1) return
    setRoomCategories((prev) => prev.filter((_, i) => i !== index))
  }

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (photos.length < 3) {
      setError('Please upload at least 3 photos of your property before proceeding.')
      return
    }

    if (isOverLimit) {
      setError('Properties with over 100 rooms require manual onboarding. Please contact support.')
      return
    }

    setIsSubmitting(true)

    const safeRoomCount = Math.max(1, Number(roomCount) || 1)
    const safeCategories = roomCategories.map((c) => ({
      name: c.name.trim() || 'Standard Room',
      basePrice: Math.max(1, Number(c.basePrice) || 2500),
      capacity: Math.max(1, Number(c.capacity) || 2),
    }))

    const payload: OnboardingInput = {
      ownerName,
      phone,
      email,
      password,
      propertyName,
      propertyType,
      fullAddress,
      city,
      state,
      pincode,
      roomCount: safeRoomCount,
      roomCategories: safeCategories,
      photos,
      helpdeskNumber: samePhoneForHelpdesk ? phone : helpdeskNumber || phone,
    }

    try {
      const res = await submitOnboarding(payload)
      if (res.error) {
        setError(res.error)
        setIsSubmitting(false)
        return
      }

      if (res.success && res.propertyId) {
        setCreatedProperty({
          propertyId: res.propertyId,
          propertyName: res.propertyName,
          roomCount: res.roomCount,
          monthlyFee: res.monthlyFee,
          ownerEmail: res.email,
          ownerPhone: res.phone,
        })
        setStep(2)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err: any) {
      setError(err.message || 'Onboarding failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2: Handle Razorpay Payment
  const handlePayment = async () => {
    if (!createdProperty) return
    setIsProcessingPayment(true)
    setError(null)

    try {
      const res = await createPropertySubscriptionOrder(
        createdProperty.propertyId,
        selectedMonths
      )

      if (res.error) {
        setError(res.error)
        setIsProcessingPayment(false)
        return
      }

      const options = {
        key: res.key,
        amount: res.amount,
        currency: 'INR',
        name: 'FixyStays Onboarding',
        description: `${createdProperty.propertyName} - ${selectedMonths} Month Subscription`,
        order_id: res.orderId,
        prefill: {
          name: ownerName,
          email: createdProperty.ownerEmail,
          contact: createdProperty.ownerPhone,
        },
        theme: { color: '#4F46E5' },
        handler: async function (response: any) {
          setIsProcessingPayment(true)
          const verifyRes = await verifyPropertyPayment({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })

          if (verifyRes.success) {
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          } else {
            alert(`Payment recorded. Redirecting to confirmation: ${verifyRes.error || 'Done'}`)
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed')
      setIsProcessingPayment(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="w-full max-w-4xl z-10">
        {/* Step Indicator Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 font-bold mb-3">
            <ShieldCheck className="w-4 h-4" />
            Verified Partner Onboarding
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            {step === 1 ? 'Register Your Property' : 'Select Subscription & Activate'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1
              ? 'Complete your property registration. All fields are mandatory.'
              : 'Choose your subscription period. Subscriptions are billed per-property based on declared room count.'}
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Error:</span> {error}
            </div>
          </div>
        )}

        {/* STEP 1: COMPREHENSIVE ONBOARDING FORM */}
        {step === 1 && (
          <form onSubmit={handleFormSubmit} className="space-y-8">
            {/* 1. OWNER DETAILS */}
            <Card className="border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/70 border-b border-gray-100 py-4">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" /> Owner Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Owner Full Name *</Label>
                    <Input
                      required
                      placeholder="e.g. Rajesh Patil"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Phone / WhatsApp Number (10 digits) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                        +91
                      </span>
                      <Input
                        required
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="pl-12 h-11 rounded-xl tracking-wider font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Email Address *</Label>
                    <Input
                      required
                      type="email"
                      placeholder="owner@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Account Password (min 6 characters) *</Label>
                    <Input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. PROPERTY DETAILS & LOCATION */}
            <Card className="border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/70 border-b border-gray-100 py-4">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" /> Property Profile & Address
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Property Name *</Label>
                    <Input
                      required
                      placeholder="e.g. Coconut Grove Villa"
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Property Type *</Label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Full Property Street Address *</Label>
                  <Input
                    required
                    placeholder="e.g. Survey No. 42, Near Nagaon Beach Road"
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-gray-700">Pincode *</Label>
                      {isDetectingPin && <span className="text-[10px] text-indigo-600 font-bold">Checking...</span>}
                      {detectedLocation && (
                        <span className="text-[10px] text-green-700 font-bold">{detectedLocation}</span>
                      )}
                    </div>
                    <Input
                      required
                      maxLength={6}
                      placeholder="402201"
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                    {pinError && <p className="text-[10px] text-red-500">{pinError}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">City / Region *</Label>
                    <Input
                      required
                      placeholder="e.g. Alibag"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">State *</Label>
                    <Input
                      required
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                {/* Helpdesk Number Option */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={samePhoneForHelpdesk}
                      onChange={(e) => setSamePhoneForHelpdesk(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Property helpdesk / guest contact number is the same as owner mobile number</span>
                  </label>
                  {!samePhoneForHelpdesk && (
                    <div className="space-y-1.5 max-w-sm">
                      <Label className="text-xs font-bold text-gray-700">Separate Helpdesk Number *</Label>
                      <Input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={helpdeskNumber}
                        onChange={(e) => setHelpdeskNumber(e.target.value.replace(/\D/g, ''))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. ROOMS & LIVE SUBSCRIPTION PRICING TIER */}
            <Card className="border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/70 border-b border-gray-100 py-4">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-indigo-600" /> Rentable Rooms & Live Tier Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Total Rentable Units */}
                <div className="bg-indigo-50/70 border border-indigo-100 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <Label htmlFor="roomCount" className="text-sm font-bold text-indigo-950 block">
                      TOTAL NUMBER OF RENTABLE ROOMS *
                    </Label>
                    <p className="text-xs text-indigo-800 mt-0.5">
                      Enter the total physical rooms available to guests in this property (1–100).
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      id="roomCount"
                      type="number"
                      min={1}
                      max={120}
                      value={roomCount}
                      placeholder="1"
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '') {
                          setRoomCount('')
                        } else {
                          const parsed = parseInt(val, 10)
                          if (!isNaN(parsed)) {
                            setRoomCount(parsed)
                          }
                        }
                      }}
                      onBlur={() => {
                        if (roomCount === '' || Number(roomCount) < 1) {
                          setRoomCount(1)
                        }
                      }}
                      className="w-28 h-12 text-center text-xl font-black rounded-xl border-indigo-300 bg-white"
                    />
                    <div className="text-right">
                      {isOverLimit ? (
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-lg block">
                          Over 100: Contact Us
                        </span>
                      ) : (
                        <div className="bg-white border border-indigo-200 px-4 py-2 rounded-xl text-center">
                          <span className="text-xs text-gray-500 block">Monthly Fee</span>
                          <span className="text-lg font-black text-indigo-600">
                            ₹{monthlyFee}
                            <span className="text-xs font-normal text-gray-400">/mo</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isOverLimit && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    Properties with greater than 100 rooms cannot complete self-serve checkout. Please reach out to <a href="mailto:support@fixystays.com" className="font-bold underline">support@fixystays.com</a> for enterprise setup.
                  </div>
                )}

                {/* Room Category Configuration */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-xs font-bold text-gray-800">
                        Room Categories & Nightly Pricing *
                      </Label>
                      <p className="text-[11px] text-gray-500">Configure at least 1 room category for guest search.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRoomCategory}
                      className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Category
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {roomCategories.map((cat, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl items-center"
                      >
                        <div className="sm:col-span-5 space-y-1">
                          <span className="text-[10px] text-gray-500 block font-semibold">Category Name</span>
                          <Input
                            placeholder="e.g. Deluxe AC Room"
                            value={cat.name}
                            onChange={(e) => updateCategory(idx, 'name', e.target.value)}
                            className="h-9 text-xs rounded-lg bg-white"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <span className="text-[10px] text-gray-500 block font-semibold">Base Price / Night (₹)</span>
                          <Input
                            type="number"
                            min={1}
                            placeholder="2500"
                            value={cat.basePrice ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              updateCategory(idx, 'basePrice', val === '' ? ('' as any) : (parseInt(val, 10) || 0))
                            }}
                            onBlur={() => {
                              if (!cat.basePrice || Number(cat.basePrice) < 1) {
                                updateCategory(idx, 'basePrice', 2500)
                              }
                            }}
                            className="h-9 text-xs rounded-lg bg-white"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <span className="text-[10px] text-gray-500 block font-semibold">Max Guests</span>
                          <Input
                            type="number"
                            min={1}
                            placeholder="2"
                            value={cat.capacity ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              updateCategory(idx, 'capacity', val === '' ? ('' as any) : (parseInt(val, 10) || 1))
                            }}
                            onBlur={() => {
                              if (!cat.capacity || Number(cat.capacity) < 1) {
                                updateCategory(idx, 'capacity', 2)
                              }
                            }}
                            className="h-9 text-xs rounded-lg bg-white"
                          />
                        </div>
                        <div className="sm:col-span-1 text-center pt-4 sm:pt-0">
                          {roomCategories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCategory(idx)}
                              className="text-red-500 hover:text-red-700 p-1.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. PROPERTY PHOTOS (MIN 3) */}
            <Card className="border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/70 border-b border-gray-100 py-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-600" /> Property Photos *
                  </CardTitle>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      photos.length >= 3
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {photos.length} / 3 Uploaded (min 3)
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Photo Previews */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {photos.map((url, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                      <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Upload Box */}
                  <label className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer text-center bg-gray-50/50 hover:bg-indigo-50/30 transition-all aspect-video">
                    {isUploadingPhoto ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        <span className="text-[11px] font-bold text-indigo-600">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs font-bold text-indigo-600">+ Upload Photo</span>
                        <span className="text-[10px] text-gray-400">JPG, PNG, WebP (auto-optimized)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {photoError && <p className="text-xs text-red-600">{photoError}</p>}
              </CardContent>
            </Card>

            {/* Submit Action */}
            <Button
              type="submit"
              disabled={isSubmitting || isOverLimit}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account & Saving Draft...
                </>
              ) : (
                <>
                  Proceed to Payment Selection
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* STEP 2: DURATION SELECTION & RAZORPAY CHECKOUT */}
        {step === 2 && createdProperty && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <Card className="border border-gray-200 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="bg-indigo-600 text-white p-6 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-indigo-200" />
                <CardTitle className="text-2xl font-bold">Account & Draft Created</CardTitle>
                <p className="text-indigo-100 text-sm mt-1">
                  {createdProperty.propertyName} ({createdProperty.roomCount} Rooms) &bull; Tier Fee: ₹
                  {createdProperty.monthlyFee}/month
                </p>
              </CardHeader>

              <CardContent className="p-8 space-y-6">
                <div>
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-3">
                    Choose Subscription Duration
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {MONTH_OPTIONS.map((opt) => {
                      const isSelected = selectedMonths === opt.months
                      const cost = createdProperty.monthlyFee * opt.months
                      return (
                        <button
                          key={opt.months}
                          type="button"
                          onClick={() => setSelectedMonths(opt.months)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="text-sm font-bold">{opt.label}</div>
                          <div className="text-xl font-black text-gray-900 mt-1">₹{cost.toLocaleString('en-IN')}</div>
                          <div className="text-[11px] text-gray-500 font-normal">
                            ₹{createdProperty.monthlyFee}/mo &times; {opt.months} mo
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Base Tier Rate</span>
                    <span>₹{createdProperty.monthlyFee} / month</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Duration</span>
                    <span>{selectedMonths} Month(s)</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST (18%)</span>
                    <span>Included</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-extrabold text-base text-gray-900">
                    <span>Total Payable</span>
                    <span className="text-indigo-600">
                      ₹{(createdProperty.monthlyFee * selectedMonths).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessingPayment}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Launching Payment Gateway...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Pay ₹{(createdProperty.monthlyFee * selectedMonths).toLocaleString('en-IN')} & Submit for Approval
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    disabled={isProcessingPayment}
                    className="text-xs text-gray-500 hover:text-gray-800"
                  >
                    &larr; Back to Edit Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
