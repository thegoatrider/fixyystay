'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Cloud, CheckCircle, AlertTriangle, RefreshCw, LogOut, ArrowRight, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { syncOwnerCheckinsAction } from '../actions'

type GoogleDriveSyncCardProps = {
  initialGoogleEmail: string | null
}

export default function GoogleDriveSyncCard({ initialGoogleEmail }: GoogleDriveSyncCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [googleEmail, setGoogleEmail] = useState<string | null>(initialGoogleEmail)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // 1. Listen for query parameters from OAuth redirects
  useEffect(() => {
    const syncStatus = searchParams.get('google_sync')
    const reason = searchParams.get('reason')

    if (syncStatus === 'success') {
      setNotification({
        type: 'success',
        message: 'Google Drive successfully connected! New check-ins will now be backed up.'
      })
      // Clear URL query parameters
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    } else if (syncStatus === 'error') {
      let msg = 'OAuth authorization failed. Please try again.'
      if (reason === 'access_denied') msg = 'Access denied. Google Drive permissions are required.'
      setNotification({
        type: 'error',
        message: msg
      })
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  // 2. Connect Redirect
  function handleConnect() {
    // Redirect to the API route that initiates Google OAuth
    window.location.href = '/api/auth/google'
  }

  // 3. Sync Missing Check-ins Handler
  async function handleSyncCheckins() {
    setIsSyncing(true)
    setNotification(null)
    try {
      const res = await syncOwnerCheckinsAction('2026-08-30')
      if (res.success && res.results) {
        setNotification({
          type: 'success',
          message: `Sync complete: Successfully backed up ${res.results.synced} check-in(s) to Google Drive.${res.results.failed > 0 ? ` (${res.results.failed} skipped/failed)` : ''}`
        })
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to sync check-ins. Your Google Drive connection may need to be reconnected.'
        })
      }
      router.refresh()
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'An unexpected error occurred during sync.'
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // 4. Disconnect Fetch
  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Google Drive? New guest check-ins will no longer be backed up to your drive.')) {
      return
    }

    setIsDisconnecting(true)
    try {
      const res = await fetch('/api/auth/google/disconnect', {
        method: 'POST'
      })

      if (!res.ok) {
        throw new Error('Failed to unlink account')
      }

      setGoogleEmail(null)
      setNotification({
        type: 'success',
        message: 'Google Drive successfully disconnected.'
      })
      router.refresh()
    } catch (err: any) {
      alert('Error disconnecting Google Drive: ' + err.message)
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="bg-white border rounded-[32px] p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-2xl ${googleEmail ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
          <Cloud className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Google Drive Backup</h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {googleEmail ? 'Active Cloud Backup' : 'Cloud Sync Storage'}
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
            notification.type === 'success'
              ? 'bg-green-50/50 border-green-200 text-green-800'
              : 'bg-red-50/50 border-red-200 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {googleEmail ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Connected Account</p>
            <p className="text-sm font-bold text-gray-800 truncate">{googleEmail}</p>
            <p className="text-[10px] text-green-600 font-semibold flex items-center gap-1.5 pt-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-ping"></span>
              Files are automatically saving to: "Fixy Stays Guest Records"
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              onClick={handleSyncCheckins}
              disabled={isSyncing || isDisconnecting}
            >
              <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
              {isSyncing ? 'Syncing Check-ins to Drive...' : 'Sync Missing Check-ins (Since Aug 30)'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full text-blue-600 hover:bg-blue-50 border-blue-100 hover:border-blue-200 font-black uppercase text-[10px] tracking-widest h-11 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
                onClick={handleConnect}
                disabled={isSyncing || isDisconnecting}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconnect
              </Button>

              <Button
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50 border-red-100 hover:border-red-200 font-black uppercase text-[10px] tracking-widest h-11 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
                onClick={handleDisconnect}
                disabled={isDisconnecting || isSyncing}
              >
                {isDisconnecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Give guest check-ins a privacy boost. Link your Google Drive, and we'll automatically generate a formatted
            guest stay **PDF** and copy all verified ID documents directly to a folder on your drive upon check-in.
          </p>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            onClick={handleConnect}
          >
            Connect Google Drive
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
