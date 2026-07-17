'use client'

import BasePricingClient, { PricingPlan } from '../BasePricingClient'

const SHARED_FEATURES = [
  "List Unlimited Properties",
  "Instant Lead Notifications",
  "Virtual Wallet & Payouts",
  "Verified Business Badge",
  "Dedicated Support"
]

const PLANS: PricingPlan[] = [
  {
    name: "3 Months",
    price: 300,
    originalPrice: 300,
    discount: 0,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Zap"
  },
  {
    name: "6 Months",
    price: 600,
    originalPrice: 600,
    discount: 0,
    features: SHARED_FEATURES,
    bestValue: true,
    icon: "ShieldCheck"
  },
  {
    name: "12 Months",
    price: 1200,
    originalPrice: 1200,
    discount: 0,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Crown"
  }
]

export default function PricingClient() {
  return (
    <BasePricingClient
      tierName=""
      title={<>Scale Your Property <span className="text-blue-600">Business</span></>}
      description="List your properties, manage leads, and grow with the most advanced property management tool for India."
      plans={PLANS}
      successUrl="/pricing/business/success"
    />
  )
}
