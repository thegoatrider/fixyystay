import BasePricingClient, { PricingPlan } from '../BasePricingClient'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Starter Pricing for Property Owners | Fixy Stays',
  description: 'Affordable starter plans for property owners in Alibag. List unlimited properties, get instant lead notifications, and grow your hotel, villa, or resort business with Fixy Stays.',
  keywords: ['property management software', 'list property Alibag', 'hotel management Alibag', 'villa management Alibag', 'Fixy Stays starter plan', 'owner pricing'],
  openGraph: {
    title: 'Starter Pricing for Property Owners | Fixy Stays',
    description: 'Affordable starter plans for property owners in Alibag. List unlimited properties, get instant lead notifications, and grow your hotel, villa, or resort business with Fixy Stays.',
    url: 'https://www.fixystays.com/pricing/starter',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starter Pricing for Property Owners | Fixy Stays',
    description: 'Affordable starter plans for property owners in Alibag. Grow your hotel, villa, or resort business with Fixy Stays.',
  },
  alternates: {
    canonical: 'https://www.fixystays.com/pricing/starter',
  }
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
