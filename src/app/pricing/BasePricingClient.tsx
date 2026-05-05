'use client'

import { useState } from 'react'
import { Check, Zap, Star, ShieldCheck, Crown, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createOwnerOrder, verifyAndUpgrade } from './business/actions'
import Script from 'next/script'

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Star,
  ShieldCheck,
  Crown
}

export interface PricingPlan {
  name: string
  price: number
  originalPrice: number
  discount: number
  features: string[]
  bestValue: boolean
  icon: string
}

interface BasePricingClientProps {
  tierName: string
  title: React.ReactNode
  description: string
  plans: PricingPlan[]
  successUrl: string
  themeColor?: string
}

export default function BasePricingClient({
  tierName,
  title,
  description,
  plans,
  successUrl,
  themeColor = "#2563eb"
}: BasePricingClientProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const handlePayment = async (planName: string, amount: number) => {
    console.log(`Payment triggered for ${planName} (₹${amount}) with email ${email}`)
    if (!email) {
      alert("Please enter your email to proceed.")
      return
    }

    setLoading(planName)
    try {
      // Use the generic name for the order (e.g. "Starter Monthly")
      const fullName = tierName ? `${tierName} ${planName}` : planName
      const res = await createOwnerOrder(fullName, amount, email)
      if (res.error) throw new Error(res.error)

      // Handle Razorpay Checkout
      const options = {
        key: res.key,
        amount: res.amount,
        currency: "INR",
        name: `FixStay ${tierName || 'Business'}`,
        description: `Subscription: ${fullName} Plan`,
        order_id: res.orderId,
        prefill: {
          email: email,
        },
        theme: {
          color: themeColor,
        },
        handler: async function (response: any) {
          setLoading('Processing...')
          const res = await verifyAndUpgrade(response.razorpay_order_id)
          if (res.success) {
            alert(`Payment Successful! Your account has been upgraded automatically.`)
            window.location.href = successUrl
          } else {
            alert(`Payment Successful, but automatic upgrade failed: ${res.error}. Please contact support with Order ID: ${response.razorpay_order_id}`)
            window.location.href = successUrl
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
    <div className="min-h-screen bg-gray-50 py-20 px-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="max-w-6xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
          {title}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="max-w-sm mx-auto mb-16 px-4">
        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-center">Your Registered Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          style={{ borderColor: `${themeColor}20` }}
          className="w-full border-2 rounded-2xl px-6 py-4 focus:ring-4 outline-none transition-all text-lg font-medium shadow-sm active:scale-[0.98]"
        />
        <p className="text-[10px] text-gray-400 mt-2 text-center">We will use this email to create your owner account.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-white border-2 rounded-3xl p-8 flex flex-col transition-all hover:shadow-2xl hover:-translate-y-2 ${plan.bestValue ? 'shadow-xl' : 'border-gray-100'}`}
            style={plan.bestValue ? { borderColor: themeColor } : {}}
          >
            {plan.bestValue && (
              <div 
                className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg"
                style={{ backgroundColor: themeColor }}
              >
                Most Popular
              </div>
            )}

            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              {ICON_MAP[plan.icon] ? (
                (() => {
                  const Icon = ICON_MAP[plan.icon]
                  return <Icon className="w-6 h-6" style={{ color: themeColor }} />
                })()
              ) : (
                <Zap className="w-6 h-6" style={{ color: themeColor }} />
              )}
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">{plan.name}</h3>

            <div className="mb-8 font-black">
              <div className="flex items-center gap-2">
                <span className="text-4xl">₹{plan.price}</span>
                {plan.discount > 0 && (
                  <span 
                    className="px-2 py-0.5 rounded text-sm mb-auto"
                    style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                  >
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
              style={{ 
                backgroundColor: plan.bestValue ? themeColor : '#111827',
                '--hover-bg': plan.bestValue ? `${themeColor}e6` : '#000000'
              } as any}
              className={`w-full py-7 rounded-2xl text-lg font-black transition-all active:scale-95 shadow-lg text-white`}
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
