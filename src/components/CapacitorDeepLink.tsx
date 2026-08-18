'use client'

import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'

export function CapacitorDeepLink() {
  const router = useRouter()

  useEffect(() => {
    // Set a cookie so Next.js server actions always recognize requests from the native app
    if (typeof window !== 'undefined') {
      try {
        if (Capacitor.isNativePlatform() || (window as any).Capacitor) {
          document.cookie = "is_native_app=true; path=/; max-age=31536000; SameSite=Lax"
        }
      } catch (e) {
        // Ignore if Capacitor is not present
      }
    }

    let urlListener: any

    const setupListener = async () => {
      try {
        urlListener = await CapacitorApp.addListener('appUrlOpen', (event) => {
          // event.url will be something like "com.fixystays.myapp://auth/callback?code=..."
          // or "com.fixystays.myapp://auth/callback#access_token=..."
          console.log('Received deep link URL:', event.url)
          
          const parsedUrl = new URL(event.url)
          
          // Reconstruct local path from scheme URL
          // If the scheme is "com.fixystays.myapp://auth/callback", then:
          // parsedUrl.host = "auth"
          // parsedUrl.pathname = "/callback"
          // We want the path to be "/auth/callback".
          let path = parsedUrl.host + parsedUrl.pathname
          if (!path.startsWith('/')) {
            path = '/' + path
          }
          
          const search = parsedUrl.search || ''
          const hash = parsedUrl.hash || ''
          const targetUrl = `${path}${search}${hash}`
          
          console.log('Navigating WebView to local path:', targetUrl)
          // Use window.location.href to perform a full redirect of the WebView 
          // to ensure Next.js route handlers process the request (important for cookie exchange)
          window.location.href = targetUrl
        })
      } catch (err) {
        console.warn('Capacitor deep link listener not available in browser/webview environment', err)
      }
    }

    setupListener()

    return () => {
      if (urlListener?.remove) urlListener.remove()
    }
  }, [router])

  return null
}
