'use client'

import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  FileDown, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  Building2,
  ExternalLink,
  ShieldCheck,
  FilterX
} from 'lucide-react'

export default function PoliceDashboardClient({ initialCheckins }: { initialCheckins: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedCheckin, setSelectedCheckin] = useState<any>(null)

  const filteredCheckins = useMemo(() => {
    return initialCheckins.filter(item => {
      const searchStr = searchTerm.toLowerCase()
      const matchesSearch = 
        item.guest_name.toLowerCase().includes(searchStr) ||
        item.guest_phone.includes(searchTerm) ||
        item.properties?.name.toLowerCase().includes(searchStr) ||
        item.properties?.city_area?.toLowerCase().includes(searchStr)
      
      const matchesDate = !dateFilter || item.checkin_date === dateFilter
      
      return matchesSearch && matchesDate
    })
  }, [searchTerm, dateFilter, initialCheckins])

  const handleExport = () => {
    window.print()
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <h2 className="text-4xl font-black text-blue-900 tracking-tight mb-2">Registry Overview</h2>
          <p className="text-gray-500 font-medium">Monitoring {initialCheckins.length} active and past guest check-ins across Alibag.</p>
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

      {/* Search Bar */}
      <div className="grid md:grid-cols-4 gap-4 print:hidden">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder="Search by Guest Name, Phone, or Property..." 
            className="pl-12 h-14 rounded-2xl border-gray-200 bg-white shadow-sm text-lg font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            type="date"
            className="pl-12 h-14 rounded-2xl border-gray-200 bg-white shadow-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-900 font-black text-xl shrink-0">
                        {item.guest_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg leading-tight">{item.guest_name}</p>
                        <div className="flex items-center gap-2 text-gray-500 mt-1">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs font-bold">{item.guest_phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-sm font-bold">{new Date(item.checkin_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — {new Date(item.checkout_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
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
        </div>
      </div>

      {/* ID Proof Modal */}
      {selectedCheckin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
             <button 
              onClick={() => setSelectedCheckin(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors z-10"
             >
               <Search className="w-6 h-6 rotate-45" />
             </button>

             <div className="p-8 border-b bg-gray-50/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-900 text-white p-1.5 rounded-lg"><ShieldCheck className="w-5 h-5" /></div>
                  <h3 className="text-2xl font-black text-gray-900">Identification Documents</h3>
                </div>
                <p className="text-gray-500 font-medium">Verification for <span className="text-blue-900 font-bold">{selectedCheckin.guest_name}</span> staying at {selectedCheckin.properties?.name}</p>
             </div>

             <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                <div className="grid sm:grid-cols-2 gap-8">
                  {selectedCheckin.identities && selectedCheckin.identities.length > 0 ? (
                    selectedCheckin.identities.map((doc: any, idx: number) => (
                      <React.Fragment key={idx}>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Person {idx + 1} — {doc.document_type || 'ID Document'}</p>
                          <div className="group relative bg-white border-4 border-white rounded-3xl overflow-hidden shadow-md aspect-[4/3] sm:aspect-video">
                            <img 
                              src={doc.document_image_url} 
                              alt="ID Document" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <a 
                              href={doc.document_image_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-[2px]"
                            >
                              <ExternalLink className="w-5 h-5" /> Open Full Image
                            </a>
                          </div>
                        </div>
                      </React.Fragment>
                    ))
                  ) : selectedCheckin.id_documents && selectedCheckin.id_documents.length > 0 ? (
                    selectedCheckin.id_documents.map((person: any, idx: number) => (
                      <React.Fragment key={idx}>
                        {/* Front ID */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Person {person.personIndex || idx + 1} — Front Side</p>
                          <div className="group relative bg-white border-4 border-white rounded-3xl overflow-hidden shadow-md aspect-[4/3] sm:aspect-video">
                            <img 
                              src={person.frontUrl} 
                              alt="Front ID" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <a 
                              href={person.frontUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-[2px]"
                            >
                              <ExternalLink className="w-5 h-5" /> Open Full Image
                            </a>
                          </div>
                        </div>

                        {/* Back ID */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Person {person.personIndex || idx + 1} — Back Side</p>
                          <div className="group relative bg-white border-4 border-white rounded-3xl overflow-hidden shadow-md aspect-[4/3] sm:aspect-video">
                            <img 
                              src={person.backUrl} 
                              alt="Back ID" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <a 
                              href={person.backUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 backdrop-blur-[2px]"
                            >
                              <ExternalLink className="w-5 h-5" /> Open Full Image
                            </a>
                          </div>
                        </div>
                      </React.Fragment>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center text-gray-400 italic bg-white rounded-3xl border-2 border-dashed">
                      No documents uploaded for this check-in.
                    </div>
                  )}
                </div>
             </div>
             
             <div className="p-8 border-t bg-white flex justify-end">
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

      {/* Global CSS for Print Optimization */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .max-w-7xl {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            border: 1px solid #eee !important;
          }
          th {
            background-color: #f9fafb !important;
            color: #1e3a8a !important;
          }
          td {
            padding: 12px 15px !important;
          }
          .rounded-[32px] {
            border-radius: 0 !important;
          }
          /* Prevent page breaks inside table rows */
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  )
}
