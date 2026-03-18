import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export default function ConfirmSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl border shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Email Confirmed!</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Your account has been successfully verified. You can now log in to access your dashboard.
        </p>
        <Link href="/login" className="w-full">
          <Button size="lg" className="w-full h-12 text-lg font-bold shadow-lg shadow-blue-100">
            Sign In Now
          </Button>
        </Link>
      </div>
    </div>
  )
}
