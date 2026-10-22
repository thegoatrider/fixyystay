'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Download, LayoutDashboard, ChevronRight, Loader2, Clock, AlertCircle } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { checkPaymentActivation } from '@/app/pricing/business/actions'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  
  const [pollState, setPollState] = useState<'checking' | 'active' | 'activating_shortly' | 'failed' | 'not_found'>('checking')
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  const apkDownloadLink = '/fixystays.apk'

  useEffect(() => {
    if (!sessionId) {
      setPollState('active')
      return
    }

    let intervalId: any = null
    let elapsed = 0

    const checkStatus = async () => {
      try {
        const res = await checkPaymentActivation(sessionId)
        if (res.status === 'active') {
          if (res.propertyId) setPropertyId(res.propertyId)
          setPollState('active')
          clearInterval(intervalId)
          return
        }

        if (res.status === 'failed') {
          setPollState('failed')
          clearInterval(intervalId)
          return
        }

        elapsed += 2
        setSecondsElapsed(elapsed)

        // After 30 seconds of polling, switch to "activating shortly"
        if (elapsed >= 30) {
          setPollState('activating_shortly')
          clearInterval(intervalId)
        }
      } catch (e) {
        console.error('Error during activation polling:', e)
      }
    }

    // Immediate first check
    checkStatus()

    // Recurring poll every 2s
    intervalId = setInterval(checkStatus, 2000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [sessionId])

  return (
    <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 p-8 md:p-12 rounded-3xl shadow-2xl max-w-2xl w-full text-center relative z-10 transition-all">
      {/* 1. CHECKING STATE */}
      {pollState === 'checking' && (
        <>
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Verifying Payment...</h1>
          <p className="text-neutral-400 text-base mb-6 max-w-md mx-auto">
            Confirming transaction with the payment gateway and activating your property subscription.
          </p>
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 mb-6 inline-block text-left w-full max-w-sm">
            <div className="flex justify-between items-center text-xs text-neutral-400 mb-1">
              <span>Status</span>
              <span className="text-indigo-400 font-mono">Verifying ({Math.max(0, 30 - secondsElapsed)}s)</span>
            </div>
            {sessionId && (
              <p className="text-xs font-mono text-neutral-300 truncate">Ref: {sessionId}</p>
            )}
          </div>
        </>
      )}

      {/* 2. CONFIRMED ACTIVE STATE */}
      {pollState === 'active' && (
        <>
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Payment Verified & Active!
          </h1>
          <p className="text-neutral-300 text-base mb-6 max-w-md mx-auto">
            Your payment was confirmed. Your property is now submitted to the admin approval queue and your owner dashboard is ready.
          </p>
          {sessionId && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-8 inline-block text-left w-full max-w-sm">
              <p className="text-xs text-neutral-500 mb-1">Razorpay Order Reference</p>
              <p className="text-sm font-mono text-neutral-300 truncate">{sessionId}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild className="w-full sm:w-auto h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 transition-all">
              <a href={apkDownloadLink} download="fixystays.apk" target="_blank" rel="noopener noreferrer">
                <Download className="w-5 h-5" />
                Download APK
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto h-12 px-8 border-neutral-700 text-neutral-200 hover:bg-neutral-800 hover:text-white flex items-center justify-center gap-2 transition-all">
              <Link href="/dashboard/owner">
                <LayoutDashboard className="w-5 h-5" />
                Go to Dashboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </>
      )}

      {/* 3. TIMEOUT / ACTIVATING SHORTLY STATE */}
      {pollState === 'activating_shortly' && (
        <>
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Payment Received, Activating Shortly
          </h1>
          <p className="text-neutral-400 text-base mb-6 max-w-md mx-auto">
            We received your transaction from the gateway. Confirmation is taking a few moments longer than usual. Your subscription will be unlocked automatically.
          </p>
          {sessionId && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-8 inline-block text-left w-full max-w-sm">
              <p className="text-xs text-neutral-500 mb-1">Order Reference</p>
              <p className="text-sm font-mono text-neutral-300 truncate">{sessionId}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 transition-all">
              <Link href="/dashboard/owner">
                <LayoutDashboard className="w-5 h-5" />
                Go to Dashboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </>
      )}

      {/* 4. FAILED STATE */}
      {pollState === 'failed' && (
        <>
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Payment Failed</h1>
          <p className="text-neutral-400 text-base mb-6 max-w-md mx-auto">
            Your transaction was not completed or was declined by the bank. No subscription was activated.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2">
              <Link href="/dashboard/owner">
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default function OnboardingSuccessPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />
      <Suspense fallback={<div className="text-white z-10 font-mono text-sm">Loading session...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
