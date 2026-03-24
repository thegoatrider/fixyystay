'use client'

import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'

export function CapacitorBackButton() {
  useEffect(() => {
    let backListener: any

    const setupListener = async () => {
      try {
        backListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          // canGoBack comes from the Capacitor WebView's own history tracking
          // window.history.length > 1 means there's history to go back through
          const hasHistory = canGoBack || (typeof window !== 'undefined' && window.history.length > 1)

          // Allow exit only when truly at the start (home or login) AND no history
          const isExitScreen =
            window.location.pathname === '/' ||
            window.location.pathname === '/login' ||
            window.location.pathname === '/signup'

          if (isExitScreen && !canGoBack) {
            // At the very start of the app with nothing to go back to — exit
            CapacitorApp.exitApp()
          } else {
            // Go back in native WebView history (works reliably on Android)
            window.history.go(-1)
          }
        })
      } catch (err) {
        // Safe fail on web browser (no Capacitor runtime)
        console.warn('Capacitor back button not available in browser', err)
      }
    }

    setupListener()

    return () => {
      if (backListener?.remove) backListener.remove()
    }
  }, [])

  return null
}
