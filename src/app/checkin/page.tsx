'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle, Users, Phone, User, ShieldCheck,
  HelpCircle, Globe, Instagram, Facebook, UserPlus, UserMinus,
  Camera, Image as ImageIcon, Loader2, AlertTriangle, Trash2, Plus, X
} from 'lucide-react'
import { submitCheckin, getPropertyInfo, saveRegisterGuests } from './actions'
import { verifyRegisterOCR } from './verify-action'
import { cn, formatWhatsAppNumber, COUNTRY_CODES } from '@/lib/utils'
import { Suspense } from 'react'
import { GuestIdUpload } from './GuestIdUpload'

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="text-blue-600 font-bold animate-pulse">Loading Check-in Form...</div>
      </div>
    }>
      <CheckinForm />
    </Suspense>
  )
}

function CheckinForm() {
  const searchParams = useSearchParams()
  const propertyId = searchParams.get('p')
  const prefilledPhone = searchParams.get('pn')
  const prefilledName = searchParams.get('gn')

  const [step, setStep] = useState(1)

  const [guestName, setGuestName] = useState('')
  const [countryCode, setCountryCode] = useState('91')
  const [guestPhone, setGuestPhone] = useState('')
  const [numPeople, setNumPeople] = useState(1)
  // Stable keys for each guest slot so removing a guest doesn't reset other guests' state
  const [guestKeys, setGuestKeys] = useState<number[]>([0])
  const nextKeyRef = useRef(1)
  const [checkinDate, setCheckinDate] = useState('')
  const [checkoutDate, setCheckoutDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ propertyName: string, helpdesk: string } | null>(null)
  const [propertyInfo, setPropertyInfo] = useState<{ name: string, helpdesk_number: string } | null>(null)
  const [showFormC, setShowFormC] = useState(false)

  // Register OCR Flow States
  const [isRegisterMode, setIsRegisterMode] = useState(searchParams.get('mode') === 'register')
  const [registerStep, setRegisterStep] = useState<'SELECT_DATE' | 'UPLOAD' | 'SCANNING' | 'VERIFY'>('SELECT_DATE')
  const [registerDateRange, setRegisterDateRange] = useState({ from: '', to: '' })
  const [registerImages, setRegisterImages] = useState<File[]>([])
  const [registerImageUrls, setRegisterImageUrls] = useState<string[]>([])
  const [registerGuests, setRegisterGuests] = useState<any[]>([])
  const [registerUploading, setRegisterUploading] = useState(false)
  const [registerError, setRegisterError] = useState('')

  const handleProcessRegisterOCR = async () => {
    if (registerImages.length === 0) return
    setRegisterStep('SCANNING')
    setRegisterError('')

    try {
      const urls: string[] = []
      const allExtractedGuests: any[] = []

      // Process each uploaded page image
      for (const imageFile of registerImages) {
        const formData = new FormData()
        formData.append('image', imageFile)
        const res = await verifyRegisterOCR(formData)

        if (res.success && res.imageUrl) {
          urls.push(res.imageUrl)
          if (res.guests && Array.isArray(res.guests)) {
            allExtractedGuests.push(...res.guests)
          }
        } else {
          throw new Error(res.error || 'Failed to scan one of the images. Please check the image resolution and lighting.')
        }
      }

      setRegisterImageUrls(urls)
      const mappedGuests = allExtractedGuests.map(g => ({
        ...g,
        checkin_date: g.checkin_date || registerDateRange.from,
        checkout_date: g.checkout_date || '',
        confidence: g.confidence || 'high',
        uncertain_fields: g.uncertain_fields || []
      }))

      setRegisterGuests(mappedGuests)
      setRegisterStep('VERIFY')
    } catch (err: any) {
      setRegisterError(err.message || 'An error occurred during OCR scanning.')
      setRegisterStep('UPLOAD')
    }
  }

  const handleEditGuestField = (index: number, field: string, value: string) => {
    setRegisterGuests(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (next[index].uncertain_fields && next[index].uncertain_fields.includes(field)) {
        next[index].uncertain_fields = next[index].uncertain_fields.filter((f: string) => f !== field)
      }
      return next
    })
  }

  const handleSaveRegisterGuests = async () => {
    if (!propertyId) return
    setRegisterUploading(true)
    setRegisterError('')

    try {
      const registerDateStr = registerDateRange.to 
        ? `${registerDateRange.from} to ${registerDateRange.to}`
        : registerDateRange.from

      const result = await saveRegisterGuests(
        propertyId,
        registerDateStr,
        registerGuests,
        registerImageUrls
      )

      if (result.success) {
        alert(`Successfully saved ${result.count} guest records!`)
        setIsRegisterMode(false)
        setRegisterStep('SELECT_DATE')
        setRegisterImages([])
        setRegisterGuests([])
        setSuccessData({
          propertyName: propertyInfo?.name || 'the property',
          helpdesk: propertyInfo?.helpdesk_number || 'Contact Support'
        })
        setStep(2)
      } else {
        setRegisterError(result.error || 'Failed to save register guests.')
      }
    } catch (err: any) {
      setRegisterError(err.message || 'An error occurred while saving records.')
    } finally {
      setRegisterUploading(false)
    }
  }

  // verifiedIds[i] is set when the front ID for guest i is verified by OCR
  // Submit is only enabled when ALL slots are non-null
  const [verifiedIds, setVerifiedIds] = useState<(string | null)[]>([null])

  // Sync array length when numPeople changes — preserve existing verified IDs
  useEffect(() => {
    setVerifiedIds(prev => {
      const next = Array(numPeople).fill(null)
      for (let i = 0; i < Math.min(prev.length, numPeople); i++) {
        next[i] = prev[i]
      }
      return next
    })
    setGuestKeys(prev => {
      if (numPeople > prev.length) {
        const added = []
        for (let i = prev.length; i < numPeople; i++) {
          added.push(nextKeyRef.current++)
        }
        return [...prev, ...added]
      }
      return prev.slice(0, numPeople)
    })
  }, [numPeople])

  const handleGuestVerified = useCallback((index: number, identityId: string | null) => {
    setVerifiedIds(prev => {
      const next = [...prev]
      next[index] = identityId
      return next
    })
  }, [])

  // All IDs need the front verified (back is stored async without blocking submit in theory,
  // but GuestIdUpload itself gates on front-only for the onVerified callback)
  const allVerified = verifiedIds.length === numPeople && verifiedIds.every(id => id !== null)
  const verifiedCount = verifiedIds.filter(Boolean).length

  useEffect(() => {
    if (propertyId) {
      getPropertyInfo(propertyId).then(info => { if (info) setPropertyInfo(info) })
    }
  }, [propertyId])

  useEffect(() => {
    if (prefilledPhone) setGuestPhone(prefilledPhone)
    if (prefilledName) setGuestName(prefilledName)
  }, [prefilledPhone, prefilledName])

  if (!propertyId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl border max-w-md text-center">
          <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500">This check-in link is invalid or expired. Please contact the property owner.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!allVerified) return
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('propertyId', propertyId)
      formData.append('guestPhone', formatWhatsAppNumber(guestPhone, countryCode))
      formData.append('guestName', guestName)
      formData.append('numPeople', numPeople.toString())
      formData.append('checkinDate', checkinDate)
      formData.append('checkoutDate', checkoutDate)
      formData.append('vehicleNumber', (e.currentTarget.elements.namedItem('vehicleNumber') as HTMLInputElement)?.value || '')

      const result = await submitCheckin(formData, verifiedIds as string[])

      if (result.success) {
        setSuccessData({
          propertyName: result.propertyName || 'the property',
          helpdesk: result.helpdeskNumber || 'Contact Support'
        })
        setStep(2)
      } else {
        alert(`Check-in Error: ${result.error}\n\nPlease try again.`)
      }
    } catch (err: any) {
      alert(`Unexpected Error: ${err.message || 'Please check your connection and try again.'}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 2) {
    const whatsappLink = successData?.helpdesk
      ? `https://wa.me/${formatWhatsAppNumber(successData.helpdesk)}`
      : 'https://wa.me/'

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Check-in Complete!</h1>
          <p className="text-lg text-gray-600 mb-8">
            Welcome to <span className="font-bold text-blue-600">{successData?.propertyName}</span>!
          </p>

          <div className="w-full bg-blue-50 border border-blue-100 p-6 rounded-2xl text-left mb-6">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Important Info
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              We&apos;ve received your details and verified all guest IDs. Please head to the property entrance.
            </p>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Helpdesk Number</div>
              <div className="text-xl font-bold text-blue-900">{successData?.helpdesk}</div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3 mb-8">
            <Button asChild className="w-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white border-0 shadow-md flex items-center justify-center gap-2">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <HelpCircle className="w-5 h-5" /> Help & Support (WhatsApp)
              </a>
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button asChild variant="outline" className="h-12 border-gray-200 text-gray-600 hover:text-blue-600">
                <a href="https://fixystays.com" target="_blank" rel="noopener noreferrer"><Globe className="w-5 h-5" /></a>
              </Button>
              <Button asChild variant="outline" className="h-12 border-gray-200 text-gray-600 hover:text-pink-600">
                <a href="https://instagram.com/fixystays" target="_blank" rel="noopener noreferrer"><Instagram className="w-5 h-5" /></a>
              </Button>
              <Button asChild variant="outline" className="h-12 border-gray-200 text-gray-600 hover:text-blue-800">
                <a href="https://facebook.com/fixystays" target="_blank" rel="noopener noreferrer"><Facebook className="w-5 h-5" /></a>
              </Button>
            </div>
          </div>

          <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">
            Enjoy your stay with Fixy Stays
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="text-center">
          <Link href="/" className="font-bold text-2xl text-blue-600 mb-4 inline-block hover:text-blue-700 transition">
            Fixy Stays
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
            Welcome to <br />
            <span className="text-blue-600 drop-shadow-sm">{propertyInfo?.name || 'Guest Check-in'}</span>
          </h1>
          <p className="text-gray-500 mt-3 font-medium">
            Please fill in your details and upload both sides of a government ID for <strong>every guest</strong>.
          </p>
        </div>

        {step === 1 && (
          isRegisterMode ? (
            <div className="bg-white border shadow-xl rounded-3xl p-8 flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Register Digitization</h2>
                  <p className="text-xs text-gray-500">Digitize physical handwritten registers using AI OCR</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setRegisterStep('SELECT_DATE');
                    setRegisterImages([]);
                    setRegisterGuests([]);
                    setRegisterError('');
                  }}
                  className="h-9 text-xs font-bold"
                >
                  Back to Guest Form
                </Button>
              </div>

              {registerError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{registerError}</span>
                </div>
              )}

              {/* SELECT_DATE STEP */}
              {registerStep === 'SELECT_DATE' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">1. Select Register Date or Date Range</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Select the date corresponding to the handwritten register entries.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="regDateFrom">Start Date</Label>
                      <Input 
                        id="regDateFrom" 
                        type="date" 
                        value={registerDateRange.from} 
                        onChange={(e) => setRegisterDateRange(prev => ({ ...prev, from: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="regDateTo">End Date (Optional)</Label>
                      <Input 
                        id="regDateTo" 
                        type="date" 
                        value={registerDateRange.to} 
                        onChange={(e) => setRegisterDateRange(prev => ({ ...prev, to: e.target.value }))} 
                      />
                    </div>
                  </div>
                  <Button 
                    disabled={!registerDateRange.from}
                    className="bg-blue-600 hover:bg-blue-700 mt-2 h-11 w-full"
                    onClick={() => setRegisterStep('UPLOAD')}
                  >
                    Continue to Upload
                  </Button>
                </div>
              )}

              {/* UPLOAD STEP */}
              {registerStep === 'UPLOAD' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-850">
                      2. Upload Guest Register Page Scan
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Selected Date: <span className="font-bold text-gray-700">{registerDateRange.from} {registerDateRange.to ? `to ${registerDateRange.to}` : ''}</span>
                    </p>
                  </div>

                  {/* File Upload Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <label htmlFor="regCam" className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 p-6 rounded-2xl cursor-pointer hover:bg-gray-50 active:scale-95 transition bg-white text-blue-600 text-xs font-bold shadow-sm">
                      <Camera className="w-8 h-8" />
                      <span>Camera</span>
                      <input 
                        type="file" 
                        id="regCam" 
                        accept="image/*" 
                        capture="environment" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) setRegisterImages(prev => [...prev, ...files]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <label htmlFor="regGal" className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 p-6 rounded-2xl cursor-pointer hover:bg-gray-50 active:scale-95 transition bg-white text-gray-600 text-xs font-bold shadow-sm">
                      <ImageIcon className="w-8 h-8" />
                      <span>Gallery</span>
                      <input 
                        type="file" 
                        id="regGal" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) setRegisterImages(prev => [...prev, ...files]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {/* Previews */}
                  {registerImages.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Uploaded Register Sheets ({registerImages.length})</span>
                      <div className="flex flex-wrap gap-3">
                        {registerImages.map((file, i) => (
                          <div key={i} className="relative aspect-[3/4] w-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={URL.createObjectURL(file)} alt={`Page ${i+1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setRegisterImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-650 text-white p-1 rounded-full shadow transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-11"
                      onClick={() => setRegisterStep('SELECT_DATE')}
                    >
                      Back
                    </Button>
                    <Button 
                      disabled={registerImages.length === 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 text-white font-bold"
                      onClick={handleProcessRegisterOCR}
                    >
                      Start OCR Scanning
                    </Button>
                  </div>
                </div>
              )}

              {/* SCANNING STEP */}
              {registerStep === 'SCANNING' && (
                <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  <div>
                    <h3 className="font-bold text-gray-900">Analyzing Handwritten Register...</h3>
                    <p className="text-xs text-gray-400 mt-1">Our AI OCR is transcribing guest details and validating ID fields. This may take up to 15 seconds.</p>
                  </div>
                </div>
              )}

              {/* VERIFY STEP */}
              {registerStep === 'VERIFY' && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">3. Verify & Correct Extracted Guest Details</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Please check fields highlighted in amber for manual validation.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 text-xs font-bold border-dashed border-blue-300 text-blue-600"
                      onClick={() => {
                        setRegisterGuests(prev => [
                          ...prev, 
                          { guest_name: '', mobile_number: '', id_type: 'None', id_number: '', checkin_date: registerDateRange.from, checkout_date: '', confidence: 'high', uncertain_fields: [] }
                        ]);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Guest
                    </Button>
                  </div>

                  <div className="flex flex-col gap-5 max-h-[50vh] overflow-y-auto pr-1">
                    {registerGuests.map((guest, i) => {
                      const isUncertain = (field: string) => guest.confidence === 'low' || (guest.uncertain_fields && guest.uncertain_fields.includes(field));
                      
                      return (
                        <div key={i} className="bg-gray-50 border border-gray-150 rounded-2xl p-4 flex flex-col gap-3 relative shadow-sm">
                          <button
                            type="button"
                            onClick={() => setRegisterGuests(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-3 right-3 text-gray-400 hover:text-red-650 p-1.5 rounded-lg hover:bg-red-50/50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-650">Guest Entry #{i + 1}</span>

                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Guest Name</Label>
                              <Input 
                                value={guest.guest_name || ''} 
                                onChange={(e) => handleEditGuestField(i, 'guest_name', e.target.value)}
                                className={cn(isUncertain('guest_name') && "border-amber-400 bg-amber-50/30 focus-visible:ring-amber-500")}
                              />
                              {isUncertain('guest_name') && (
                                <span className="text-[9px] text-amber-600 font-bold block">Please verify name spelling</span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Mobile Number</Label>
                              <Input 
                                value={guest.mobile_number || ''} 
                                onChange={(e) => handleEditGuestField(i, 'mobile_number', e.target.value)}
                                className={cn(isUncertain('mobile_number') && "border-amber-400 bg-amber-50/30 focus-visible:ring-amber-500")}
                              />
                              {isUncertain('mobile_number') && (
                                <span className="text-[9px] text-amber-600 font-bold block">Please verify mobile number</span>
                              )}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">ID Document Type</Label>
                              <select
                                value={guest.id_type || 'None'}
                                onChange={(e) => handleEditGuestField(i, 'id_type', e.target.value)}
                                className={cn(
                                  "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                                  isUncertain('id_type') && "border-amber-400 bg-amber-50/30"
                                )}
                              >
                                <option value="Aadhaar Card">Aadhaar Card</option>
                                <option value="Driving Licence">Driving Licence</option>
                                <option value="Voter ID">Voter ID</option>
                                <option value="Passport">Passport</option>
                                <option value="Other">Other</option>
                                <option value="None">None</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">ID Number</Label>
                              <Input 
                                value={guest.id_number || ''} 
                                onChange={(e) => handleEditGuestField(i, 'id_number', e.target.value)}
                                className={cn(isUncertain('id_number') && "border-amber-400 bg-amber-50/30 focus-visible:ring-amber-500")}
                              />
                              {isUncertain('id_number') && (
                                <span className="text-[9px] text-amber-600 font-bold block">Please verify ID number</span>
                              )}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Check-in Date</Label>
                              <Input 
                                type="date"
                                value={guest.checkin_date || ''} 
                                onChange={(e) => handleEditGuestField(i, 'checkin_date', e.target.value)}
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Check-out Date</Label>
                              <Input 
                                type="date"
                                value={guest.checkout_date || ''} 
                                onChange={(e) => handleEditGuestField(i, 'checkout_date', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-11"
                      onClick={() => setRegisterStep('UPLOAD')}
                    >
                      Back
                    </Button>
                    <Button 
                      disabled={registerGuests.length === 0 || registerUploading}
                      className="flex-1 bg-green-600 hover:bg-green-700 h-11 text-white font-bold animate-in fade-in"
                      onClick={handleSaveRegisterGuests}
                    >
                      {registerUploading ? 'Saving...' : 'Confirm & Save Guests'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="bg-white border shadow-xl rounded-3xl p-8 flex flex-col gap-6">
                {/* Phone + Name */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="w-4 h-4" /> Phone Number</Label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-[90px] h-10 px-2 py-2 rounded-md border border-gray-300 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>{c.icon} +{c.code}</option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input id="phone" placeholder="9876543210" required className="pl-9"
                          value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-1"><User className="w-4 h-4" /> Full Name (Primary Guest)</Label>
                    <Input id="name" placeholder="John Doe" required
                      value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="checkinDate">Check-in Date</Label>
                    <Input id="checkinDate" type="date" required value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkoutDate">Check-out Date</Label>
                    <Input id="checkoutDate" type="date" required value={checkoutDate} onChange={(e) => setCheckoutDate(e.target.value)} />
                  </div>
                </div>

                {/* Vehicle */}
                <div className="space-y-2">
                  <Label htmlFor="vehicleNumber" className="flex items-center gap-1">
                    Vehicle Number <span className="text-[10px] text-gray-400 font-medium ml-1">(Optional)</span>
                  </Label>
                  <Input id="vehicleNumber" name="vehicleNumber" placeholder="e.g. MH-12-AB-1234"
                    className="bg-gray-50/50 focus:bg-white transition-colors" />
                </div>

                {/* Form C (Foreign Tourists) */}
                <div className="space-y-4 border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                  <div 
                    className="flex items-center gap-2 cursor-pointer" 
                    onClick={(e) => {
                      // Prevent double toggling if clicking directly on the input or label
                      if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'DIV') return;
                      setShowFormC(!showFormC);
                    }}
                  >
                    <input 
                      type="checkbox" 
                      id="isForeigner" 
                      name="isForeigner"
                      checked={showFormC}
                      onChange={(e) => setShowFormC(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <Label htmlFor="isForeigner" className="font-bold text-gray-700 cursor-pointer">I am a foreign national (Requires Form C)</Label>
                  </div>
                  
                  {showFormC && (
                    <div id="formCFields" className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label htmlFor="passportNumber">Passport Number</Label>
                        <Input id="passportNumber" name="passportNumber" placeholder="e.g. A1234567" className="bg-white" required={showFormC} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="visaNumber">Visa Number</Label>
                        <Input id="visaNumber" name="visaNumber" placeholder="e.g. V1234567" className="bg-white" required={showFormC} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="visaExpiry">Visa Expiry Date</Label>
                        <Input id="visaExpiry" name="visaExpiry" type="date" className="bg-white" required={showFormC} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="countryOfOrigin">Country of Origin</Label>
                        <Input id="countryOfOrigin" name="countryOfOrigin" placeholder="e.g. United Kingdom" className="bg-white" required={showFormC} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Number of Guests */}
                <div className="space-y-2">
                  <Label htmlFor="pax" className="flex items-center gap-1"><Users className="w-4 h-4" /> Number of People Staying</Label>
                  <select
                    id="pax"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    value={numPeople}
                    onChange={(e) => setNumPeople(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>

                {/* ── ID Verification — one GuestIdUpload per guest ── */}
                <div className="mt-2 pt-6 border-t border-gray-100 flex flex-col gap-5">
                  {/* Header with progress */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-bold text-gray-900">Identity Verification</h3>
                        <p className="text-xs text-gray-500">
                          Upload <span className="font-bold text-blue-600">front & back</span> of a government ID for each guest.
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      'text-xs font-bold px-3 py-1.5 rounded-full transition-colors',
                      allVerified ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-700'
                    )}>
                      {verifiedCount}/{numPeople} Ready
                    </div>
                  </div>

                  {/* One card per guest */}
                  <div className="flex flex-col gap-4">
                    {Array.from({ length: numPeople }).map((_, i) => (
                      <div key={guestKeys[i]} className="relative">
                        {/* Remove guest button — always visible when more than 1 guest */}
                        {numPeople > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNumPeople(prev => prev - 1)
                              setVerifiedIds(prev => {
                                const next = [...prev]
                                next.splice(i, 1)
                                return next
                              })
                              setGuestKeys(prev => {
                                const next = [...prev]
                                next.splice(i, 1)
                                return next
                              })
                            }}
                            className="absolute -top-1.5 -right-1.5 z-20 flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 text-[9px] font-black px-2 py-1 rounded-full shadow transition-all active:scale-95"
                            title={`Remove ${i === 0 ? 'Primary Guest' : `Guest ${i + 1}`}`}
                          >
                            <UserMinus className="w-3 h-3" />
                            Remove
                          </button>
                        )}
                        <GuestIdUpload
                          key={guestKeys[i]}
                          guestIndex={i}
                          onVerified={(id) => handleGuestVerified(i, id)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Add Guest button */}
                  {numPeople < 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNumPeople(prev => prev + 1)
                        setVerifiedIds(prev => [...prev, null])
                        setGuestKeys(prev => [...prev, nextKeyRef.current++])
                      }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 text-xs font-bold hover:bg-blue-50 hover:border-blue-400 transition-all active:scale-[0.98]"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Another Guest
                    </button>
                  )}

                  {/* All done banner */}
                  {allVerified && (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-green-800">
                        All {numPeople} guest{numPeople > 1 ? 's' : ''} verified — ready to check in!
                      </p>
                    </div>
                  )}

                  {!allVerified && verifiedCount > 0 && (
                    <p className="text-xs text-amber-600 font-medium text-center">
                      {numPeople - verifiedCount} more guest ID{numPeople - verifiedCount > 1 ? 's' : ''} needed.
                    </p>
                  )}
                </div>

                {/* Submit — only shows when all verified */}
                {allVerified && (
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 mt-2 shadow-lg shadow-green-100 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? 'Completing Check-in...'
                      : `Complete Check-in for ${numPeople} Guest${numPeople > 1 ? 's' : ''}`}
                  </Button>
                )}
              </form>

              <div className="text-center mt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 py-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm border-2 cursor-pointer transition active:scale-[0.99]"
                  onClick={() => setIsRegisterMode(true)}
                >
                  <Plus className="w-5 h-5" />
                  Digitize Physical Register (Register OCR)
                </Button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
