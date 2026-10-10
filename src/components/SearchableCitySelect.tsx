'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { MapPin, Search, ChevronDown, Check, X } from 'lucide-react'
import { INDIAN_STATES_AND_CITIES } from '@/lib/india-locations'
import { cn } from '@/lib/utils'

interface SearchableCitySelectProps {
  id?: string
  name?: string
  value: string
  onChange: (city: string, state?: string) => void
  required?: boolean
  placeholder?: string
  className?: string
  allowCustomOption?: boolean
}

export function SearchableCitySelect({
  id = 'city',
  name = 'city',
  value,
  onChange,
  required = false,
  placeholder = 'Search or select city across India...',
  className,
  allowCustomOption = true,
}: SearchableCitySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 10)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  // Filter states and cities by search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return Object.entries(INDIAN_STATES_AND_CITIES)

    const results: [string, string[]][] = []
    for (const [state, cities] of Object.entries(INDIAN_STATES_AND_CITIES)) {
      const stateMatches = state.toLowerCase().includes(q)
      const matchingCities = cities.filter(
        (c) => c.toLowerCase().includes(q) || stateMatches
      )
      if (matchingCities.length > 0) {
        results.push([state, matchingCities])
      }
    }
    return results
  }, [searchQuery])

  const totalMatches = useMemo(
    () => filteredGroups.reduce((acc, [_, cities]) => acc + cities.length, 0),
    [filteredGroups]
  )

  const handleSelectCity = (city: string, state?: string) => {
    onChange(city, state)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for native FormData submission */}
      <input
        type="hidden"
        id={id}
        name={name}
        value={value}
        required={required}
      />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors hover:border-blue-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600',
          className
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
          {value ? (
            <span className="font-medium text-gray-900 truncate">{value}</span>
          ) : (
            <span className="text-gray-400 truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-blue-600'
          )}
        />
      </button>

      {/* Searchable Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Sticky Search Input */}
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/90 p-2 backdrop-blur-sm">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search city or state..."
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-8 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false)
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    if (filteredGroups.length > 0 && filteredGroups[0][1].length > 0) {
                      handleSelectCity(filteredGroups[0][1][0], filteredGroups[0][0])
                    } else if (searchQuery.trim()) {
                      handleSelectCity(searchQuery.trim())
                    }
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* City Options List */}
          <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
            {filteredGroups.map(([state, cities]) => (
              <div key={state} className="mb-1">
                <div className="sticky top-0 bg-gray-50/95 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 border-y border-gray-100/80">
                  {state}
                </div>
                {cities.map((cityItem) => {
                  const isSelected = value.toLowerCase() === cityItem.toLowerCase()
                  return (
                    <button
                      key={`${state}-${cityItem}`}
                      type="button"
                      onClick={() => handleSelectCity(cityItem, state)}
                      className={cn(
                        'flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors',
                        isSelected
                          ? 'bg-blue-50 font-bold text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <span>{cityItem}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            ))}

            {/* Direct use of typed query if no exact match or user wants custom city */}
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => handleSelectCity(searchQuery.trim())}
                className="flex w-full items-center justify-between border-t border-gray-100 bg-blue-50/40 px-3.5 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                <span>
                  Use custom city: <strong className="underline">&ldquo;{searchQuery.trim()}&rdquo;</strong>
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                  Select
                </span>
              </button>
            )}

            {totalMatches === 0 && !searchQuery.trim() && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No cities found.
              </div>
            )}

            {allowCustomOption && (
              <button
                type="button"
                onClick={() => handleSelectCity('Other')}
                className="flex w-full items-center justify-between border-t border-gray-100 px-3.5 py-2 text-left text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <span>Other / Custom City...</span>
                {value === 'Other' && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
