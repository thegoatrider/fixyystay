'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Dismiss Capacitor native splash screen immediately once client mounts
    if (typeof window !== 'undefined') {
      import('@capacitor/core').then(({ Capacitor }) => {
        if (Capacitor.isNativePlatform()) {
          import('@capacitor/splash-screen').then(({ SplashScreen }) => {
            SplashScreen.hide().catch(() => {})
          }).catch(() => {})
        }
      }).catch(() => {})
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Periodic update check every 1 hour
            setInterval(() => {
              registration.update().catch(() => {})
            }, 60 * 60 * 1000)
          })
          .catch((error) => {
            console.warn('[SW] ServiceWorker registration failed:', error)
          })
      }

      if (document.readyState === 'complete') {
        registerSW()
      } else {
        window.addEventListener('load', registerSW)
        return () => window.removeEventListener('load', registerSW)
      }
    }
  }, [])

  return null
}
