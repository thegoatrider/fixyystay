'use client'

import { useRouter } from 'next/navigation'
import { Languages } from 'lucide-react'

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter()

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value
    // Set cookie for 1 year
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh() // Refresh the current page to apply new locale
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
