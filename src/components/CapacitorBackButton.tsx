'use client'

import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { useRouter } from 'next/navigation'

export function CapacitorBackButton() {
  const router = useRouter()

  useEffect(() => {
    let backListener: any

    const setupListener = async () => {
      try {
        backListener = await CapacitorApp.addListener('backButton', () => {
          // If the user is on the root landing page or login page, we let them exit the app.
          // Otherwise, we pop the Next.js router stack.
          if (window.location.pathname === '/' || window.location.pathname === '/login') {
            CapacitorApp.exitApp()
          } else {
            router.back()
          }
        })
      } catch (err) {
        // Safe fail on non-capacitor environments (like web browser)
        console.warn('Capacitor App plugin listener failed to load (likely in browser environment)', err)
      }
    }

    setupListener()

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove()
      }
    }
  }, [router])

  return null
}
