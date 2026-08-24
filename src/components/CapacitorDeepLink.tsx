'use client'

import { useEffect, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'

export function CapacitorDeepLink() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

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
          let path = parsedUrl.host + parsedUrl.pathname
          if (!path.startsWith('/')) {
            path = '/' + path
          }
          
          const search = parsedUrl.search || ''
          const hash = parsedUrl.hash || ''
          const targetUrl = `${path}${search}${hash}`
          
          console.log('Navigating WebView to local path:', targetUrl)
          
          // Show fullscreen loading screen to prevent user confusion during server auth exchange
          setIsRedirecting(true)
          
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

  if (isRedirecting) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        <div style={{
          fontSize: '28px',
          fontWeight: 900,
          color: '#2563eb',
          letterSpacing: '-0.025em',
          marginBottom: '24px'
        }}>
          FixyStays
        </div>
        <div style={{
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #2563eb',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '24px'
        }} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
        <h3 style={{
          fontSize: '20px',
          fontWeight: 700,
          margin: '0 0 8px 0',
          color: '#111827'
        }}>
          Verifying your login...
        </h3>
        <p style={{
          color: '#4b5563',
          fontSize: '14px',
          lineHeight: '1.5',
          margin: 0,
          maxWidth: '280px'
        }}>
          Please wait while we load your account. Do not press the back button or close the app.
        </p>
      </div>
    )
  }

  return null
}
