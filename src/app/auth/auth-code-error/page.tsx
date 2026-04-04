import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-8 animate-bounce">
        <AlertCircle className="w-10 h-10" />
      </div>
      
      <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Authentication Failed</h1>
      <p className="text-lg text-gray-600 max-w-md mb-10 leading-relaxed">
        We couldn't verify your login. This usually happens if the link is expired or already used.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button asChild className="bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl text-lg font-black shadow-lg">
          <Link href="/login">
            Try Again
          </Link>
        </Button>
        <Link href="/" className="text-gray-400 font-bold hover:text-gray-600 flex items-center justify-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    </div>
  )
}
