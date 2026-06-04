import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Fixy Stays',
  description: 'Read the terms and conditions for using Fixy Stays. Understand the rules for property booking, cancellation policies, and user agreements.',
  alternates: {
    canonical: 'https://www.fixystays.com/terms-and-conditions',
  }
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Terms and Conditions</h1>
        <p className="text-sm text-gray-500 mb-10 border-b pb-6">Effective Date: June 1, 2026</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p>
            Welcome to the official Terms and Conditions of FixyStays ("Platform," "we," "our," or "us"). These rigorously detailed Terms formulate a legally binding contractual agreement between you (the "User," "Guest," "Property Owner," or "Influencer") and FixyStays regarding your access to, and utilization of, our comprehensive web and mobile applications engineered for property booking, vacation rental management, and seamless guest experiences primarily focused within the Alibag region. By registering an account, executing a booking, or otherwise interacting with our digital infrastructure, you unequivocally acknowledge, accept, and agree to be bound by the exhaustive stipulations contained within this document.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Comprehensive Booking Rules</h2>
          <p>
            When utilizing the FixyStays platform to secure a vacation rental, villa, or boutique accommodation, guests are strictly obligated to adhere to a rigid set of booking protocols. A reservation is unequivocally considered confirmed only upon the successful processing of the mandated deposit or full payment through our integrated payment gateways (Stripe or Razorpay). Guests must provide impeccably accurate personal details, including legally verifiable, government-issued identification during the AI-powered digital check-in procedure. Falsification of identity documents will result in immediate booking termination without recourse. Furthermore, guests must strictly observe all property-specific "House Rules" explicitly enumerated by the property owner, which may dictate stringent policies regarding maximum occupancy limits, noise curfews, prohibition of unauthorized events or parties, and specialized pet accommodation restrictions. Failure to comply with these explicit booking rules authorizes the property owner and FixyStays to initiate immediate eviction procedures, subject the guest to substantial penalty fees, and permanently revoke platform access privileges.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Rigorous Cancellation Policy</h2>
          <p>
            FixyStays operates under a meticulously structured cancellation framework designed to equitably balance the flexibility required by modern travelers with the logistical and financial predictability necessitated by our dedicated property owners. Unless explicitly superseded by a property owner's custom cancellation tier displayed prominently during the checkout sequence, the standard FixyStays cancellation protocol dictates the following: Guests initiating a cancellation request greater than fourteen (14) standard calendar days prior to the designated check-in date are eligible for a penalty-free cancellation. Cancellations registered between seven (7) and thirteen (13) days prior to arrival shall incur a penalty equivalent to fifty percent (50%) of the cumulative booking value. Any cancellation executed less than seven (7) days preceding the scheduled arrival, or instances of a guest "no-show," will strictly result in the forfeiture of one hundred percent (100%) of the total reservation cost. Exceptions to this rigorous policy are evaluated strictly on a case-by-case basis exclusively under proven, catastrophic force majeure circumstances.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Standardized Refund Policy</h2>
          <p>
            In the event that a user qualifies for a financial reimbursement in accordance with our aforementioned Cancellation Policy or due to a verified platform error, FixyStays will orchestrate the refund process with utmost diligence. Approved refund disbursements will be systematically routed back to the exact original payment methodology utilized during the initial transaction booking flow. Users must acknowledge that standard banking institutional processing times apply; thus, the reflection of refunded capital within your account may necessitate a temporal window ranging from five (5) to ten (10) standard business days. FixyStays emphatically reserves the unassailable right to algorithmically withhold specific, non-refundable administrative processing fees, platform service surcharges, or transaction gateway levies from the final refunded principal, as explicitly detailed during the point of sale. 
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Platform Responsibilities and Liability Limitations</h2>
          <p>
            FixyStays functions fundamentally as an advanced, high-fidelity digital marketplace and intermediary facilitation platform, expertly bridging the gap between prospective guests seeking exceptional accommodations and independent property owners offering diverse vacation rentals. Consequently, FixyStays fundamentally disclaims direct ownership, operational control, or daily management of the physical properties indexed within our database. Our paramount responsibility is meticulously confined to providing a secure, reliable, and technologically superior booking interface, facilitating encrypted financial transactions, and administering the digital identity verification infrastructure.
          </p>
          <p>
            We categorically disclaim all liability, to the maximum extent permissible by governing jurisprudence, for any direct, indirect, incidental, consequential, or punitive damages, personal injuries, severe property damage, or catastrophic loss arising directly or indirectly from your stay at a booked accommodation, the subjective quality of the premises, or the interpersonal conduct of property hosts, employees, or fellow guests. Property owners remain singularly and exclusively responsible for maintaining rigorous safety standards, acquiring necessary municipal operational licenses, holding comprehensive liability insurance policies, and ensuring the absolute accuracy of their digital property listings. FixyStays does not function as an insurer, real estate broker, or guarantor of property conditions.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Dispute Resolution</h2>
          <p>
            Any irreconcilable disputes arising from the utilization of the FixyStays platform, booking discrepancies, or interpretations of these Terms and Conditions shall be initially subjected to mandatory, good-faith mediation facilitated by our dedicated platform support tier. Should mediation fail, users explicitly agree that all subsequent legal proceedings shall be subjected to binding arbitration, conducted strictly within the legal jurisdiction encompassing the administrative headquarters of FixyStays, explicitly waiving the right to participate in consolidated class-action lawsuits.
          </p>

        </div>
      </div>
    </div>
  );
}
