import StandaloneGuestHubClient from './StandaloneGuestHubClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guest Hub for Hotels & Villas (₹20/room/mo) | Fixy Stays',
  description:
    'In-room QR Guest Hub for hotels, resorts, and villas. Guests view Wi-Fi, order food, and send housekeeping requests straight to staff screens with zero app installs and complete phone privacy.',
}

export default function GuestHubPricingPage() {
  return <StandaloneGuestHubClient />
}
