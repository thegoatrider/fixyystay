'use client'

import React, { useMemo, useState } from 'react'
import { Users, MousePointerClick, CalendarCheck, BarChart3, ChevronDown, ChevronUp, MapPin, IndianRupee } from 'lucide-react'

type Promotion = {
  id: string
  property_id: string
  influencer_id: string
  properties: { name: string } | any
  influencers: { name: string, commission_rate: number } | any
  clicks: number
  bookingsCount: number
  revenue: number
  commission: number
}

export default function InfluencerPerformanceHub({ promotions }: { promotions: Promotion[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 1. Group by Influencer
  const groupedData = useMemo(() => {
    const groups: Record<string, { 
      name: string, 
      rate: number, 
      totalClicks: number, 
      totalBookings: number, 
      totalRevenue: number, 
      totalCommission: number,
      props: Promotion[] 
    }> = {}

    promotions.forEach(p => {
      const infId = p.influencer_id
      if (!groups[infId]) {
        groups[infId] = {
          name: p.influencers?.name || 'Unknown',
          rate: p.influencers?.commission_rate || 0,
          totalClicks: 0,
          totalBookings: 0,
          totalRevenue: 0,
          totalCommission: 0,
          props: []
        }
      }
      
      groups[infId].totalClicks += p.clicks
      groups[infId].totalBookings += p.bookingsCount
      groups[infId].totalRevenue += p.revenue
      groups[infId].totalCommission += p.commission
      groups[infId].props.push(p)
    })

    return Object.entries(groups).map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue) // Rank by revenue
  }, [promotions])

  if (groupedData.length === 0) {
    return (
      <div className="p-12 border-2 border-dashed rounded-3xl text-center text-gray-400 bg-white">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="font-medium">No influencer promotions active yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {groupedData.map((inf) => (
        <div 
          key={inf.id} 
          className={`bg-white border rounded-[32px] overflow-hidden transition-all duration-500 shadow-sm hover:shadow-xl ${expandedId === inf.id ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-100'}`}
        >
          {/* Main Influencer Header */}
          <div 
            className="p-6 md:p-8 cursor-pointer flex flex-col md:flex-row items-center justify-between gap-6"
            onClick={() => setExpandedId(expandedId === inf.id ? null : inf.id)}
          >
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Users className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-black text-gray-900 truncate">{inf.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest">
                    {inf.rate}% Commission
                   </span>
                   <span className="text-[10px] font-black bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full border border-gray-100 uppercase tracking-widest">
                    {inf.props.length} Properties
                   </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-auto flex-grow max-w-2xl">
              <StatItem icon={<MousePointerClick className="w-4 h-4" />} label="Clicks" value={inf.totalClicks} color="blue" />
              <StatItem icon={<CalendarCheck className="w-4 h-4" />} label="Bookings" value={inf.totalBookings} color="orange" />
              <StatItem icon={<BarChart3 className="w-4 h-4" />} label="Revenue" value={`₹${inf.totalRevenue.toLocaleString()}`} color="green" />
              <StatItem icon={<IndianRupee className="w-4 h-4" />} label="Earned" value={`₹${inf.totalCommission.toLocaleString()}`} color="indigo" highlight />
            </div>

            <div className="hidden md:block">
              {expandedId === inf.id ? <ChevronUp className="text-gray-300 w-6 h-6" /> : <ChevronDown className="text-gray-300 w-6 h-6" />}
            </div>
          </div>

          {/* Expanded Property List */}
          {expandedId === inf.id && (
            <div className="bg-gray-50/50 border-t border-gray-100 p-6 md:p-8 animate-in slide-in-from-top-2 duration-300">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Breakdown by Property</h4>
              <div className="grid gap-3">
                {inf.props.map((p) => (
                  <div key={p.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 group hover:border-blue-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 w-full md:w-1/3">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-gray-700 tracking-tight">{p.properties?.name || 'Unknown Property'}</span>
                    </div>
                    <div className="flex gap-8 text-center">
                       <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Clicks</p>
                          <p className="font-black text-gray-900">{p.clicks}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Bookings</p>
                          <p className="font-black text-gray-900">{p.bookingsCount}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Comm.</p>
                          <p className="font-black text-green-600">₹{p.commission.toLocaleString()}</p>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function StatItem({ icon, label, value, color, highlight }: { icon: React.ReactNode, label: string, value: string | number, color: string, highlight?: boolean }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    green: 'text-green-600',
    indigo: 'text-indigo-600',
  }
  
  return (
    <div className={`p-3 rounded-2xl border border-gray-100 flex items-center gap-3 ${highlight ? 'bg-indigo-50/30 border-indigo-100' : 'bg-white'}`}>
      <div className={`p-2 rounded-xl border border-gray-50 ${highlight ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
        <span className={colors[color]}>{icon}</span>
      </div>
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">{label}</p>
        <p className={`text-sm font-black ${highlight ? colors.indigo : 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  )
}
