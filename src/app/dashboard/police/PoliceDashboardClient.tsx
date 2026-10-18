'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  FileDown, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  Building2,
  ExternalLink,
  ShieldCheck,
  FilterX,
  Briefcase,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { updateEmployeePoliceStatus } from './police-actions'

import { cn } from '@/lib/utils'

type AccompanyingGuest = {
  name: string
  docNumber?: string
  docType?: string
  isMatched?: boolean
}

function getAccompanyingGuests(item: any, cleanSearchStr?: string): AccompanyingGuest[] {
  const result: AccompanyingGuest[] = []
  const mainName = (item.guest_name || '').toLowerCase().trim().replace(/[\s+]+/g, '')
  const seen = new Set<string>()

  if (item.identities && Array.isArray(item.identities)) {
    for (const doc of item.identities) {
      const name = (doc.full_name || '').trim()
      const cleanName = name.toLowerCase().replace(/[\s+]+/g, '')
      if (name && cleanName !== mainName && !seen.has(cleanName)) {
        seen.add(cleanName)
        const isMatched = cleanSearchStr 
          ? (cleanName.includes(cleanSearchStr) || (doc.document_number && String(doc.document_number).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)))
          : false
        result.push({
          name,
          docNumber: doc.document_number || undefined,
          docType: doc.document_type || undefined,
          isMatched
        })
      }
    }
  }

  if (item.id_documents && Array.isArray(item.id_documents)) {
    for (const doc of item.id_documents) {
      const name = (doc.fullName || doc.full_name || doc.name || '').trim()
      const cleanName = name.toLowerCase().replace(/[\s+]+/g, '')
      if (name && cleanName !== mainName && !seen.has(cleanName)) {
        seen.add(cleanName)
        const docNum = doc.documentNumber || doc.document_number
        const isMatched = cleanSearchStr 
          ? (cleanName.includes(cleanSearchStr) || (docNum && String(docNum).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)))
          : false
        result.push({
          name,
          docNumber: docNum || undefined,
          docType: doc.documentType || doc.document_type || undefined,
          isMatched
        })
      }
    }
  }

  return result
}

function normalizeDateStr(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    const trimmed = val.trim()
    // Match YYYY-MM-DD or YYYY/MM/DD
    const matchYmd = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/)
    if (matchYmd) {
      const [_, y, m, d] = matchYmd
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    // Match DD-MM-YYYY or DD/MM/YYYY (common in Indian registers and legacy forms)
    const matchDmy = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/)
    if (matchDmy) {
      const [_, d, m, y] = matchDmy
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  try {
    const d = new Date(val)
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
      return d.toISOString().split('T')[0]
    }
  } catch {}
  return null
}

function formatDateSafe(val: any, fallback = '—'): string {
  if (!val) return fallback
  const normalized = normalizeDateStr(val)
  if (normalized) {
    try {
      const d = new Date(normalized + 'T00:00:00')
      if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      }
    } catch {}
  }
  try {
    const d = new Date(val)
    if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return fallback
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return fallback
  }
}

function checkinMatchesDate(item: any, dateFilter: string): boolean {
  if (!dateFilter) return true
  const target = normalizeDateStr(dateFilter)
  if (!target) return true

  const checkin = normalizeDateStr(item.checkin_date || item.register_date)
  const checkout = normalizeDateStr(item.checkout_date)
  const createdAt = normalizeDateStr(item.created_at)

  // Direct match on check-in, register date or creation date
  if (checkin && checkin === target) return true
  if (!checkin && createdAt && createdAt === target) return true

  // Date range match: guest active on the filtered date
  if (checkin && checkout) {
    return checkin <= target && target <= checkout
  }

  // Ongoing stay with no checkout date set yet
  if (checkin && !checkout) {
    return checkin <= target
  }

  return false
}

export default function PoliceDashboardClient({ 
  initialCheckins,
  initialEmployees 
}: { 
  initialCheckins: any[]
  initialEmployees: any[]
}) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [activeTab, setActiveTab] = useState<'guests' | 'staff'>('guests')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedCheckin, setSelectedCheckin] = useState<any>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)

  const filteredCheckins = useMemo(() => {
    const list = initialCheckins.filter(item => {
      const searchStr = searchTerm.toLowerCase().trim()
      const cleanSearchStr = searchStr.replace(/[\s+]+/g, '')
      
      let matchesIdentity = false;
      if (item.identities && Array.isArray(item.identities)) {
        matchesIdentity = item.identities.some((doc: any) => 
          (doc.document_number && String(doc.document_number).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
          (doc.full_name && String(doc.full_name).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
          (doc.raw_ocr_text && String(doc.raw_ocr_text).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
          (doc.address && String(doc.address).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
          (doc.raw_ocr_text_back && String(doc.raw_ocr_text_back).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr))
        )
      }
      
      if (!matchesIdentity && item.id_documents && Array.isArray(item.id_documents)) {
        matchesIdentity = item.id_documents.some((doc: any) => 
          (doc.documentNumber && String(doc.documentNumber).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
          (doc.document_number && String(doc.document_number).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
          (doc.fullName && String(doc.fullName).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
          (doc.full_name && String(doc.full_name).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
          (doc.name && String(doc.name).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr))
        )
      }

      const cleanPhone = (item.guest_phone || '').replace(/[\s+]+/g, '')
      const cleanVehicle = (item.vehicle_number || '').toLowerCase().replace(/[\s+]+/g, '')
      const cleanRoom = (item.room_number || '').toLowerCase().replace(/[\s+]+/g, '')
      const cleanUid = (item.uid || '').toLowerCase().replace(/[\s+]+/g, '')

      const matchesSearch = 
        !cleanSearchStr ||
        (item.guest_name && item.guest_name.toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
        cleanPhone.includes(cleanSearchStr) ||
        cleanVehicle.includes(cleanSearchStr) ||
        cleanRoom.includes(cleanSearchStr) ||
        cleanUid.includes(cleanSearchStr) ||
        (item.properties?.name && item.properties.name.toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
        (item.properties?.city_area && item.properties.city_area.toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
        matchesIdentity
      
      const matchesDate = checkinMatchesDate(item, dateFilter)
      
      return matchesSearch && matchesDate
    })

    return list.sort((a, b) => {
      const dateA = normalizeDateStr(a.checkin_date || a.register_date) || normalizeDateStr(a.created_at) || ''
      const dateB = normalizeDateStr(b.checkin_date || b.register_date) || normalizeDateStr(b.created_at) || ''
      
      const timeA = dateA ? new Date(dateA + 'T00:00:00').getTime() : (new Date(a.created_at || 0).getTime() || 0)
      const timeB = dateB ? new Date(dateB + 'T00:00:00').getTime() : (new Date(b.created_at || 0).getTime() || 0)
      
      const safeA = isNaN(timeA) ? 0 : timeA
      const safeB = isNaN(timeB) ? 0 : timeB
      return safeB - safeA
    })
  }, [searchTerm, dateFilter, initialCheckins])

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const searchStr = searchTerm.toLowerCase()
      const cleanSearchStr = searchStr.replace(/[\s+]+/g, '')
      const name = `${emp.first_name} ${emp.last_name}`.toLowerCase()
      
      const matchesIdentity = 
        (emp.govt_doc_number && String(emp.govt_doc_number).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
        (emp.govt_doc_name && String(emp.govt_doc_name).toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr))

      const cleanPhone = (emp.mobile_number || '').replace(/[\s+]+/g, '')

      return (name && name.replace(/[\s+]+/g, '').includes(cleanSearchStr)) || 
             cleanPhone.includes(cleanSearchStr) ||
             (emp.properties?.name && emp.properties.name.toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
             (emp.properties?.city_area && emp.properties.city_area.toLowerCase().replace(/[\s+]+/g, '').includes(cleanSearchStr)) ||
             matchesIdentity
    })
  }, [searchTerm, employees])

  const handleExport = () => {
    window.print()
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <h2 className="text-4xl font-black text-blue-900 tracking-tight mb-2">Central Registry</h2>
          <p className="text-gray-500 font-medium">Monitoring active check-ins and property staff across Alibag.</p>
        </div>
        <div className="flex gap-3">
           <Button 
            variant="outline" 
            onClick={() => { setSearchTerm(''); setDateFilter(''); }}
            className="rounded-xl border-gray-200"
           >
             <FilterX className="w-4 h-4 mr-2" /> Reset
           </Button>
           <Button 
            onClick={handleExport}
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl px-6 shadow-lg shadow-blue-100"
           >
             <FileDown className="w-4 h-4 mr-2" /> Export PDF Report
           </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 print:hidden">
        <button 
          className={`pb-4 px-4 font-bold text-lg border-b-4 transition-colors flex items-center gap-2 ${activeTab === 'guests' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          onClick={() => setActiveTab('guests')}
        >
          <Users className="w-5 h-5" /> Guest Registry ({filteredCheckins.length})
        </button>
        <button 
          className={`pb-4 px-4 font-bold text-lg border-b-4 transition-colors flex items-center gap-2 ${activeTab === 'staff' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          onClick={() => setActiveTab('staff')}
        >
          <Briefcase className="w-5 h-5" /> Staff Registry ({filteredEmployees.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className={`grid gap-4 print:hidden ${activeTab === 'guests' ? 'md:grid-cols-4' : 'grid-cols-1'}`}>
        <div className={`${activeTab === 'guests' ? 'md:col-span-3' : ''} relative`}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder={`Search by ${activeTab === 'guests' ? 'Guest Name' : 'Staff Name'}, Phone, or Property...`}
            className="pl-12 h-14 rounded-2xl border-gray-200 bg-white shadow-sm text-lg font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {activeTab === 'guests' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <Input 
                type="date"
                className="pl-12 h-14 rounded-2xl border-gray-200 bg-white shadow-sm"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            {dateFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('')}
                className="h-14 px-3 rounded-2xl border-gray-200 text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-red-50"
                title="Clear date filter"
              >
                <FilterX className="w-4 h-4 mr-1" />
                All Dates
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {activeTab === 'guests' ? (
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Guest Details</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Stay Duration</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Property & Owner</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right print:hidden">Identification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCheckins.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-6">
                      {(() => {
                        const cleanSearchStr = searchTerm.toLowerCase().trim().replace(/[\s+]+/g, '')
                        const accompanying = getAccompanyingGuests(item, cleanSearchStr)
                        const matchedAccompanying = cleanSearchStr ? accompanying.filter(a => a.isMatched) : []

                        return (
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-900 font-black text-xl shrink-0 mt-0.5">
                              {(item.guest_name || 'Guest').charAt(0)}
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black text-gray-900 text-lg leading-tight">{item.guest_name || 'Guest'}</p>
                                <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-blue-200">
                                  Primary Guest
                                </span>
                                {item.status === 'draft' && (
                                  <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-amber-100">Draft</span>
                                )}
                                {item.source && (
                                  <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-indigo-200">
                                    {item.source}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-gray-500">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-bold">{item.guest_phone}</span>
                                {item.room_number && (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Room {item.room_number}
                                  </span>
                                )}
                              </div>

                              {/* Search Match Highlight for Accompanying Guest */}
                              {matchedAccompanying.length > 0 && (
                                <div className="p-2 bg-amber-50 border border-amber-300 rounded-xl mt-1 text-xs text-amber-900 font-bold flex items-center gap-1.5 shadow-sm">
                                  <span className="bg-amber-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">Search Match</span>
                                  <span>Accompanying: <strong>{matchedAccompanying.map(m => m.name).join(', ')}</strong></span>
                                </div>
                              )}

                              {/* Accompanying Guests List */}
                              {accompanying.length > 0 && (
                                <div className="mt-1 pt-1.5 border-t border-gray-100">
                                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                                    Accompanying Guests ({accompanying.length}):
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {accompanying.map((acc, aIdx) => (
                                      <span
                                        key={aIdx}
                                        className={cn(
                                          "text-xs px-2 py-0.5 rounded-lg border font-medium flex items-center gap-1",
                                          acc.isMatched 
                                            ? "bg-amber-100 text-amber-900 border-amber-300 font-bold ring-1 ring-amber-400" 
                                            : "bg-gray-50 text-gray-700 border-gray-200"
                                        )}
                                      >
                                        <span>{acc.name}</span>
                                        {acc.docNumber && (
                                          <span className="text-[10px] text-gray-400 font-mono">({acc.docNumber})</span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="text-sm font-bold">
                            {formatDateSafe(item.checkin_date || item.register_date, formatDateSafe(item.created_at, 'Check-in TBD'))}
                            {item.checkout_date ? ` — ${formatDateSafe(item.checkout_date)}` : ' (Ongoing Stay)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold uppercase">{item.num_people} Persons</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          <p className="font-black text-gray-900 text-sm uppercase tracking-tight">{item.properties?.name}</p>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 ml-5">
                          <MapPin className="w-2.5 h-2.5" /> {item.properties?.city_area}
                        </p>
                        <div className="mt-2 pt-2 border-t border-gray-50 flex flex-col">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Owner</span>
                          <span className="text-xs font-bold text-gray-700">{item.properties?.owners?.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right print:hidden">
                      <Button 
                        variant="outline" 
                        className="rounded-xl border-blue-100 bg-blue-50/50 text-blue-700 font-bold text-xs hover:bg-blue-600 hover:text-white transition-all"
                        onClick={() => setSelectedCheckin(item)}
                      >
                        View ID Proofs
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredCheckins.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic">
                      No records found matching your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Staff Member</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Role & Property</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Permanent Address</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Guardian</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-900 font-black text-xl shrink-0">
                          {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-lg leading-tight">{emp.first_name} {emp.last_name}</p>
                          <div className="flex items-center gap-2 text-gray-500 mt-1">
                            <Phone className="w-3 h-3" />
                            <span className="text-xs font-bold">{emp.mobile_number}</span>
                          </div>
                          {emp.date_of_birth && (
                            <div className="flex items-center gap-2 text-gray-500 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs font-medium">DOB: {emp.date_of_birth}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                          <p className="font-bold text-gray-900 text-sm uppercase">{emp.role}</p>
                        </div>
                        <p className="text-xs font-medium text-gray-500 flex items-center gap-1 ml-5">
                          {emp.properties?.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="text-sm text-gray-700 max-w-xs break-words">
                        <MapPin className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                        {emp.permanent_address || 'Not Provided'}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      {emp.guardian_name ? (
                        <div className="text-sm text-gray-700">
                          <p className="font-bold">{emp.guardian_name}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="w-3 h-3" /> {emp.guardian_phone || '—'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-2 items-start">
                        {emp.govt_doc_verified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-800">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : emp.govt_doc_front_url ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-800">
                            Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600">
                            Pending
                          </span>
                        )}
                        {(emp.name_match_status === 'MISMATCH' || emp.dob_match_status === 'MISMATCH') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-100 text-red-800">
                            Mismatch ⚠
                          </span>
                        )}
                        {emp.police_verification_status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-800 mt-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Police Approved
                          </span>
                        )}
                        {emp.police_verification_status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-800 mt-1">
                            <XCircle className="w-3.5 h-3.5" /> Police Rejected
                          </span>
                        )}
                        {(!emp.police_verification_status || emp.police_verification_status === 'PENDING') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 mt-1">
                            Pending Police Approval
                          </span>
                        )}
                        {emp.govt_doc_front_url && (
                          <Button 
                            variant="outline" 
                            className="rounded-lg h-7 px-3 border-indigo-100 bg-indigo-50/50 text-indigo-700 font-bold text-[10px] uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all print:hidden"
                            onClick={() => setSelectedEmployee(emp)}
                          >
                            View ID
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic">
                      No staff records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ID Proof Modal */}
      {selectedCheckin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
             <button 
              onClick={() => setSelectedCheckin(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors z-10"
             >
               <Search className="w-6 h-6 rotate-45" />
             </button>

             <div className="p-4 md:p-8 border-b bg-gray-50/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-900 text-white p-1.5 rounded-lg"><ShieldCheck className="w-5 h-5" /></div>
                  <h3 className="text-2xl font-black text-gray-900">Identification Documents</h3>
                </div>
                <p className="text-gray-500 font-medium">Verification for <span className="text-blue-900 font-bold">{selectedCheckin.guest_name}</span> staying at {selectedCheckin.properties?.name}</p>
             </div>

             <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/30">
                {selectedCheckin.identities && selectedCheckin.identities.length > 0 ? (
                  <div className="flex flex-col gap-8">
                    {selectedCheckin.identities.map((doc: any, idx: number) => (
                      <div key={idx} className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            Person {idx + 1} — {doc.document_type || 'ID Document'}
                            {doc.document_number ? ` · ${doc.document_number}` : ''}
                            {doc.full_name ? ` · ${doc.full_name}` : ''}
                          </p>
                          {doc.is_verified && (
                            <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-black uppercase">✓ Verified</span>
                          )}
                          {!doc.is_verified && doc.verification_status && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">
                              {doc.verification_status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {doc.address && (
                          <div className="bg-blue-50/50 rounded-xl p-3 mb-2 border border-blue-100">
                            <span className="font-bold text-blue-400 uppercase text-[9px] tracking-wider block mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Extracted Address
                            </span>
                            <p className="text-xs text-blue-900 font-medium">{doc.address}</p>
                          </div>
                        )}
                        {(doc.date_of_birth || doc.ocr_json) && (
                          (() => {
                            const ocrData = doc.ocr_json && typeof doc.ocr_json === 'string' 
                              ? (() => { try { return JSON.parse(doc.ocr_json) } catch { return {} } })()
                              : (doc.ocr_json || {})
                            const gender = ocrData.gender || ocrData.Gender
                            const expiry = ocrData.expiry_date || ocrData.expiryDate || ocrData.expiry
                            if (!doc.date_of_birth && !gender && !expiry) return null;
                            return (
                              <div className="bg-gray-50 rounded-xl p-3 mb-2 border border-gray-200 grid grid-cols-2 gap-3">
                                {doc.date_of_birth && (
                                  <div>
                                    <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block mb-0.5">Date of Birth</span>
                                    <p className="text-xs text-gray-800 font-bold">{doc.date_of_birth}</p>
                                  </div>
                                )}
                                {gender && (
                                  <div>
                                    <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block mb-0.5">Gender</span>
                                    <p className="text-xs text-gray-800 font-bold capitalize">{String(gender).toLowerCase()}</p>
                                  </div>
                                )}
                                {expiry && (
                                  <div className="col-span-2 border-t border-gray-150 pt-2">
                                    <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block mb-0.5">Expiry Date</span>
                                    <p className="text-xs text-gray-850 font-bold">{expiry}</p>
                                  </div>
                                )}
                              </div>
                            )
                          })()
                        )}
                        {(doc.raw_ocr_text || doc.raw_ocr_text_back) && (
                          <div className="bg-gray-100 rounded-xl p-3 mb-2 max-h-32 overflow-y-auto text-[10px] text-gray-600 font-mono whitespace-pre-wrap shadow-inner border border-gray-200">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block mb-1">Raw Extracted OCR Data:</span>
                            {doc.raw_ocr_text && <div><span className="font-bold text-gray-500">FRONT:</span> {doc.raw_ocr_text}</div>}
                            {doc.raw_ocr_text_back && <div className="mt-2 pt-2 border-t border-gray-200"><span className="font-bold text-gray-500">BACK:</span> {doc.raw_ocr_text_back}</div>}
                          </div>
                        )}
                        <div className="grid sm:grid-cols-2 gap-6">
                          {/* Front */}
                          {doc.document_image_url && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">▣ Front Side</p>
                              <div className="group relative bg-white border-4 border-white rounded-3xl overflow-hidden shadow-md aspect-[4/3]">
                                <Image src={doc.document_image_url} alt="Front ID" fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                <a href={doc.document_image_url} target="_blank" rel="noopener noreferrer"
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-[2px]">
                                  <ExternalLink className="w-5 h-5" /> Open Full Image
                                </a>
                              </div>
                            </div>
                          )}
                          {/* Back */}
                          {doc.back_image_url ? (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">◫ Back Side</p>
                              <div className="group relative bg-white border-4 border-white rounded-3xl overflow-hidden shadow-md aspect-[4/3]">
                                <Image src={doc.back_image_url} alt="Back ID" fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                <a href={doc.back_image_url} target="_blank" rel="noopener noreferrer"
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-[2px]">
                                  <ExternalLink className="w-5 h-5" /> Open Full Image
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">◫ Back Side</p>
                              <div className="aspect-[4/3] rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs font-bold">
                                Not uploaded
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedCheckin.id_documents && selectedCheckin.id_documents.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-8">
                    {selectedCheckin.id_documents.map((person: any, idx: number) => (
                      <React.Fragment key={idx}>
                        {person.frontUrl && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Person {person.personIndex || idx + 1} — Front Side</p>
                            <div className="group relative bg-white border-4 border-white rounded-3xl overflow-hidden shadow-md aspect-[4/3] sm:aspect-video">
                              <Image src={person.frontUrl} alt="Front ID" fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                              <a href={person.frontUrl} target="_blank" rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-[2px]">
                                <ExternalLink className="w-5 h-5" /> Open Full Image
                              </a>
                            </div>
                          </div>
                        )}
                        {person.backUrl && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Person {person.personIndex || idx + 1} — Back Side</p>
                            <div className="group relative bg-white border-4 border-white rounded-3xl overflow-hidden shadow-md aspect-[4/3] sm:aspect-video">
                              <Image src={person.backUrl} alt="Back ID" fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                              <a href={person.backUrl} target="_blank" rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-[2px]">
                                <ExternalLink className="w-5 h-5" /> Open Full Image
                              </a>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-gray-400 italic bg-white rounded-3xl border-2 border-dashed">
                    No documents uploaded for this check-in.
                  </div>
                )}
             </div>
             
             <div className="p-4 md:p-8 border-t bg-white flex justify-end">
                <Button 
                  onClick={() => setSelectedCheckin(null)}
                  className="bg-gray-900 hover:bg-black text-white px-8 h-12 rounded-xl font-bold"
                >
                  Close Viewer
                </Button>
             </div>
          </div>
        </div>
      )}

      {/* Employee ID Proof Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
             <button 
              onClick={() => setSelectedEmployee(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors z-10"
             >
               <Search className="w-6 h-6 rotate-45" />
             </button>

             <div className="p-4 md:p-8 border-b bg-gray-50/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-indigo-900 text-white p-1.5 rounded-lg"><Briefcase className="w-5 h-5" /></div>
                  <h3 className="text-2xl font-black text-gray-900">Staff Identification</h3>
                </div>
                <p className="text-gray-500 font-medium">Verification for <span className="text-indigo-900 font-bold">{selectedEmployee.first_name} {selectedEmployee.last_name}</span> working at {selectedEmployee.properties?.name}</p>
             </div>

             <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/30">
               <div className="flex flex-col gap-8">
                 <div className="flex flex-col gap-4">
                   <div className="flex items-center gap-2 flex-wrap">
                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                       {selectedEmployee.govt_doc_type || 'Government ID'}
                       {selectedEmployee.govt_doc_number ? ` · ${selectedEmployee.govt_doc_number}` : ''}
                       {selectedEmployee.govt_doc_name ? ` · ${selectedEmployee.govt_doc_name}` : ''}
                     </p>
                     {selectedEmployee.govt_doc_verified && (
                       <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-black uppercase">✓ Verified</span>
                     )}
                     {selectedEmployee.name_match_status === 'MISMATCH' && (
                       <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-black uppercase">⚠ Name Mismatch</span>
                     )}
                     {selectedEmployee.dob_match_status === 'MISMATCH' && (
                       <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">⚠ DOB Mismatch</span>
                     )}
                   </div>
                   <div className="grid sm:grid-cols-2 gap-6">
                     {/* Front */}
                     {selectedEmployee.govt_doc_front_url && (
                       <div className="space-y-2">
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">▣ Front Side</p>
                         <div className="group relative bg-white border-4 border-white rounded-3xl overflow-hidden shadow-md aspect-[4/3]">
                           <Image src={selectedEmployee.govt_doc_front_url} alt="Front ID" fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                           <a href={selectedEmployee.govt_doc_front_url} target="_blank" rel="noopener noreferrer"
                             className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-[2px]">
                             <ExternalLink className="w-5 h-5" /> Open Full Image
                           </a>
                         </div>
                       </div>
                     )}
                     {/* Back */}
                     {selectedEmployee.govt_doc_back_url ? (
                       <div className="space-y-2">
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">◫ Back Side</p>
                         <div className="group relative bg-white border-4 border-white rounded-3xl overflow-hidden shadow-md aspect-[4/3]">
                           <Image src={selectedEmployee.govt_doc_back_url} alt="Back ID" fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                           <a href={selectedEmployee.govt_doc_back_url} target="_blank" rel="noopener noreferrer"
                             className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-[2px]">
                             <ExternalLink className="w-5 h-5" /> Open Full Image
                           </a>
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-2">
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">◫ Back Side</p>
                         <div className="aspect-[4/3] rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs font-bold">
                           Not uploaded
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="p-4 md:p-8 border-t bg-white flex flex-col md:flex-row justify-end gap-3">
                {(!selectedEmployee.police_verification_status || selectedEmployee.police_verification_status === 'PENDING') && (
                  <>
                    <Button 
                      onClick={async () => {
                        const res = await updateEmployeePoliceStatus(selectedEmployee.id, 'REJECTED')
                        if (res.success) {
                          setEmployees(employees.map(e => e.id === selectedEmployee.id ? { ...e, police_verification_status: 'REJECTED' } : e))
                          setSelectedEmployee(null)
                        } else {
                          alert(res.error)
                        }
                      }}
                      className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-8 h-12 rounded-xl font-bold"
                    >
                      Reject Employee
                    </Button>
                    <Button 
                      onClick={async () => {
                        const res = await updateEmployeePoliceStatus(selectedEmployee.id, 'APPROVED')
                        if (res.success) {
                          setEmployees(employees.map(e => e.id === selectedEmployee.id ? { ...e, police_verification_status: 'APPROVED' } : e))
                          setSelectedEmployee(null)
                        } else {
                          alert(res.error)
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 h-12 rounded-xl font-bold"
                    >
                      Approve Employee
                    </Button>
                  </>
                )}
                <Button 
                  onClick={() => setSelectedEmployee(null)}
                  className="bg-gray-900 hover:bg-black text-white px-8 h-12 rounded-xl font-bold"
                >
                  Close Viewer
                </Button>
             </div>
          </div>
        </div>
      )}

      {/* Global CSS for Print Optimization */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .max-w-7xl { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          table { border: 1px solid #eee !important; }
          th { background-color: #f9fafb !important; color: #1e3a8a !important; }
          td { padding: 12px 15px !important; }
          .rounded-\\[32px\\] { border-radius: 0 !important; }
          tr { page-break-inside: avoid !important; }
        }
      `}} />
    </div>
  )
}
