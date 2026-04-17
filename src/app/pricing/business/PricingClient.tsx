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
    price: 299,
    originalPrice: 299,
    discount: 0,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Zap"
  },
  {
    name: "Quarterly",
    price: 799,
    originalPrice: 897,
    discount: 11,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Star"
  },
  {
    name: "6 Months",
    price: 1499,
    originalPrice: 1794,
    discount: 16,
    features: SHARED_FEATURES,
    bestValue: true,
    icon: "ShieldCheck"
  },
  {
    name: "Yearly",
    price: 2999,
    originalPrice: 3588,
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
      title={<>Scale Your Rental <span className="text-blue-600">Business</span></>}
      description="List your properties, manage leads, and grow with the most advanced property management tool for India."
      plans={PLANS}
      successUrl="/pricing/business/success"
    />
  )
}
