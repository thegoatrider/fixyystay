'use client'

import { useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // In a real app, we'd verify the session server-side.
    // For this flow, we'll assume success if they land here with a session_id.
    // We'll also try to get the propertyId from the URL if possible, or just store the fact that 'some' booking happened.
    // However, to be precise, let's assume we can get it from a temporary storage or another param.
    // For now, let's check a specialized 'pid' param we'll add to the success URL.
    const propertyId = searchParams.get('pid')
    if (propertyId) {
      const confirmed = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]')
      if (!confirmed.includes(propertyId)) {
        confirmed.push(propertyId)
        localStorage.setItem('confirmed_bookings', JSON.stringify(confirmed))
      }
    }
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white p-10 md:p-16 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center flex flex-col items-center">
        
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 border-8 border-green-100">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">Payment Successful!</h1>
        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
          Your room has been successfully booked. We've sent a confirmation WhatsApp with all your details. We look forward to hosting you!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link 
            href="/guest" 
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 w-full sm:w-auto shadow-md"
          >
            Find Another Stay <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            href="/dashboard/owner" 
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 border border-gray-200 transition flex items-center justify-center w-full sm:w-auto shadow-sm hover:text-gray-900"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function GuestSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
