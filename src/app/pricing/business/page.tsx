import PricingClient from './PricingClient'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Business Pricing for Property Owners | Fixy Stays',
  description: 'Professional business plans for property owners in Alibag. Unlock advanced analytics, premium placements, and dedicated account management with Fixy Stays.',
  keywords: ['hotel business management', 'villa business Alibag', 'B2B property management Alibag', 'Fixy Stays business plan', 'premium property listing'],
  openGraph: {
    title: 'Business Pricing for Property Owners | Fixy Stays',
    description: 'Professional business plans for property owners in Alibag. Unlock advanced analytics, premium placements, and dedicated account management with Fixy Stays.',
    url: 'https://www.fixystays.com/pricing/business',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Business Pricing for Property Owners | Fixy Stays',
    description: 'Professional business plans for property owners in Alibag. Unlock advanced analytics and premium placements.',
  },
  alternates: {
    canonical: 'https://www.fixystays.com/pricing/business',
  }
}

export default function BusinessPricingPage() {
  return <PricingClient />
}
