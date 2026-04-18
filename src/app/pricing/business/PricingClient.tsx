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
    price: 399,
    originalPrice: 399,
    discount: 0,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Zap"
  },
  {
    name: "Quarterly",
    price: 999,
    originalPrice: 1197,
    discount: 16,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Star"
  },
  {
    name: "6 Months",
    price: 1799,
    originalPrice: 2394,
    discount: 24,
    features: SHARED_FEATURES,
    bestValue: true,
    icon: "ShieldCheck"
  },
  {
    name: "Yearly",
    price: 3399,
    originalPrice: 4788,
    discount: 29,
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
