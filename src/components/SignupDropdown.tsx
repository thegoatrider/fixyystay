'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, User, Building } from 'lucide-react'

export function SignupDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs sm:text-sm shadow-sm transition-colors whitespace-nowrap"
      >
        Sign up
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1.5">
            <Link 
              href="/signup?role=guest" 
              onClick={() => setIsOpen(false)}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:bg-blue-100 transition-colors shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 leading-none">Sign up as Guest</div>
                <div className="text-[11px] text-gray-500 font-medium mt-1.5 leading-tight">Book premium stays & villas</div>
              </div>
            </Link>
            
            <div className="h-px bg-gray-100 my-1 mx-2" />
            
            <Link 
              href="/onboarding" 
              onClick={() => setIsOpen(false)}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:bg-blue-100 transition-colors shrink-0 mt-0.5">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 leading-none">Become a Partner</div>
                <div className="text-[11px] text-gray-500 font-medium mt-1.5 leading-tight">List your property & earn</div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
