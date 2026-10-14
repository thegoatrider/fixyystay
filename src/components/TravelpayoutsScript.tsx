'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

export function TravelpayoutsScript() {
  const pathname = usePathname()

  // Only load on public marketing pages (not on dashboard, admin, staff, or auth routes)
  const isExcluded = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/staff') || 
    pathname.startsWith('/g/') || 
    pathname.startsWith('/login') || 
    pathname.startsWith('/signup') || 
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/delete-account')

  if (isExcluded) return null

  return (
    <Script
      id="emerald-monetization"
      src="https://emrld.ltd/NTc1MTM5.js?t=575139"
      strategy="lazyOnload"
      data-cmp-ab="2"
    />
  )
}
