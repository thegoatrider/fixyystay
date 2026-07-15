'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Download, LayoutDashboard, ChevronRight } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [mounted, setMounted] = useState(false)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    setMounted(true)
    
    // Auto redirect after 5 seconds
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/dashboard/owner')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [router])

  if (!mounted) return null

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 md:p-12 rounded-3xl shadow-2xl max-w-2xl w-full text-center relative z-10">
      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
        Payment Successful!
      </h1>
      
      <p className="text-neutral-400 text-lg mb-8 max-w-md mx-auto">
        Welcome to FixyStays. Your owner account has been created and an email has been sent with all your information.
      </p>

      {sessionId && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 mb-8 inline-block text-left w-full max-w-sm">
          <p className="text-xs text-neutral-500 mb-1">Transaction ID</p>
          <p className="text-sm font-mono text-neutral-300 truncate">{sessionId}</p>
        </div>
      )}

      <div className="flex flex-col gap-4 justify-center items-center">
        <p className="text-neutral-500 text-sm">
          Redirecting to your dashboard in {countdown} seconds...
        </p>
        
        <Link href="/dashboard/owner" className="w-full sm:w-auto">
          <Button className="w-full h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 transition-all">
            <LayoutDashboard className="w-5 h-5" />
            Go to Dashboard Now
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function OnboardingSuccessPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none" />
      <Suspense fallback={<div className="text-white z-10">Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
