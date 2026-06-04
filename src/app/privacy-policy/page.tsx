import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Fixy Stays',
  description: 'Read the privacy policy of Fixy Stays. Learn how we handle your data for property bookings and rentals in Alibag.',
  alternates: {
    canonical: 'https://www.fixystays.com/privacy-policy',
  }
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10 border-b pb-6">Effective Date: June 1, 2026</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p>
            Welcome to FixyStays ("we," "our," "us," or the "Platform"). At FixyStays, we are deeply committed to safeguarding your privacy and ensuring the security of the personal information you entrust to us when utilizing our comprehensive property booking, reservation management, and vacation rental services in Alibag and beyond. This extensively detailed Privacy Policy meticulously outlines the myriad ways in which we collect, utilize, disclose, and relentlessly protect your data when you visit our website, utilize our mobile application, or engage with our services as a guest, property owner, law enforcement official, or platform influencer.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. User Data Collected</h2>
          <p>
            To facilitate a seamless, highly secure, and exceptionally personalized booking experience, FixyStays meticulously collects a variety of user data. When you register an account, initiate a property booking, or participate in our mandatory digital guest check-in process, we collect comprehensive personal identifiers. This strictly includes your full legal name, government-issued identity documents (such as Aadhar cards or passports for AI-powered verification), residential address details, date of birth, and emergency contact information. For property owners and employees, we collect additional verification credentials, business registration details, and employment history logs to ensure platform integrity and law enforcement compliance. Furthermore, we passively collect usage data, device telemetry, IP addresses, browser types, and interaction metrics to continuously optimize our platform's performance and security algorithms.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Phone Number Usage</h2>
          <p>
            Your mobile phone number is a critical component of our secure communication and authentication framework. FixyStays utilizes your phone number to dispatch time-sensitive SMS and WhatsApp notifications pertaining strictly to your active bookings, urgent check-in reminders, digital key access codes, and immediate property host communications. We also employ your phone number for robust Multi-Factor Authentication (MFA) to prevent unauthorized account access. Furthermore, our integrated platform allows property owners and verified law enforcement personnel to contact you via phone during emergency situations or to resolve critical identity verification discrepancies prior to your arrival at the designated accommodation.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Email Usage</h2>
          <p>
            We collect and utilize your email address as the primary conduit for establishing your FixyStays account identity and delivering essential transactional documentation. You will receive detailed booking confirmations, digital receipts, cancellation notices, and comprehensive pre-arrival property guides directly to your inbox. With your explicit, revocable consent, we may also utilize your email address to periodically dispatch curated marketing newsletters, exclusive seasonal promotional offers for Alibag villa rentals, influencer campaign updates, and platform feature announcements. You retain the immutable right to unsubscribe from non-essential promotional email communications at any juncture via your user dashboard preferences.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Payment Information</h2>
          <p>
            Ensuring the absolute financial security of our users is paramount. FixyStays facilitates financial transactions through industry-leading, PCI-DSS compliant third-party payment gateways, including Razorpay for domestic Indian transactions and Stripe for international bookings. When you execute a property reservation, submit a platform subscription fee, or process a security deposit, your sensitive financial instruments—such as credit card numbers, debit card details, UPI IDs, and bank account routing information—are directly, securely transmitted to and processed by these specialized gateways. FixyStays deliberately does not store, retain, or cache your complete payment card details on our proprietary servers, thereby radically minimizing the risk of financial data exposure.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Location Permissions</h2>
          <p>
            To augment the spatial awareness and hyper-local utility of our application, FixyStays may request explicit permission to access your device's precise or approximate geographic location. Utilizing advanced Mapbox GL integration, location data is exclusively deployed to power critical features such as: dynamically rendering nearby available vacation rentals, generating optimized turn-by-turn navigation routes to your booked property, facilitating geo-fenced guest check-ins, and alerting you to hyper-local amenities or emergency services in the Alibag region. You possess complete sovereignty over your location data and may dynamically revoke these permissions at any time through your mobile device's core operating system settings, although this may degrade certain geographically dependent functionalities.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Law Enforcement and Compliance</h2>
          <p>
            As a responsibly operated hospitality platform, FixyStays maintains a specialized, highly secure dashboard specifically engineered for verified law enforcement personnel. In strict adherence to local statutes and municipal regulatory mandates, specific segments of your collected data—predominantly government ID verification records and verified guest check-in logs—are systematically made accessible to these authorities to ensure community safety, expedite mandatory police verification protocols, and maintain comprehensive compliance with regional lodging regulations.
          </p>

        </div>
      </div>
    </div>
  );
}
