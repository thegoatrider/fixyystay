'use client'

import { DollarSign, MousePointerClick, CalendarCheck, Megaphone, Wallet, ExternalLink, Share2 } from 'lucide-react'
import { CopyLinkButton } from './CopyLinkButton'
import WalletSection from '@/components/WalletSection'
import { requestPayout } from '@/app/actions/wallet'
import { useInfluencerDashboardData } from '@/hooks/useInfluencerDashboardData'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import React, { useMemo } from 'react'

export default function InfluencerDashboardClient({ 
  influencerId, 
  isSuperAdmin 
}: { 
  influencerId: string, 
  isSuperAdmin: boolean 
}) {
  const { data, isLoading, error } = useInfluencerDashboardData(influencerId, isSuperAdmin)

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) return <div className="p-8 text-center text-red-500">Error loading dashboard: {error?.message || 'Unknown error'}</div>

  const { properties, clicks, bookings, wallet_transactions, payout_requests } = data

  // Aggregate global stats
  const totalClicks = clicks?.length || 0
  const totalBookings = bookings?.length || 0
  const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.amount || 0), 0) || 0
  const totalCommission = totalRevenue * 0.10

  // Use production domain for affiliate links
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://www.fixystays.com'

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-blue-800 rounded-3xl pt-12 pb-10 px-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white text-center md:text-left drop-shadow-sm min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">Influencer Panel</h1>
            <p className="text-blue-100/90 text-lg max-w-xl font-medium">
              Manage your unique links and track your commissions live.
            </p>
          </div>
          <div className="flex gap-3">
             <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[120px]">
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center justify-center gap-1.5 text-white font-bold">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                  Active
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<MousePointerClick className="w-6 h-6 text-blue-500" />} 
          label="Total Clicks" 
          value={totalClicks} 
          color="blue"
        />
        <StatCard 
          icon={<CalendarCheck className="w-6 h-6 text-orange-500" />} 
          label="Total Bookings" 
          value={totalBookings} 
          color="orange"
        />
        <StatCard 
          icon={<DollarSign className="w-6 h-6 text-green-500" />} 
          label="Revenue Driven" 
          value={`₹${totalRevenue.toLocaleString()}`} 
          color="green"
        />
        <StatCard 
          icon={<Megaphone className="w-6 h-6 text-yellow-400" />} 
          label="Your Commission" 
          value={`₹${totalCommission.toLocaleString()}`} 
          color="dark"
          highlight
        />
      </div>

      {/* Wallet Section */}
      <section className="mt-4">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><Wallet className="w-6 h-6 text-blue-600" /></div>
          Virtual Wallet
        </h2>
        <WalletSection 
          transactions={wallet_transactions || []} 
          payouts={payout_requests || []} 
          onRequestPayout={requestPayout.bind(null, influencerId || '')} 
        />
      </section>

      {/* Promotional Links */}
      <section className="mt-6 pb-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
           <div className="p-2 bg-indigo-50 rounded-lg"><Share2 className="w-6 h-6 text-indigo-600" /></div>
           Your Promotional Links
        </h2>
        
        {properties.length === 0 ? (
          <div className="p-20 border-2 border-dashed bg-white rounded-3xl text-center text-gray-400 flex flex-col items-center gap-4">
            <Megaphone className="w-12 h-12 opacity-20" />
            <p className="font-medium">You haven't been assigned any properties yet.<br/>Reach out to the admin to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {properties.map((prop: any) => {
              const link = `${appOrigin}/guest/property/${prop.id}?ref=${influencerId}`
              const propClicks = clicks?.filter(c => c.property_id === prop.id).length || 0
              const propBookings = bookings?.filter(b => b.property_id === prop.id) || []
              const propRev = propBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0)
              
              return (
                <div key={prop.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row gap-6 group">
                  <div className="md:w-1/3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] uppercase font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 tracking-widest">{prop.type}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{prop.name}</h3>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{prop.description}</p>
                    <div className="mt-4">
                       <a href={`/guest/property/${prop.id}`} target="_blank" className="text-xs font-bold text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                          View Property <ExternalLink className="w-3 h-3" />
                       </a>
                    </div>
                  </div>
                  
                  <div className="md:w-2/3 flex flex-col gap-6 justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50/50 p-3 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Clicks</p>
                        <p className="font-black text-xl text-gray-900">{propClicks}</p>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-xl border border-transparent hover:border-orange-100 hover:bg-orange-50/30 transition-all text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Bookings</p>
                        <p className="font-black text-xl text-gray-900">{propBookings.length}</p>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-xl border border-transparent hover:border-green-100 hover:bg-green-50/30 transition-all text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Earnings</p>
                        <p className="font-black text-xl text-green-600">₹{(propRev * 0.10).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="w-full">
                      <p className="text-[10px] text-gray-400 font-black mb-2 uppercase tracking-widest">Your Referral Link</p>
                      <CopyLinkButton link={link} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}

function StatCard({ icon, label, value, color, highlight }: { icon: React.ReactNode, label: string, value: string | number, color: string, highlight?: boolean }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-white border-blue-50',
    orange: 'bg-white border-orange-50',
    green: 'bg-white border-green-50',
    dark: 'bg-gray-900 text-white border-gray-800'
  }
  
  return (
    <div className={`${colorClasses[color]} border p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col items-center text-center overflow-hidden relative`}>
      {highlight && <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400/10 rounded-bl-[100px] pointer-events-none"></div>}
      <div className={`p-3 rounded-2xl mb-4 transition-transform duration-500 group-hover:scale-110 ${color === 'dark' ? 'bg-white/10' : 'bg-gray-50'}`}>
        {icon}
      </div>
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${color === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-3xl font-black ${color === 'dark' ? 'text-yellow-400' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
