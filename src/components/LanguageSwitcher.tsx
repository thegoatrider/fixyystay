'use client'

import { useRouter } from 'next/navigation'
import { Languages } from 'lucide-react'
import { useState, useEffect } from 'react'

export function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState('en')

  useEffect(() => {
    // Read the googtrans cookie to set initial state
    const match = document.cookie.match(new RegExp('(^| )googtrans=([^;]+)'))
    if (match) {
      const val = match[2]
      if (val.includes('/hi')) setCurrentLocale('hi')
      else if (val.includes('/mr')) setCurrentLocale('mr')
      else setCurrentLocale('en')
    }
  }, [])

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value
    setCurrentLocale(newLocale)
    
    const host = window.location.hostname
    const domainParts = host.split('.')
    const rootDomain = domainParts.length > 2 ? `.${domainParts.slice(-2).join('.')}` : host
    
    // Set cookie for 1 year for current domain, root domain, and without domain
    const cookieValue = newLocale === 'en' ? '/en/en' : `/en/${newLocale}`
    
    document.cookie = `googtrans=${cookieValue}; path=/; max-age=31536000; domain=${host}`
    if (rootDomain !== host) {
      document.cookie = `googtrans=${cookieValue}; path=/; max-age=31536000; domain=${rootDomain}`
    }
    document.cookie = `googtrans=${cookieValue}; path=/; max-age=31536000;`
    
    // Force a full reload so Google Translate script re-initializes and scans the DOM
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-1.5 bg-gray-50 border rounded-lg px-2 py-1">
      <Languages className="w-4 h-4 text-gray-500" />
      <select
        value={currentLocale}
        onChange={handleLanguageChange}
        className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
        aria-label="Select Language"
      >
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
        <option value="mr">मराठी</option>
      </select>
    </div>
  )
}
