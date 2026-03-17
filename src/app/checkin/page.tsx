'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Upload, Users, Phone, User, ShieldCheck, HelpCircle } from 'lucide-react'
import { submitCheckin } from './actions'
import { Suspense } from 'react'

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

  const [step, setStep] = useState(1) // 1: Info, 2: Success
  const [isOtpVerified, setIsOtpVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [numPeople, setNumPeople] = useState(1)
  const [checkinDate, setCheckinDate] = useState('')
  const [checkoutDate, setCheckoutDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ propertyName: string, helpdesk: string } | null>(null)

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

  const handleVerifyOtp = () => {
    if (!guestPhone) return
    setIsVerifying(true)
    // Simulate API delay
    setTimeout(() => {
      setIsVerifying(false)
      setIsOtpVerified(true)
    }, 1500)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isOtpVerified) {
      alert('Please verify your phone number first.')
      return
    }
    
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append('propertyId', propertyId)
    formData.append('guestPhone', guestPhone)
    formData.append('guestName', guestName)
    formData.append('numPeople', numPeople.toString())
    formData.append('checkinDate', checkinDate)
    formData.append('checkoutDate', checkoutDate)

    const result = await submitCheckin(formData)

    if (result.success) {
      setSuccessData({
        propertyName: result.propertyName!,
        helpdesk: result.helpdeskNumber! || 'Contact Support'
      })
      setStep(2)
    } else {
      alert(result.error)
    }
    setIsLoading(false)
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Check-in Complete!</h1>
          <p className="text-xl text-gray-600 mb-8">
            Welcome to <span className="font-bold text-blue-600">{successData?.propertyName}</span>!
          </p>
          
          <div className="w-full bg-blue-50 border border-blue-100 p-6 rounded-2xl text-left mb-8">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Important Info
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              We've received your details. Please head to the property entrance. This is **FixyStay**. 
            </p>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Helpdesk Number</div>
              <div className="text-xl font-bold text-blue-900">{successData?.helpdesk}</div>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm">
            Enjoy your stay with us!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="text-center">
          <div className="font-bold text-2xl text-blue-600 mb-4">FixyStay</div>
          <h1 className="text-4xl font-extrabold text-gray-900">Guest Check-in</h1>
          <p className="text-gray-500 mt-2">Please provide your details and ID for a smooth entry.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border shadow-xl rounded-3xl p-8 flex flex-col gap-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="w-4 h-4"/> Phone Number</Label>
              <div className="flex gap-2">
                <Input 
                  id="phone" 
                  placeholder="9876543210" 
                  required 
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  disabled={isOtpVerified}
                />
                <Button 
                  type="button" 
                  onClick={handleVerifyOtp} 
                  disabled={!guestPhone || isVerifying || isOtpVerified}
                  variant={isOtpVerified ? "outline" : "default"}
                  className={isOtpVerified ? "border-green-200 text-green-600 bg-green-50" : ""}
                >
                  {isVerifying ? 'Wait...' : isOtpVerified ? 'Verified' : 'Verify'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1"><User className="w-4 h-4"/> Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                required 
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="checkinDate">Check-in Date</Label>
              <Input 
                id="checkinDate" 
                type="date" 
                required 
                value={checkinDate}
                onChange={(e) => setCheckinDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkoutDate">Check-out Date</Label>
              <Input 
                id="checkoutDate" 
                type="date" 
                required 
                value={checkoutDate}
                onChange={(e) => setCheckoutDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pax" className="flex items-center gap-1"><Users className="w-4 h-4"/> Number of People Staying</Label>
            <Input 
              id="pax" 
              type="number" 
              min={1} 
              max={20} 
              required 
              value={numPeople}
              onChange={(e) => setNumPeople(parseInt(e.target.value))}
            />
          </div>

          <div className="mt-4">
            <Label className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
               Government ID Verification
            </Label>
            <p className="text-sm text-gray-500 mb-6">Upload one valid govt. ID (Aadhar, PAN, Passport) for each person.</p>
            
            <div className="flex flex-col gap-4">
              {Array.from({ length: numPeople }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4 p-5 border rounded-2xl bg-gray-50 shadow-sm">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-bold text-gray-700">Guest {i + 1} Documents</span>
                    <span className="text-[10px] font-bold uppercase text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Mandatory</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Front ID */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Front Side of ID</Label>
                      <div className="relative group">
                        <input 
                          type="file" 
                          name={`guestID_front_${i}`}
                          accept="image/*" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                          required
                        />
                        <div className="bg-white border-2 border-dashed border-gray-200 group-hover:border-blue-300 group-hover:bg-blue-50/50 rounded-xl py-6 transition-all flex flex-col items-center justify-center gap-1 text-center px-2">
                          <Upload className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                          <span className="text-[10px] text-gray-400 group-hover:text-blue-600 font-medium">Click to Upload Front</span>
                        </div>
                      </div>
                    </div>

                    {/* Back ID */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Back Side of ID</Label>
                      <div className="relative group">
                        <input 
                          type="file" 
                          name={`guestID_back_${i}`}
                          accept="image/*" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                          required
                        />
                        <div className="bg-white border-2 border-dashed border-gray-200 group-hover:border-blue-300 group-hover:bg-blue-50/50 rounded-xl py-6 transition-all flex flex-col items-center justify-center gap-1 text-center px-2">
                          <Upload className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                          <span className="text-[10px] text-gray-400 group-hover:text-blue-600 font-medium">Click to Upload Back</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 mt-4"
            disabled={isLoading || !isOtpVerified}
          >
            {isLoading ? 'Processing Check-in...' : 'Complete Check-in'}
          </Button>

          <p className="text-center text-xs text-gray-400 mt-2">
            Your data is secured and will only be shared with the property.
          </p>
        </form>
      </div>
    </div>
  )
}
