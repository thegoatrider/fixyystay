'use client'

import { useState } from 'react'
import { submitOnboarding } from './actions'
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
  { name: "Monthly", price: 99, discount: 0, bestValue: false, icon: Zap },
  { name: "6 Months", price: 500, discount: 16, bestValue: true, icon: ShieldCheck },
  { name: "Yearly", price: 1000, discount: 16, bestValue: false, icon: Crown }
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')

  const handleAccountCreation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading('account')
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const result = await submitOnboarding(formData)

    if (result.error) {
      setError(result.error)
      setLoading(null)
    } else if (result.success) {
      setUserEmail(email)
      setStep(2)
      setLoading(null)
    }
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
          const verifyRes = await verifyAndUpgrade(response.razorpay_order_id)
          if (verifyRes.success) {
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          } else {
            alert(`Payment Successful, but account upgrade failed: ${verifyRes.error}. Please contact support.`)
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
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden selection:bg-indigo-500/30">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-6xl px-6 py-12 md:py-24 z-10">
        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Sales Pitch */}
            <div className="flex flex-col gap-6 text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 w-fit text-sm text-indigo-300 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                New Customer Onboarding
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Grow your property <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                  revenue instantly.
                </span>
              </h1>
              
              <p className="text-neutral-400 text-lg max-w-md leading-relaxed">
                Join FixyStays to manage your properties, automate bookings, and access our exclusive influencer network.
              </p>

              <div className="flex flex-col gap-4 mt-4">
                {SHARED_FEATURES.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 rounded-2xl shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-2xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
                  <p className="text-neutral-400">Fill in your details to create your owner account before selecting a plan.</p>
                </div>

                <form onSubmit={handleAccountCreation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-neutral-300">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <Input 
                        id="name"
                        name="name" 
                        placeholder="John Doe" 
                        required 
                        className="pl-10 bg-neutral-950 border-neutral-800 focus:border-indigo-500 text-white placeholder:text-neutral-600 h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-neutral-300">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <Input 
                        id="email"
                        name="email" 
                        type="email"
                        placeholder="john@example.com" 
                        required 
                        className="pl-10 bg-neutral-950 border-neutral-800 focus:border-indigo-500 text-white placeholder:text-neutral-600 h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-neutral-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <Input 
                        id="password"
                        name="password" 
                        type="password"
                        placeholder="••••••••" 
                        required 
                        minLength={6}
                        className="pl-10 bg-neutral-950 border-neutral-800 focus:border-indigo-500 text-white placeholder:text-neutral-600 h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyName" className="text-neutral-300">Property Name (Optional)</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <Input 
                        id="propertyName"
                        name="propertyName" 
                        placeholder="Sunset Villa" 
                        className="pl-10 bg-neutral-950 border-neutral-800 focus:border-indigo-500 text-white placeholder:text-neutral-600 h-12"
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
                    className="w-full h-12 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-lg flex items-center justify-center gap-2 transition-all"
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
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Select Your Plan</h2>
              <p className="text-neutral-400 text-lg">Your account <span className="text-indigo-400 font-medium">{userEmail}</span> is ready. Choose a subscription to activate it.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-neutral-900/80 backdrop-blur-sm border-2 rounded-3xl p-8 flex flex-col transition-all hover:-translate-y-1 ${plan.bestValue ? 'border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.2)]' : 'border-neutral-800'}`}
                >
                  {plan.bestValue && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-indigo-600 shadow-lg">
                      Most Popular
                    </div>
                  )}

                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-indigo-500/10 text-indigo-400">
                    <plan.icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>

                  <div className="mb-8 font-black flex items-center gap-2">
                    <span className="text-4xl text-white">₹{plan.price}</span>
                    {plan.discount > 0 && (
                      <span className="px-2 py-0.5 rounded text-sm mb-auto bg-indigo-500/10 text-indigo-400">
                        {plan.discount}% OFF
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 mb-10 text-left flex-grow">
                    {SHARED_FEATURES.map(f => (
                      <div key={f} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-neutral-300 font-medium leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handlePayment(plan.name, plan.price)}
                    disabled={loading === plan.name || loading === 'Processing...'}
                    className={`w-full py-6 rounded-2xl text-lg font-bold transition-all shadow-lg text-white ${
                      plan.bestValue ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-neutral-800 hover:bg-neutral-700'
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
