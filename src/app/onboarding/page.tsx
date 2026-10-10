'use client'

import { useState, useEffect, Suspense } from 'react'
import { submitOnboarding, checkEmailAvailability } from './actions'
import { createOwnerOrder, verifyAndUpgrade } from '../pricing/business/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building, Lock, Mail, User, CheckCircle2, ArrowRight, Zap, ShieldCheck, Crown, Check, AlertCircle, MapPin, Loader2 } from 'lucide-react'
import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { INDIAN_STATES_AND_CITIES, ALL_POPULAR_CITIES } from '@/lib/india-locations'

const SHARED_FEATURES = [
  "List Unlimited Properties",
  "Instant Lead Notifications",
  "Virtual Wallet & Payouts",
  "Verified Business Badge",
  "Dedicated Support"
]

const PLANS = [
  { name: "3 Months", price: 300, discount: 0, bestValue: false, icon: Zap },
  { name: "6 Months", price: 600, discount: 0, bestValue: true, icon: ShieldCheck },
  { name: "12 Months", price: 1200, discount: 0, bestValue: false, icon: Crown }
]

function OnboardingContent() {
  const searchParams = useSearchParams()
  const initialStep = searchParams.get('step') === 'payment' ? 2 : 1
  const isUnpaidRedirect = searchParams.get('reason') === 'unpaid'

  const [step, setStep] = useState(initialStep)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [ownerId, setOwnerId] = useState<string | null>(null)

  // Property Location states
  const [pincode, setPincode] = useState('')
  const [selectedCity, setSelectedCity] = useState('Alibag')
  const [customCity, setCustomCity] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [customArea, setCustomArea] = useState('')
  const [selectedState, setSelectedState] = useState('Maharashtra')
  const [availableAreas, setAvailableAreas] = useState<string[]>([])
  const [isDetectingPin, setIsDetectingPin] = useState(false)
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPincode(val)
    setPinError(null)

    if (val.length === 6) {
      setIsDetectingPin(true)
      try {
        const res = await fetch(`/api/pincode/${val}`)
        const data = await res.json()
        if (data.success) {
          setDetectedLocation(`${data.city}, ${data.state}`)
          if (data.state) setSelectedState(data.state)

          // Match city to our comprehensive city list if possible
          const rawCity = (data.city || '').toLowerCase()
          let matchedCity = data.city || ''

          for (const [st, cities] of Object.entries(INDIAN_STATES_AND_CITIES)) {
            const found = cities.find(c => 
              c.toLowerCase() === rawCity ||
              rawCity.includes(c.toLowerCase()) ||
              c.toLowerCase().includes(rawCity)
            )
            if (found) {
              matchedCity = found
              setSelectedState(st)
              break
            }
          }

          setSelectedCity(matchedCity)

          if (Array.isArray(data.areas) && data.areas.length > 0) {
            setAvailableAreas(data.areas)
            setSelectedArea(data.areas[0])
          } else {
            setAvailableAreas([])
            setSelectedArea(data.city || '')
          }
        } else {
          setPinError(data.error || 'Pincode not recognized')
          setDetectedLocation(null)
        }
      } catch (err) {
        console.error('Failed to lookup pincode:', err)
        setPinError('Could not verify pincode')
      } finally {
        setIsDetectingPin(false)
      }
    } else {
      setDetectedLocation(null)
      if (val.length === 0) {
        setAvailableAreas([])
      }
    }
  }

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity)
    for (const [st, cities] of Object.entries(INDIAN_STATES_AND_CITIES)) {
      if (cities.includes(newCity)) {
        setSelectedState(st)
        break
      }
    }
  }

  // If redirected with step=payment, fetch current session email
  useEffect(() => {
    const fetchCurrentSession = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setUserName(user.user_metadata?.name || user.email.split('@')[0])
        const { data: owner } = await supabase.from('owners').select('id').eq('email', user.email.toLowerCase()).maybeSingle()
        if (owner?.id) setOwnerId(owner.id)
        if (searchParams.get('step') === 'payment') setStep(2)
      }
    }
    fetchCurrentSession()
  }, [searchParams])

  const handleAccountCreation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading('account')
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string)?.trim()
    const name = formData.get('name') as string

    // 1. Check if email is already registered and has an active subscription
    const checkRes = await checkEmailAvailability(email) as any
    if (checkRes.error) {
      setError(checkRes.error)
      setLoading(null)
      return
    }

    // 2. Register and create account in Supabase FIRST before proceeding to payment
    try {
      const regRes = await submitOnboarding(formData)
      if (regRes.error) {
        setError(regRes.error)
        setLoading(null)
        return
      }

      setUserEmail(email)
      setUserName(name)
      if (regRes.ownerId) {
        setOwnerId(regRes.ownerId)
      }
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during account registration.')
    } finally {
      setLoading(null)
    }
  }

  const handlePayment = async (planName: string, amount: number) => {
    setLoading(planName)
    try {
      const fullName = `Business ${planName}`
      const res = await createOwnerOrder(fullName, amount, userEmail, ownerId || undefined)
      if (res.error) throw new Error(res.error)

      const options = {
        key: res.key,
        amount: res.amount,
        currency: "INR",
        name: "FixyStays Onboarding",
        description: `Subscription: ${fullName} Plan`,
        order_id: res.orderId,
        prefill: { email: userEmail },
        theme: { color: "#4F46E5" },
        webview_intent: true,
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI (Google Pay, PhonePe, Paytm, QR)",
                instruments: [
                  {
                    method: "upi"
                  }
                ]
              },
              other: {
                name: "Cards, Netbanking & Wallets",
                instruments: [
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" },
                  { method: "emi" }
                ]
              }
            },
            sequence: ["block.upi", "block.other"],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        handler: async function (response: any) {
          setLoading('Processing...')
          // Verify and activate subscription
          const verifyRes = await verifyAndUpgrade(response.razorpay_order_id)
          if (verifyRes.success) {
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          } else {
            alert(`Payment Successful, updating dashboard access: ${verifyRes.error || 'Done'}`)
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          }
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden selection:bg-blue-500/30">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <div className="w-full max-w-6xl px-6 py-12 md:py-24 z-10">
        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Sales Pitch */}
            <div className="flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 w-fit text-sm text-blue-700 font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
                New Customer Onboarding
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900">
                Grow your property <br/>
                <span className="text-blue-600">
                  revenue instantly.
                </span>
              </h1>
              
              <p className="text-gray-600 text-lg max-w-md leading-relaxed font-medium">
                Join FixyStays to manage your properties, automate bookings, and access our exclusive influencer network.
              </p>

              <div className="flex flex-col gap-4 mt-4">
                {SHARED_FEATURES.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="bg-white border border-gray-200 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="relative z-10">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
                  <p className="text-gray-500 font-medium">Fill in your details to create your owner account before selecting a plan.</p>
                </div>

                <form onSubmit={handleAccountCreation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-bold">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        id="name"
                        name="name" 
                        placeholder="John Doe" 
                        required 
                        className="pl-10 bg-white border-gray-200 focus:border-blue-600 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-bold">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        id="email"
                        name="email" 
                        type="email"
                        placeholder="john@example.com" 
                        required 
                        className="pl-10 bg-white border-gray-200 focus:border-blue-600 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-bold">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        id="password"
                        name="password" 
                        type="password"
                        placeholder="••••••••" 
                        required 
                        minLength={6}
                        className="pl-10 bg-white border-gray-200 focus:border-blue-600 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyName" className="text-gray-700 font-bold">Property Name (Optional)</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        id="propertyName"
                        name="propertyName" 
                        placeholder="Sunset Villa" 
                        className="pl-10 bg-white border-gray-200 focus:border-blue-600 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Property Location with Pincode Auto-detection */}
                  <div className="pt-3 border-t border-gray-100 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-900 font-bold text-sm flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        Property Location
                      </Label>
                      <span className="text-[11px] text-blue-600 font-bold bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                        All India
                      </span>
                    </div>

                    {/* Area Pincode with Auto-detection status */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pincode" className="text-gray-700 font-semibold text-xs">
                          Area Pincode <span className="text-blue-600 font-bold">(Auto-detects City & Area)</span>
                        </Label>
                        {isDetectingPin && (
                          <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Detecting...
                          </span>
                        )}
                        {detectedLocation && (
                          <span className="text-[11px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                            <CheckCircle2 className="w-3 h-3 text-green-600" /> {detectedLocation}
                          </span>
                        )}
                        {pinError && (
                          <span className="text-[11px] text-amber-600 font-medium">
                            {pinError}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="pincode"
                          name="pincode"
                          type="text"
                          maxLength={6}
                          value={pincode}
                          onChange={handlePincodeChange}
                          placeholder="e.g. 402201, 403516, 560001, 110001"
                          className="pl-10 bg-white border-gray-200 focus:border-blue-600 text-gray-900 placeholder:text-gray-400 h-11 rounded-xl shadow-sm text-sm"
                        />
                      </div>
                    </div>

                    {/* City Dropdown & Area Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* City Across India */}
                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-gray-700 font-semibold text-xs">
                          City / Destination
                        </Label>
                        <select
                          id="city"
                          name="city"
                          value={selectedCity}
                          onChange={(e) => handleCityChange(e.target.value)}
                          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="">Select City across India...</option>
                          {selectedCity && selectedCity !== 'Other' && !ALL_POPULAR_CITIES.includes(selectedCity) && (
                            <option value={selectedCity}>{selectedCity}</option>
                          )}
                          {Object.entries(INDIAN_STATES_AND_CITIES).map(([state, cities]) => (
                            <optgroup key={state} label={`── ${state} ──`}>
                              {cities.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </optgroup>
                          ))}
                          <option value="Other">Other / Custom City...</option>
                        </select>
                      </div>

                      {/* Area / Sub-locality */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cityArea" className="text-gray-700 font-semibold text-xs">
                          Area / Sub-locality
                        </Label>
                        {availableAreas.length > 0 ? (
                          <select
                            id="cityArea"
                            name="cityArea"
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          >
                            {availableAreas.map((a) => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                            <option value="custom">Other / Custom Locality...</option>
                          </select>
                        ) : (
                          <Input
                            id="cityArea"
                            name="cityArea"
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            placeholder="e.g. Kihim, Calangute, Indiranagar"
                            className="bg-white border-gray-200 focus:border-blue-600 text-gray-900 placeholder:text-gray-400 h-11 rounded-xl shadow-sm text-sm"
                          />
                        )}
                      </div>
                    </div>

                    {/* Custom City if 'Other' is chosen */}
                    {selectedCity === 'Other' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="customCity" className="text-gray-700 font-semibold text-xs">Custom City Name</Label>
                        <Input
                          id="customCity"
                          name="customCity"
                          value={customCity}
                          onChange={(e) => setCustomCity(e.target.value)}
                          placeholder="Enter your city / district name"
                          className="bg-white border-gray-200 focus:border-blue-600 text-gray-900 placeholder:text-gray-400 h-11 rounded-xl shadow-sm text-sm"
                        />
                      </div>
                    )}

                    {/* Custom Area if 'custom' is chosen */}
                    {selectedArea === 'custom' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="customArea" className="text-gray-700 font-semibold text-xs">Custom Area Name</Label>
                        <Input
                          id="customArea"
                          name="customArea"
                          value={customArea}
                          onChange={(e) => setCustomArea(e.target.value)}
                          placeholder="Enter neighborhood / area name"
                          className="bg-white border-gray-200 focus:border-blue-600 text-gray-900 placeholder:text-gray-400 h-11 rounded-xl shadow-sm text-sm"
                        />
                      </div>
                    )}

                    {/* Hidden State Input */}
                    <input type="hidden" name="state" value={selectedState} />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={loading === 'account'}
                    className="w-full h-12 mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg flex items-center justify-center gap-2 transition-all rounded-xl shadow-md"
                  >
                    {loading === 'account' ? 'Creating Account...' : 'Continue to Payment'}
                    {loading !== 'account' && <ArrowRight className="w-5 h-5" />}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {isUnpaidRedirect && (
              <div className="mb-8 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl max-w-xl text-sm font-semibold shadow-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Your account is registered! Please select a subscription plan below to activate your account and access the Owner Dashboard.</span>
              </div>
            )}
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Select Your Plan</h2>
              <p className="text-gray-500 text-lg font-medium">Your account <span className="text-blue-600 font-bold">{userEmail}</span> is ready. Choose a subscription to activate it.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-white border-2 rounded-3xl p-8 flex flex-col transition-all hover:-translate-y-1 ${plan.bestValue ? 'border-blue-600 shadow-[0_8px_30px_rgb(37,99,235,0.12)]' : 'border-gray-200 shadow-sm hover:border-gray-300'}`}
                >
                  {plan.bestValue && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-blue-600 shadow-lg">
                      Most Popular
                    </div>
                  )}

                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-blue-50 text-blue-600">
                    <plan.icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>

                  <div className="mb-8 font-black flex items-center gap-2">
                    <span className="text-4xl text-gray-900">₹{plan.price}</span>
                    {plan.discount > 0 && (
                      <span className="px-2 py-0.5 rounded text-sm mb-auto bg-blue-50 text-blue-600">
                        {plan.discount}% OFF
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 mb-10 text-left flex-grow">
                    {SHARED_FEATURES.map(f => (
                      <div key={f} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600 font-medium leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handlePayment(plan.name, plan.price)}
                    disabled={loading === plan.name || loading === 'Processing...'}
                    className={`w-full py-6 rounded-2xl text-lg font-bold transition-all shadow-sm ${
                      plan.bestValue ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {loading === plan.name || loading === 'Processing...' ? 'Processing...' : `Choose ${plan.name}`}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
        Loading...
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
