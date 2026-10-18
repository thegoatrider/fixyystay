'use client'

import { useState } from 'react'
import { BellRing, Loader2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { runSubscriptionExpiryRemindersAction } from './actions'

export default function SubscriptionCheckButton() {
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState<string | null>(null)
  const router = useRouter()

  const handleRunCheck = async () => {
    setLoading(true)
    setStatusText(null)

    try {
      // 1. First attempt via direct Server Action (native Next.js session authentication)
      const data = await runSubscriptionExpiryRemindersAction()

      if (data.success && data.summary) {
        const s = data.summary
        const summaryMsg = `Check Complete: ${s.totalActive} active subscriptions scanned. ${s.reminders3DaySent} 3-day reminders, ${s.reminders1DaySent} 1-day reminders, ${s.expiredMarked} expired, ${s.trialRemindersSent} trial reminders dispatched via Push.`
        setStatusText(summaryMsg)
        router.refresh()
        return
      }

      // 2. Fallback to authenticated API endpoint if server action returned an error
      const res = await fetch('/api/cron/subscription-reminders', {
        method: 'POST',
      })
      const apiData = await res.json()

      if (apiData.success && apiData.summary) {
        const s = apiData.summary
        const summaryMsg = `Check Complete: ${s.totalActive} active subscriptions scanned. ${s.reminders3DaySent} 3-day reminders, ${s.reminders1DaySent} 1-day reminders, ${s.expiredMarked} expired, ${s.trialRemindersSent} trial reminders dispatched via Push.`
        setStatusText(summaryMsg)
        router.refresh()
      } else {
        alert(apiData.error || data.error || 'Failed to complete subscription check.')
      }
    } catch (err: any) {
      alert('Error running subscription check: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <button
        onClick={handleRunCheck}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <BellRing className="w-3.5 h-3.5" />
        )}
        {loading ? 'Checking Subscriptions...' : 'Run Expiry Push Reminders'}
      </button>

      {statusText && (
        <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          {statusText}
        </span>
      )}
    </div>
  )
}
