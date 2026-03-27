'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Upload, Users, Phone, User, ShieldCheck, HelpCircle, Globe, Instagram, Facebook } from 'lucide-react'
import { submitCheckin } from './actions'
import { cn } from '@/lib/utils'
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

  // File Preview State
  const [previews, setPreviews] = useState<Record<string, string>>({})
  
  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      Object.values(previews).forEach(url => URL.revokeObjectURL(url))
    }
  }, [previews])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviews(prev => ({ ...prev, [key]: url }))
    }
  }

  const removeFile = (key: string) => {
    setPreviews(prev => {
      const newPreviews = { ...prev }
      if (newPreviews[key]) {
        URL.revokeObjectURL(newPreviews[key])
        delete newPreviews[key]
      }
      return newPreviews
    })
    
    // Also reset the input value
    const input = document.getElementsByName(key)[0] as HTMLInputElement
    if (input) input.value = ''
  }

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

    try {
      const result = await submitCheckin(formData)

      if (result.success) {
        setSuccessData({
          propertyName: result.propertyName || 'the property',
          helpdesk: result.helpdeskNumber || 'Contact Support'
        })
        setStep(2)
      } else {
        // Log the specific error for debugging
        console.error('Check-in Submission Failed:', result.error)
        alert(`Check-in failed: ${result.error}`)
      }
    } catch (err: any) {
      console.error('Checkin Error:', err)
      alert('An unexpected server error occurred while submitting your check-in. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 2) {
    const whatsappLink = successData?.helpdesk 
      ? `https://wa.me/${successData.helpdesk.replace(/\D/g, '')}`
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
              We&apos;ve received your details. Please head to the property entrance. This is **Fixy Stays**. 
            </p>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Helpdesk Number</div>
              <div className="text-xl font-bold text-blue-900">{successData?.helpdesk}</div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3 mb-8">
            <Button 
              asChild 
              className="w-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white border-0 shadow-md flex items-center justify-center gap-2"
            >
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <HelpCircle className="w-5 h-5" /> Help & Support (WhatsApp)
              </a>
            </Button>
            
            <div className="grid grid-cols-3 gap-2">
              <Button asChild variant="outline" className="h-12 border-gray-200 text-gray-600 hover:text-blue-600">
                <a href="https://fixystays.com" target="_blank" rel="noopener noreferrer">
                  <Globe className="w-5 h-5" />
                </a>
              </Button>
              <Button asChild variant="outline" className="h-12 border-gray-200 text-gray-600 hover:text-pink-600">
                <a href="https://instagram.com/fixystays" target="_blank" rel="noopener noreferrer">
                  <Instagram className="w-5 h-5" />
                </a>
              </Button>
              <Button asChild variant="outline" className="h-12 border-gray-200 text-gray-600 hover:text-blue-800">
                <a href="https://facebook.com/fixystays" target="_blank" rel="noopener noreferrer">
                  <Facebook className="w-5 h-5" />
                </a>
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
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="text-center">
          <Link href="/" className="font-bold text-2xl text-blue-600 mb-4 inline-block hover:text-blue-700 transition">
            Fixy Stays
          </Link>
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
            <select 
              id="pax" 
              className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required 
              value={numPeople}
              onChange={(e) => setNumPeople(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <Label className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
               Government ID Verification
            </Label>
            <p className="text-sm text-gray-500 mb-6">Upload mandatory front and back ID photos for each guest.</p>
            
            <div className="flex flex-col gap-6">
              {Array.from({ length: numPeople }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4 p-5 border rounded-2xl bg-gray-50 shadow-sm border-gray-200">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-bold text-gray-700">Guest {i + 1} Documents</span>
                    <span className="text-[10px] font-bold uppercase text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Mandatory</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Front ID */}
                    <div className="space-y-2 relative group">
                      <Label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Front Side</Label>
                      
                      <div className="relative w-full aspect-[4/3]">
                        <input 
                          type="file" 
                          name={`guestID_front_${i}`}
                          accept="image/*" 
                          className={cn(
                            "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10", 
                            previews[`guestID_front_${i}`] ? "hidden" : "block"
                          )}
                          required={!previews[`guestID_front_${i}`]}
                          onChange={(e) => handleFileChange(e, `guestID_front_${i}`)}
                        />
                        
                        {previews[`guestID_front_${i}`] ? (
                          <div className="absolute inset-0 rounded-xl overflow-hidden border-2 border-blue-400">
                            <img src={previews[`guestID_front_${i}`]} alt="Front ID Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeFile(`guestID_front_${i}`)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-white border-2 border-dashed border-gray-200 group-hover:border-blue-300 group-hover:bg-blue-50/50 rounded-xl transition-all flex flex-col items-center justify-center gap-1 text-center px-2 pointer-events-none">
                            <Upload className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                            <span className="text-[10px] text-gray-400 group-hover:text-blue-600 font-medium">Upload Front</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Back ID */}
                    <div className="space-y-2 relative group">
                      <Label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Back Side</Label>
                      
                      <div className="relative w-full aspect-[4/3]">
                        <input 
                          type="file" 
                          name={`guestID_back_${i}`}
                          accept="image/*" 
                          className={cn(
                            "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10", 
                            previews[`guestID_back_${i}`] ? "hidden" : "block"
                          )}
                          required={!previews[`guestID_back_${i}`]}
                          onChange={(e) => handleFileChange(e, `guestID_back_${i}`)}
                        />
                        
                        {previews[`guestID_back_${i}`] ? (
                          <div className="absolute inset-0 rounded-xl overflow-hidden border-2 border-blue-400">
                            <img src={previews[`guestID_back_${i}`]} alt="Back ID Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeFile(`guestID_back_${i}`)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-white border-2 border-dashed border-gray-200 group-hover:border-blue-300 group-hover:bg-blue-50/50 rounded-xl transition-all flex flex-col items-center justify-center gap-1 text-center px-2 pointer-events-none">
                            <Upload className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                            <span className="text-[10px] text-gray-400 group-hover:text-blue-600 font-medium">Upload Back</span>
                          </div>
                        )}
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
            className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 mt-4 shadow-lg shadow-blue-100"
            disabled={isLoading || !isOtpVerified}
          >
            {isLoading ? 'Processing Check-in...' : 'Complete Check-in'}
          </Button>

          <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">
             Security Policy: All IDs are stored securely in our encrypted vaults.
          </p>
        </form>
      </div>
    </div>
  )
}
