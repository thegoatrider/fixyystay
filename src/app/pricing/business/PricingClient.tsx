'use client'

import { useState } from 'react'
import { Check, Zap, Star, ShieldCheck, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createOwnerOrder } from './actions'
import Script from 'next/script'

const SHARED_FEATURES = [
  "List Unlimited Properties",
  "Instant Lead Notifications",
  "Virtual Wallet & Payouts",
  "Verified Business Badge",
  "Dedicated Support"
]

const PLANS = [
  {
    name: "Monthly",
    price: 399,
    originalPrice: 399,
    discount: 0,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: Zap
  },
  {
    name: "Quarterly",
    price: 1099,
    originalPrice: 1197,
    discount: 8,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: Star
  },
  {
    name: "6 Months",
    price: 1999,
    originalPrice: 2394,
    discount: 16,
    features: SHARED_FEATURES,
    bestValue: true,
    icon: ShieldCheck
  },
  {
    name: "Yearly",
    price: 3999,
    originalPrice: 4788,
    discount: 16,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: Crown
  }
]

export default function PricingClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const handlePayment = async (planName: string, amount: number) => {
    if (!email) {
      alert("Please enter your email to proceed.")
      return
    }

    setLoading(planName)
    try {
      const res = await createOwnerOrder(planName, amount, email)
      if (res.error) throw new Error(res.error)

      // Handle Razorpay Checkout
      const options = {
        key: res.key,
        amount: res.amount,
        currency: "INR",
        name: "FixStay Business",
        description: `Subscription: ${planName} Plan`,
        order_id: res.orderId,
        prefill: {
          email: email,
        },
        theme: {
          color: "#2563eb",
        },
        handler: function (response: any) {
          alert(`Payment Successful! Order ID: ${response.razorpay_order_id}. Please email support@fixstay.com to activate your login.`)
          window.location.href = "/pricing/business/success"
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
    <div className="min-h-screen bg-gray-50 py-20 px-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="max-w-6xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
          Scale Your Rental <span className="text-blue-600">Business</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          List your properties, manage leads, and grow with the most advanced property management tool for India.
        </p>
      </div>

      <div className="max-w-sm mx-auto mb-16 px-4">
        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-center">Your Registered Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full border-2 border-blue-100 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg font-medium shadow-sm active:scale-[0.98]"
        />
        <p className="text-[10px] text-gray-400 mt-2 text-center">We will use this email to create your owner account.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-white border-2 rounded-3xl p-8 flex flex-col transition-all hover:shadow-2xl hover:-translate-y-2 ${plan.bestValue ? 'border-blue-600 shadow-xl' : 'border-gray-100'}`}
          >
            {plan.bestValue && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                Most Popular
              </div>
            )}

            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <plan.icon className="text-blue-600 w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">{plan.name}</h3>

            <div className="mb-8 font-black">
              <div className="flex items-center gap-2">
                <span className="text-4xl">₹{plan.price}</span>
                {plan.discount > 0 && (
                  <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm mb-auto">
                    {plan.discount}% OFF
                  </span>
                )}
              </div>
              {plan.originalPrice > plan.price && (
                <div className="text-gray-400 line-through text-sm mt-1">₹{plan.originalPrice}</div>
              )}
            </div>

            <div className="space-y-4 mb-10 text-left flex-grow">
              {plan.features.map(f => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 font-medium leading-tight">{f}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => handlePayment(plan.name, plan.price)}
              disabled={loading === plan.name}
              className={`w-full py-7 rounded-2xl text-lg font-black transition-all active:scale-95 shadow-lg ${plan.bestValue ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-900 hover:bg-black text-white'}`}
            >
              {loading === plan.name ? '...' : `Choose ${plan.name}`}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center text-gray-400 text-sm max-w-xl mx-auto">
        <p>By clicking Choose Plan, you agree to our terms and conditions. Once payment is confirmed, please allow 2-4 hours for account activation.</p>
        <p className="mt-2 font-bold text-gray-500">Need help? WhatsApp: +91 75062 88907</p>
      </div>
    </div>
  )
}
