import BasePricingClient, { PricingPlan } from '../BasePricingClient'

export const metadata = {
  title: 'Starter Pricing - FixStay',
  description: 'Special starter plans for property owners.',
}

const SHARED_FEATURES = [
  "List Unlimited Properties",
  "Instant Lead Notifications",
  "Virtual Wallet & Payouts",
  "Verified Business Badge",
  "Dedicated Support"
]

const STARTER_PLANS: PricingPlan[] = [
  {
    name: "Monthly",
    price: 199,
    originalPrice: 199,
    discount: 0,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Zap"
  },
  {
    name: "Quarterly",
    price: 499,
    originalPrice: 597,
    discount: 16,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Star"
  },
  {
    name: "6 Months",
    price: 899,
    originalPrice: 1194,
    discount: 24,
    features: SHARED_FEATURES,
    bestValue: true,
    icon: "ShieldCheck"
  },
  {
    name: "Yearly",
    price: 1699,
    originalPrice: 2388,
    discount: 29,
    features: SHARED_FEATURES,
    bestValue: false,
    icon: "Crown"
  }
]

export default function StarterPricingPage() {
  return (
    <BasePricingClient
      tierName="Starter"
      title={<>Starter Plans for <span className="text-blue-600">Growth</span></>}
      description="Affordable tools to help you manage your properties and capture more bookings."
      plans={STARTER_PLANS}
      successUrl="/pricing/business/success"
      themeColor="#059669" // Emerald green for starter
    />
  )
}
