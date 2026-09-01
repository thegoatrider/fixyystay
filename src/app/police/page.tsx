'use client'

import { useState } from 'react'
import Image from 'next/image'
import { searchPoliceRecords } from './actions'
import { Search, ShieldAlert, FileText, User, Home, MapPin, Phone, Lock, Calendar, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function PoliceDashboard() {
  const [pin, setPin] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === '112') { // 112 is the India Emergency Number, using as default pin
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('Invalid PIN code.')
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (query.length < 3) {
      setError('Please enter at least 3 characters.')
      return
    }

    setIsSearching(true)
    setError('')
    setHasSearched(true)

    const response = await searchPoliceRecords(query, pin)
    
    if (response.error) {
      setError(response.error)
      setResults([])
    } else {
      setResults(response.data || [])
    }
    
    setIsSearching(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white text-center">Law Enforcement Portal</h1>
            <p className="text-slate-400 text-sm mt-2 text-center">Enter your authorization PIN to access guest records.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <Input
                type="password"
                placeholder="Enter PIN (112)"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="pl-12 h-12 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}
            <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20">
              Access System
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-950 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-blue-500" />
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">FixStays Law Enforcement Portal</h1>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Restricted Access</p>
            </div>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Guest Record Search</h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by Aadhaar, PAN, Name, or Phone Number..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-12 h-12 bg-slate-50 border-slate-200 text-lg shadow-inner focus-visible:ring-blue-600"
              />
            </div>
            <Button type="submit" disabled={isSearching} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md">
              {isSearching ? 'Searching...' : 'Search Records'}
            </Button>
          </form>
          {error && <p className="text-red-500 text-sm mt-3 font-medium flex items-center gap-1"><AlertCircle className="w-4 h-4"/> {error}</p>}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {hasSearched && results.length === 0 && !isSearching && !error && (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No records found</h3>
              <p className="text-slate-500">No guests match the provided search criteria.</p>
            </div>
          )}

          {results.length > 0 && (
             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{results.length} records found</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {results.map((record, idx) => {
              const checkin = record.checkin_details;
              const property = checkin?.properties;

              return (
                <div key={record.id || idx} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow">
                  {/* Identity Header */}
                  <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30 flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{record.full_name || 'Unknown Name'}</h3>
                        <p className="text-blue-400 font-mono font-bold mt-1 text-sm bg-blue-950 px-2 py-0.5 rounded-md inline-block">
                          {record.document_type}: {record.document_number}
                        </p>
                      </div>
                    </div>
                    {record.is_verified ? (
                      <span className="bg-green-500/20 text-green-400 text-[10px] font-black uppercase px-2 py-1 rounded border border-green-500/30">Verified</span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase px-2 py-1 rounded border border-amber-500/30">Unverified</span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-6 flex-1 flex flex-col sm:flex-row gap-6">
                    {/* Check-in Details */}
                    <div className="flex-1 space-y-4">
                      {checkin ? (
                        <>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Property Details</p>
                            <div className="flex items-start gap-2">
                              <Home className="w-4 h-4 text-slate-400 mt-0.5" />
                              <div>
                                <p className="font-bold text-slate-900">{property?.name || 'Unknown Property'}</p>
                                <p className="text-xs text-slate-500">{property?.city || 'Unknown City'} • {property?.pincode}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stay Duration</p>
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>{checkin.checkin_date || 'N/A'}</span>
                              <span className="text-slate-300">→</span>
                              <span>{checkin.checkout_date || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact & Vehicle</p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                              <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400"/> {checkin.guest_phone || 'N/A'}</div>
                              <div className="flex items-center gap-1.5 font-mono"><MapPin className="w-3.5 h-3.5 text-slate-400"/> {checkin.vehicle_number || 'No Vehicle'}</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
                          No associated property check-in found for this document.
                        </div>
                      )}
                    </div>

                    {/* Image Preview */}
                    <div className="w-full sm:w-40 flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Document Image</p>
                      {record.document_image_url ? (
                        <a href={record.document_image_url} target="_blank" rel="noopener noreferrer" className="block relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3]">
                          <Image src={record.document_image_url} alt="ID Document" fill sizes="(max-width: 640px) 100vw, 160px" className="object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold px-3 py-1.5 bg-blue-600 rounded-lg">View Full</span>
                          </div>
                        </a>
                      ) : (
                        <div className="w-full aspect-[4/3] bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs text-center p-2">
                          Image Unavailable
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
