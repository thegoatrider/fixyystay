'use client'

import { useState } from 'react'
import { submitOnboarding, checkEmailAvailability } from './actions'
import { createOwnerOrder, verifyAndUpgrade } from '../pricing/business/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building, Lock, Mail, User, CheckCircle2, ArrowRight, Zap, ShieldCheck, Crown, Check } from 'lucide-react'
import Script from 'next/script'

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

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [propertyName, setPropertyName] = useState('')

  const handleAccountCreation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading('account')
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const password = formData.get('password') as string
    const propName = formData.get('propertyName') as string

    // 1. Check if email is already registered before proceeding
    const checkRes = await checkEmailAvailability(email) as any
    if (checkRes.error) {
      setError(checkRes.error)
      setLoading(null)
      return
    }

    if (checkRes.pendingRegistration) {
      // User has already paid but their account registration is pending.
      // Complete their onboarding directly without requesting payment again!
      setLoading('Completing account setup...')
      const submitData = new FormData()
      submitData.append('name', name)
      submitData.append('email', email)
      submitData.append('password', password)
      if (propName) submitData.append('propertyName', propName)

      try {
        const submitRes = await submitOnboarding(submitData)
        if (submitRes.success) {
          window.location.href = `/dashboard/owner`
        } else {
          setError(submitRes.error || 'Failed to complete registration')
          setLoading(null)
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.')
        setLoading(null)
      }
      return
    }

    // 2. Save credentials in local state and transition to Step 2
    setUserEmail(email)
    setUserName(name)
    setUserPassword(password)
    setPropertyName(propName)
    setStep(2)
    setLoading(null)
  }

  const handlePayment = async (planName: string, amount: number) => {
    setLoading(planName)
    try {
      const fullName = `Business ${planName}`
      const res = await createOwnerOrder(fullName, amount, userEmail)
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
        handler: async function (response: any) {
          setLoading('Processing...')
          // Call verifyAndUpgrade passing registration details as signupData
          const verifyRes = await verifyAndUpgrade(response.razorpay_order_id, {
            name: userName,
            password: userPassword,
            propertyName: propertyName || undefined
          })
          if (verifyRes.success) {
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          } else {
            alert(`Payment Successful, but account setup failed: ${verifyRes.error}. Please contact support.`)
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
