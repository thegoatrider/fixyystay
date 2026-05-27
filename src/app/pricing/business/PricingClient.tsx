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
    name: "Monthly",
    price: 99,
    originalPrice: 99,
    discount: 0,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Zap"
  },
  {
    name: "6 Months",
    price: 500,
    originalPrice: 594,
    discount: 16,
    features: SHARED_FEATURES,
    bestValue: true,
    icon: "ShieldCheck"
  },
  {
    name: "Yearly",
    price: 1000,
    originalPrice: 1188,
    discount: 16,
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
