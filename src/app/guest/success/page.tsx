import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'

export default function GuestSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white p-10 md:p-16 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center flex flex-col items-center">
        
        {/* Animated Success Icon */}
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 border-8 border-green-100">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">Payment Successful!</h1>
        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
          Your room has been successfully booked. We've sent a confirmation email with all your details. We look forward to hosting you!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link 
            href="/guest" 
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 w-full sm:w-auto shadow-md"
          >
            Find Another Stay <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            href="/dashboard/guest" 
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 border border-gray-200 transition flex items-center justify-center w-full sm:w-auto shadow-sm hover:text-gray-900"
          >
            Go to Dashboard
          </Link>
        </div>
        
      </div>
    </div>
  )
}
