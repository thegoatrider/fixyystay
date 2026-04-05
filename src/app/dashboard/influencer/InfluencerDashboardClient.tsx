'use client'

import { DollarSign, MousePointerClick, CalendarCheck, Megaphone, Wallet, ExternalLink, Share2, Search, Send, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { CopyLinkButton } from './CopyLinkButton'
import WalletSection from '@/components/WalletSection'
import { requestPayout } from '@/app/actions/wallet'
import { useInfluencerDashboardData } from '@/hooks/useInfluencerDashboardData'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { submitPromotionRequest } from './influencer-requests-actions'
import React, { useState, useMemo } from 'react'

export default function InfluencerDashboardClient({ 
  influencerId, 
  isSuperAdmin 
}: { 
  influencerId: string, 
  isSuperAdmin: boolean 
}) {
  const { data, isLoading, error, refetch } = useInfluencerDashboardData(influencerId, isSuperAdmin)
  const [activeTab, setActiveTab] = useState<'promoting' | 'marketplace'>('promoting')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<any>(null)
  const [proposalText, setProposalText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) return <div className="p-8 text-center text-red-500">Error loading dashboard: {error?.message || 'Unknown error'}</div>

  const { influencer, all_properties, my_requests, clicks, bookings, wallet_transactions, payout_requests } = data
  const commissionRate = influencer?.commission_rate || 0
  const publicInfluencerId = influencer?.id || influencerId

  // Aggregate global stats
  const totalClicks = clicks?.length || 0
  const totalBookings = bookings?.length || 0
  const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.amount || 0), 0) || 0
  const totalCommission = totalRevenue * (commissionRate / 100)

  // Derived logic
  const acceptedPropertyIds = new Set(my_requests?.filter(r => r.status === 'accepted').map(r => r.property_id))
  const pendingPropertyIds = new Set(my_requests?.filter(r => r.status === 'pending').map(r => r.property_id))
  const rejectedPropertyIds = new Map(my_requests?.filter(r => r.status === 'rejected').map(r => [r.property_id, r.rejection_reason]))

  const promotingProperties = all_properties.filter(p => acceptedPropertyIds.has(p.id))
  const marketplaceProperties = all_properties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://www.fixystays.com'

  const handleRequestPromotion = async () => {
    if (!selectedProperty || !proposalText) return
    setIsSubmitting(true)
    const res = await submitPromotionRequest(selectedProperty.id, proposalText)
    if (res.success) {
      setIsRequestModalOpen(false)
      setProposalText('')
      setSelectedProperty(null)
      refetch()
    } else {
      alert(res.error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 max-w-7xl mx-auto w-full px-4 md:px-6">
      
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 rounded-[2rem] pt-14 pb-12 px-10 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-white text-center md:text-left drop-shadow-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-blue-200 mb-4 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Live Partner Account
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3">Influencer Suite</h1>
            <p className="text-indigo-100/80 text-lg max-w-xl font-medium leading-relaxed">
              Browse elite properties, send promotion pitches, and monitor your commission earnings.
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-center min-w-[200px] shadow-inner">
            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em] mb-2">Commission Rate</p>
            <div className="text-5xl font-black text-white flex items-center justify-center gap-1">
              {commissionRate}<span className="text-2xl text-indigo-300">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-[-3rem] relative z-20 px-2 lg:px-0">
        <StatCard icon={<MousePointerClick className="w-6 h-6" />} label="Clicks" value={totalClicks} color="blue" />
        <StatCard icon={<CalendarCheck className="w-6 h-6" />} label="Bookings" value={totalBookings} color="orange" />
        <StatCard icon={<DollarSign className="w-6 h-6" />} label="Revenue" value={`₹${totalRevenue.toLocaleString()}`} color="green" />
        <StatCard icon={<Megaphone className="w-6 h-6" />} label="Earned" value={`₹${totalCommission.toLocaleString()}`} color="dark" highlight />
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-col gap-8 mt-4">
        <div className="flex p-1.5 bg-gray-100 rounded-2xl w-fit self-center md:self-start shadow-inner border border-gray-200/50">
          <button 
            onClick={() => setActiveTab('promoting')}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'promoting' ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Share2 className="w-4 h-4" /> Promoting
            {promotingProperties.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">{promotingProperties.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('marketplace')}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'marketplace' ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Search className="w-4 h-4" /> Marketplace
          </button>
        </div>

        {activeTab === 'promoting' ? (
          <section className="space-y-6">
            {promotingProperties.length === 0 ? (
              <div className="p-20 border-2 border-dashed bg-white rounded-[2.5rem] text-center text-gray-400 flex flex-col items-center gap-6 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 group">
                  <Megaphone className="w-10 h-10 opacity-20 group-hover:scale-110 transition-transform" />
                </div>
                <div className="max-w-md">
                  <p className="font-black text-gray-800 text-xl mb-2">No active promotions</p>
                  <p className="text-sm leading-relaxed mb-6 font-medium">Head over to the Marketplace to discover elite properties and send your first promotion proposal.</p>
                  <Button onClick={() => setActiveTab('marketplace')} className="bg-blue-600 hover:bg-blue-700 font-black rounded-xl px-8 h-12">
                    Browse Marketplace
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {promotingProperties.map((prop: any) => {
                  const link = `${appOrigin}/guest/property/${prop.id}?ref=${publicInfluencerId}`
                  const propClicks = clicks?.filter(c => c.property_id === prop.id).length || 0
                  const propBookings = bookings?.filter(b => b.property_id === prop.id) || []
                  const propRev = propBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0)
                  
                  return (
                    <div key={prop.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col md:flex-row gap-8 group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[100px] -z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="md:w-2/5 relative z-10 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-3">
                           <span className="text-[10px] uppercase font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 tracking-widest">{prop.type}</span>
                           <span className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-100 uppercase tracking-widest">
                             <CheckCircle2 className="w-3 h-3" /> Active
                           </span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors mb-2">{prop.name}</h3>
                        <p className="text-sm text-gray-400 font-medium leading-relaxed line-clamp-2">{prop.description}</p>
                        <div className="mt-4">
                           <a href={`/guest/property/${prop.id}`} target="_blank" className="text-xs font-black text-blue-500 hover:text-blue-700 flex items-center gap-1.5 transition-colors group-hover:translate-x-2 w-fit">
                              View Live Property <ExternalLink className="w-3.5 h-3.5" />
                           </a>
                        </div>
                      </div>
                      
                      <div className="md:w-3/5 flex flex-col gap-6 justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-8 md:pt-0 md:pl-10 relative z-10">
                        <div className="grid grid-cols-3 gap-6">
                          <StatsMiniCard label="Clicks" value={propClicks} color="blue" />
                          <StatsMiniCard label="Bookings" value={propBookings.length} color="orange" />
                          <StatsMiniCard label="Earnings" value={`₹${(propRev * (commissionRate / 100)).toLocaleString()}`} color="green" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Affiliate Engine Link</p>
                          <CopyLinkButton link={link} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-8">
            {/* Marketplace Filter */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input 
                placeholder="Search premium properties..." 
                className="pl-12 h-14 bg-white border-gray-200 rounded-2xl shadow-sm focus:ring-blue-500 font-medium"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {marketplaceProperties.map((prop: any) => {
                const isAccepted = acceptedPropertyIds.has(prop.id)
                const isPending = pendingPropertyIds.has(prop.id)
                const rejectionReason = rejectedPropertyIds.get(prop.id)
               
                return (
                  <div key={prop.id} className="bg-white flex flex-col rounded-[2.5rem] border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-500 overflow-hidden group">
                    <div className="relative h-56 overflow-hidden">
                       <img src={prop.image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={prop.name} />
                       <div className="absolute top-4 left-4 z-10">
                          <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-gray-900 border border-white/20 uppercase tracking-widest shadow-sm">
                            {prop.type}
                          </span>
                       </div>
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                       <div className="absolute bottom-4 left-6 text-white">
                          <p className="text-xs font-bold text-blue-200 uppercase tracking-tighter mb-0.5">{prop.address || 'Alibaug, MH'}</p>
                          <p className="text-xl font-black">{prop.name}</p>
                       </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1 gap-4">
                      <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2 italic">"{prop.description}"</p>
                      
                      <div className="mt-auto">
                        {isAccepted ? (
                          <div className="flex items-center justify-center gap-2 py-3.5 bg-green-50 rounded-2xl text-green-700 font-black text-sm border border-green-100">
                             <CheckCircle2 className="w-4 h-4" /> Already Promoting
                          </div>
                        ) : isPending ? (
                          <div className="flex items-center justify-center gap-2 py-3.5 bg-orange-50 rounded-2xl text-orange-700 font-black text-sm border border-orange-100 animate-pulse">
                             <Clock className="w-4 h-4" /> Application Pending
                          </div>
                        ) : rejectionReason ? (
                          <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                             <div className="flex items-center gap-2 text-red-700 font-black text-sm mb-1">
                               <XCircle className="w-4 h-4" /> Request Rejected
                             </div>
                             <p className="text-[10px] text-red-500 font-medium">Reason: {rejectionReason}</p>
                             <button 
                                onClick={() => { setSelectedProperty(prop); setIsRequestModalOpen(true) }}
                                className="mt-3 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800"
                             >
                               Retry Application
                             </button>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => { setSelectedProperty(prop); setIsRequestModalOpen(true) }}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 font-black rounded-2xl shadow-lg hover:shadow-indigo-200 transition-all gap-2"
                          >
                            <Send className="w-4 h-4" /> Send Promotion Pitch
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* Virtual Wallet Integration */}
      <section className="mt-4">
        <h2 className="text-2xl font-black mb-8 flex items-center gap-4 text-gray-900 px-2 lg:px-0">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          Financial Settlement Hub
        </h2>
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-4 md:p-8 shadow-md">
          <WalletSection 
            transactions={wallet_transactions || []} 
            payouts={payout_requests || []} 
            onRequestPayout={requestPayout.bind(null, influencerId || '')} 
          />
        </div>
      </section>

      {/* Proposal Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
               <h3 className="text-2xl font-black mb-1">Promotion Pitch</h3>
               <p className="text-blue-100 font-medium">Pitching for: {selectedProperty?.name}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Your Proposal Message</label>
                <Textarea 
                  placeholder="Hey owner! I have a strong following in Mumbai/Alibaug and I'd love to promote your property to my audience. Here's my plan..."
                  className="min-h-[160px] rounded-2xl border-gray-200 focus:ring-blue-600 font-medium py-4 px-4 shadow-inner bg-gray-50/50"
                  value={proposalText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProposalText(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 italic">This message will be sent directly to the property owner for review.</p>
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setIsRequestModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-gray-500 hover:bg-gray-50">Cancel</Button>
                <Button 
                  onClick={handleRequestPromotion} 
                  disabled={!proposalText || isSubmitting}
                  className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black text-lg gap-2 shadow-xl shadow-blue-100"
                >
                  {isSubmitting ? 'Sending...' : <><Send className="w-5 h-5" /> Submit Pitch</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color, highlight }: { icon: React.ReactNode, label: string, value: string | number, color: string, highlight?: boolean }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-white border-blue-50 text-blue-600',
    orange: 'bg-white border-orange-50 text-orange-600',
    green: 'bg-white border-green-50 text-green-600',
    dark: 'bg-gray-900 border-gray-800 text-white'
  }
  
  return (
    <div className={`${colorClasses[color]} border p-6 md:p-8 rounded-[2rem] shadow-sm hover:shadow-2xl transition-all duration-500 group flex flex-col items-center text-center overflow-hidden h-full relative`}>
      {highlight && <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-bl-full pointer-events-none"></div>}
      <div className={`p-4 rounded-2xl mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${color === 'dark' ? 'bg-white/10' : 'bg-gray-50/80 shadow-inner'}`}>
        {icon}
      </div>
      <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 ${color === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-2xl md:text-3xl font-black ${color === 'dark' ? 'text-blue-400' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function StatsMiniCard({ label, value, color }: { label: string, value: string | number, color: 'blue' | 'orange' | 'green' }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50/50 border-blue-100/50',
    orange: 'text-orange-600 bg-orange-50/50 border-orange-100/50',
    green: 'text-green-600 bg-green-50/50 border-green-100/50'
  }
  return (
    <div className={`${colors[color]} p-4 rounded-2xl border text-center transition-transform hover:scale-105 duration-300`}>
      <p className="text-[10px] font-black uppercase tracking-tighter opacity-60 mb-1">{label}</p>
      <p className="font-black text-xl">{value}</p>
    </div>
  )
}
