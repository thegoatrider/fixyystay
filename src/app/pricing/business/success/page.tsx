import { CheckCircle, ArrowRight, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function BusinessSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8 animate-in zoom-in duration-500">
        <CheckCircle className="w-12 h-12" />
      </div>
      
      <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Payment Successful!</h1>
      <p className="text-xl text-gray-600 max-w-lg mb-10 leading-relaxed font-medium">
        Thank you for choosing FixStay. Your subscription is being processed. 
      </p>

      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 max-w-md w-full shadow-sm mb-10">
        <h3 className="font-black text-blue-900 mb-2 uppercase text-xs tracking-widest">Next Step</h3>
        <p className="text-blue-800 font-bold text-lg mb-6 leading-tight">
          Please contact our onboarding team via WhatsApp to get your official login credentials.
        </p>
        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl text-lg font-black shadow-lg">
          <a href="https://wa.me/919123456789?text=Hi%2C+I+just+made+the+payment+for+FixStay+Business.+Please+active+my+account." target="_blank">
            WhatsApp Us <ArrowRight className="ml-2 w-5 h-5" />
          </a>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-gray-400 text-sm">Usually takes 2-4 hours for activation.</p>
        <Link href="/" className="text-blue-600 font-bold hover:underline">Return to Homepage</Link>
      </div>
    </div>
  )
}
