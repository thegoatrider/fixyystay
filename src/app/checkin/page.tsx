'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle, Users, Phone, User, ShieldCheck,
  HelpCircle, Globe, Instagram, Facebook
} from 'lucide-react'
import { submitCheckin, getPropertyInfo } from './actions'
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
  const [checkinDate, setCheckinDate] = useState('')
  const [checkoutDate, setCheckoutDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ propertyName: string, helpdesk: string } | null>(null)
  const [propertyInfo, setPropertyInfo] = useState<{ name: string, helpdesk_number: string } | null>(null)

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
                  <GuestIdUpload
                    key={i}
                    guestIndex={i}
                    onVerified={(id) => handleGuestVerified(i, id)}
                  />
                ))}
              </div>

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
        )}
      </div>
    </div>
  )
}
