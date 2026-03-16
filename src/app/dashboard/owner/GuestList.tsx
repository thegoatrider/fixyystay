'use client'

import { useState } from 'react'
import { Calendar, Phone, User, FileText, ExternalLink, Users, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

type GuestCheckin = {
  id: string
  guest_name: string
  guest_phone: string
  num_people: number
  checkin_date: string | null
  checkout_date: string | null
  id_documents: any[]
  created_at: string
  properties: { name: string }
}

export default function GuestList({ checkins }: { checkins: GuestCheckin[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCheckins = checkins.filter(c => 
    c.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.guest_phone.includes(searchTerm) ||
    c.properties.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Registered Guests</h2>
        <div className="relative w-72">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search by name, phone or property..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Guest Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Stay Dates</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Property</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Pax</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCheckins.map(checkin => (
                <tr key={checkin.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                       <User className="w-4 h-4 text-blue-500" /> {checkin.guest_name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                       <Phone className="w-3 h-3" /> {checkin.guest_phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 font-medium"><Calendar className="w-3 h-3 text-gray-400"/> In: {checkin.checkin_date || 'N/A'}</span>
                      <span className="flex items-center gap-1 font-medium"><Calendar className="w-3 h-3 text-gray-400"/> Out: {checkin.checkout_date || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {checkin.properties.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md w-fit">
                       <Users className="w-3 h-3" /> {checkin.num_people}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {checkin.id_documents && checkin.id_documents.length > 0 ? (
                        checkin.id_documents.map((doc: any, i: number) => (
                          <a 
                            key={i}
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-md transition-all border"
                            title={`View ID for Person ${doc.personIndex || i + 1}`}
                          >
                             <FileText className="w-3 h-3" /> ID {doc.personIndex || i + 1} <ExternalLink className="w-2 h-2" />
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No IDs uploaded</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCheckins.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                     No guest records found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-500 italic">
        * Note: Guests are added here automatically once they complete the ID verification form.
      </p>
    </div>
  )
}
