import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { CheckCircle, Users, Wallet, CreditCard, Banknote, MapPin, BarChart3, Building2, Megaphone, XCircle, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import DeletePropertyButton from './DeletePropertyButton'
import FeaturedToggle from './FeaturedToggle'
import AdminPropertiesSearch from './AdminPropertiesSearch'
import PayoutActions from './PayoutActions'
import PropertyApprovalActions from './PropertyApprovalActions'
import InfluencerApprovalActions from './InfluencerApprovalActions'
import InfluencerPerformanceHub from './InfluencerPerformanceHub'
import { CreatePartnerForm } from './CreatePartnerForm'
import WebsiteQR from '@/components/WebsiteQR'
import GrowthHubWrapper from '@/components/GrowthHubWrapper'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // 1. Pending Approvals
  const { data: pendingProperties } = await supabase
    .from('properties')
    .select('*, owners(name), rooms(price_bucket)')
    .eq('approved', false)
    .order('created_at', { ascending: false })

  // 2. All Approved Properties
  const { data: approvedProperties } = await supabase
    .from('properties')
    .select('*, owners(name)')
    .eq('approved', true)
    .order('created_at', { ascending: false })

  // 3. Influencers (Approved)
  const { data: influencers } = await supabase
    .from('influencers')
    .select('*')
    .eq('approved', true)

  // 3b. Pending Influencers
  const { data: pendingInfluencers } = await supabase
    .from('influencers')
    .select('*')
    .eq('approved', false)
    .order('created_at', { ascending: false })

  // 4. Influencer Promotion Stats
  const { data: promotionData } = await supabase
    .from('influencer_properties')
    .select(`
      id,
      property_id,
      influencer_id,
      properties(name),
      influencers(name, commission_rate)
    `)

  const { data: clicks } = await supabase.from('influencer_clicks').select('*')
  const { data: bookings } = await supabase.from('bookings').select('*')

  const promotions = promotionData?.map(promo => {
    const promoClicks = clicks?.filter(c => c.property_id === promo.property_id && c.influencer_id === promo.influencer_id).length || 0
    const promoBookings = bookings?.filter(b => b.property_id === promo.property_id && b.influencer_id === promo.influencer_id) || []
    const totalRevenue = promoBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0)
    
    // Use dynamic commission rate from the influencer record
    const infInfo = promo.influencers as any
    const rate = Number(infInfo?.commission_rate || 0)
    const commission = totalRevenue * (rate / 100)

    return {
      ...promo,
      clicks: promoClicks,
      bookingsCount: promoBookings.length,
      revenue: totalRevenue,
      commission
    }
  }) || []

  // 5. Global Wallet Stats
  let walletTransactions: any[] = []
  let pendingPayoutsRaw: any[] = []
  try {
    const { data: wt } = await supabase.from('wallet_transactions').select('*')
    walletTransactions = wt || []
    const { data: pr } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    pendingPayoutsRaw = pr || []
  } catch (e) {
    console.warn('Wallet tables not found.')
  }

  const { data: allBookings } = await supabase.from('bookings').select('amount')
  const totalRevenueGenerated = allBookings?.reduce((sum, b) => sum + Number(b.amount || 0), 0) || 0
  
  const influencerIds = influencers?.map(i => i.id) || []
  let paidToOwners = 0
  let paidToInfluencers = 0
  
  walletTransactions.filter(t => t.transaction_type === 'earning').forEach(t => {
    if (influencerIds.includes(t.user_id)) {
      paidToInfluencers += Number(t.amount)
    } else {
      paidToOwners += Number(t.amount)
    }
  })
  
  const platformCommission = totalRevenueGenerated - paidToOwners - paidToInfluencers
  const { data: allOwners } = await supabase.from('owners').select('id, name')
  
  const pendingPayouts = pendingPayoutsRaw?.map(req => {
    const isInf = influencers?.find(i => i.id === req.user_id)
    const isOwner = allOwners?.find(o => o.id === req.user_id)
    
    return {
      ...req,
      userName: isInf?.name || isOwner?.name || 'Unknown User',
      userType: isInf ? 'Influencer' : (isOwner ? 'Owner' : 'Unknown'),
    }
  }) || []
  
  // 6. Inbound Business Leads (New Property Owners)
  const { data: inboundLeads } = await supabase
    .from('property_owner_leads')
    .select('*')
    .order('created_at', { ascending: false })

  // 7. Global Influencer Promotion Requests
  const { data: promotionRequests } = await supabase
    .from('influencer_promotion_requests')
    .select(`
      *,
      influencers(name, email),
      properties(name)
    `)
    .order('created_at', { ascending: false })

  // 8. Feature Usage Metrics (SQL View Fallback to JS)
  let leadFormOwnersCount = 0
  let guestFormOwnersCount = 0
  try {
    const { data: usageData, error: usageError } = await supabase
      .from('feature_usage_metrics')
      .select('*')
      .single()

    if (!usageError && usageData) {
      leadFormOwnersCount = Number(usageData.owners_using_lead_form || 0)
      guestFormOwnersCount = Number(usageData.owners_using_guest_form || 0)
    } else {
      throw new Error('View not found')
    }
  } catch (e) {
    // Fallback if view doesn't exist yet
    const { data: leadsData } = await supabase.from('leads').select('owner_id')
    const { data: checkinData } = await supabase.from('guest_checkins').select('owner_id')
    
    if (leadsData) {
      leadFormOwnersCount = new Set(leadsData.map(l => l.owner_id)).size
    }
    if (checkinData) {
      guestFormOwnersCount = new Set(checkinData.map(c => c.owner_id)).size
    }
  }

  return (
    <div className="flex flex-col gap-10">

      {/* SECTION 0: Global Ledger */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Wallet className="text-blue-600" /> Platform Financial Ledger
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border p-6 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">Total Booking Value</p>
            <p className="text-3xl font-bold text-gray-900">₹{totalRevenueGenerated.toLocaleString()}</p>
          </div>
          <div className="bg-white border-2 border-green-100 p-6 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Owner Earnings (80%)</p>
            <p className="text-3xl font-black text-gray-900">₹{paidToOwners.toLocaleString()}</p>
          </div>
          <div className="bg-white border-2 border-indigo-100 p-6 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Influencer Commissions</p>
            <p className="text-3xl font-black text-gray-900">₹{paidToInfluencers.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-16 h-16" /></div>
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1 relative z-10">Net Platform Revenue</p>
            <p className="text-3xl font-black relative z-10">₹{platformCommission.toLocaleString()}</p>
          </div>
        </div>

        {/* SECTION 0.2: Promotion Requests & Communications (NEW) */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl"><Megaphone className="text-indigo-600 w-6 h-6" /></div>
            Partner Communications Log
            <span className="text-sm font-normal text-gray-400 ml-2">{promotionRequests?.length || 0} pitche(s) logged</span>
          </h2>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Influencer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pitch Message</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Decision Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Owner Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {promotionRequests?.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{req.influencers?.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{req.influencers?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {req.properties?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 font-medium italic" title={req.proposal_text}>
                        "{req.proposal_text}"
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'accepted' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase tracking-wider">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      ) : req.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-md uppercase tracking-wider">
                          <XCircle className="w-3 h-3" /> Declined
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-md uppercase tracking-wider">
                          <Clock className="w-3 h-3" /> Awaiting Owner
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                      {req.rejection_reason || <span className="opacity-20">—</span>}
                    </td>
                  </tr>
                ))}
                {(!promotionRequests || promotionRequests.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No promotion requests logged in the system yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 0.3: Partner Onboarding & Marketing (Wrapped in Collapsible) */}
        <GrowthHubWrapper stats={{
          totalProperties: approvedProperties?.length || 0,
          pendingProperties: pendingProperties?.length || 0,
          totalInfluencers: influencers?.length || 0,
          activePromotions: promotions?.filter(p => p.bookingsCount > 0).length || 0
        }}>
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
              <CreatePartnerForm />
              <WebsiteQR />
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center h-full min-h-[450px]">
               <div className="absolute -right-16 -bottom-16 opacity-10 rotate-12"><TrendingUp className="w-96 h-96" /></div>
               <h3 className="text-5xl font-black mb-6 relative z-10 leading-[1.1]">Fixy Stays <br/>Command Center</h3>
               <p className="text-blue-100 text-xl mb-10 relative z-10 leading-relaxed font-medium">
                 This is your strategic growth portal. Use these tools to onboard verified partners and deploy marketing assets to scale the Alibag hospitality network.
               </p>
               
               <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-xl border border-white/20 transform hover:scale-105 transition-transform cursor-default">
                    <p className="text-[10px] font-black uppercase text-blue-200 tracking-tighter mb-1">Growth Index</p>
                    <p className="text-3xl font-black">+{((approvedProperties?.length || 0) * 1.5).toFixed(1)}%</p>
                    <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                       <div className="bg-white h-full w-[65%]"></div>
                    </div>
                  </div>
                  <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-xl border border-white/20 transform hover:scale-105 transition-transform cursor-default">
                    <p className="text-[10px] font-black uppercase text-blue-200 tracking-tighter mb-1">Market Reach</p>
                    <p className="text-3xl font-black">{influencers?.length ? (influencers.length * 2400).toLocaleString() : 0}</p>
                    <p className="text-[9px] font-bold text-blue-100 mt-2 italic">Est. Monthly Impressions</p>
                  </div>
               </div>
            </div>
          </div>
        </GrowthHubWrapper>
      </section>

      {/* SECTION 0.5: Payout Queue */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Banknote className="text-green-600" /> Payout Requests
        </h2>
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Amount Requested</th>
                  <th className="px-6 py-3">Bank Details / UPI</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingPayouts.map((req) => (
                  <tr key={req.id}>
                    <td className="px-6 py-4 font-bold text-gray-900">{req.userName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-md font-bold ${req.userType === 'Owner' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {req.userType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-orange-600">₹{Number(req.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{req.bank_details}</td>
                    <td className="px-6 py-4">
                      <PayoutActions requestId={req.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y">
            {pendingPayouts.map((req) => (
              <div key={req.id} className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-900">{req.userName}</div>
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded font-bold uppercase tracking-wider mt-1 ${req.userType === 'Owner' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {req.userType}
                    </span>
                  </div>
                  <div className="text-lg font-black text-orange-600">₹{Number(req.amount).toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-2.5 rounded border border-gray-100 font-mono text-xs text-gray-600 break-all">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Settlement Details</p>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter mr-2 ${req.bank_details.includes('UPI:') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {req.bank_details.includes('UPI:') ? 'UPI' : 'Bank'}
                  </span>
                  {req.bank_details.replace('UPI: ', '').replace('Bank: ', '')}
                </div>
                <div className="pt-2 flex justify-end">
                  <PayoutActions requestId={req.id} />
                </div>
              </div>
            ))}
          </div>

          {pendingPayouts.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">No pending payout requests. All caught up!</div>
          )}
        </div>
      </section>
      
      {/* SECTION 0.7: Inbound Business Leads */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-xl"><Building2 className="text-purple-600 w-6 h-6" /></div>
          Inbound Business Leads
          <span className="text-sm font-normal text-gray-400 ml-2">{inboundLeads?.length || 0} total enquiries</span>
        </h2>
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Owner Name</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Property Map Link</th>
                  <th className="px-6 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inboundLeads?.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{lead.full_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-700">{lead.area}</span>
                        <span className="text-xs text-gray-400 uppercase font-black tracking-tighter">{lead.city}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-blue-600 font-bold">{lead.phone}</td>
                    <td className="px-6 py-4">
                      <a 
                        href={lead.google_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <MapPin className="w-3 h-3" /> View on Map
                      </a>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs text-right whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y">
            {inboundLeads?.map((lead) => (
              <div key={lead.id} className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                   <div className="font-bold text-gray-900">{lead.full_name}</div>
                   <div className="text-xs text-gray-400">{new Date(lead.created_at).toLocaleDateString()}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                   <div>
                      <p className="font-black text-gray-400 uppercase tracking-tighter mb-1">Phone</p>
                      <p className="font-bold text-blue-600">{lead.phone}</p>
                   </div>
                   <div>
                      <p className="font-black text-gray-400 uppercase tracking-tighter mb-1">Location</p>
                      <p className="text-gray-700">{lead.area}, {lead.city}</p>
                   </div>
                </div>
                <a 
                  href={lead.google_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5" /> Open Google Maps
                </a>
              </div>
            ))}
          </div>

          {(!inboundLeads || inboundLeads.length === 0) && (
            <div className="px-6 py-12 text-center text-gray-500">No new inbound leads yet.</div>
          )}
        </div>
      </section>

      {/* SECTION 0.8: Platform Feature Adoption */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
          <div className="p-2 bg-pink-50 rounded-xl"><BarChart3 className="text-pink-600 w-6 h-6" /></div>
          Platform Feature Adoption
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white border p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5"><Users className="w-32 h-32" /></div>
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest mb-2 relative z-10">Owners Using Lead ID Forms</p>
            <div className="flex items-end gap-3 relative z-10">
              <p className="text-5xl font-black text-gray-900">{leadFormOwnersCount}</p>
              <p className="text-sm font-bold text-gray-400 mb-1">Unique Properties</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${leadFormOwnersCount > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <p className="text-xs font-semibold text-gray-500">Active Tracking</p>
            </div>
          </div>
          
          <div className="bg-white border p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5"><CheckCircle className="w-32 h-32" /></div>
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest mb-2 relative z-10">Owners Using Guest ID Forms</p>
            <div className="flex items-end gap-3 relative z-10">
              <p className="text-5xl font-black text-gray-900">{guestFormOwnersCount}</p>
              <p className="text-sm font-bold text-gray-400 mb-1">Unique Properties</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${guestFormOwnersCount > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <p className="text-xs font-semibold text-gray-500">Active Tracking</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: Pending Approvals */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="text-orange-500" /> Pending Property Approvals
        </h2>
        {pendingProperties && pendingProperties.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingProperties.map((prop) => (
              <div key={prop.id} className="border bg-white rounded-lg p-5 shadow-sm flex flex-col gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg leading-tight">{prop.name}</h3>
                    <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                      {prop.uid || 'NO-ID'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{prop.type} • Owner: {prop.owners?.name}</p>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    <p><span className="font-semibold">Amenities:</span> {prop.amenities?.join(', ') || 'None'}</p>
                    <p><span className="font-semibold">Max Price Tier:</span> {prop.rooms?.[0]?.price_bucket || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="mt-auto flex gap-2">
                  <DeletePropertyButton propertyId={prop.id} propertyName={prop.name} className="w-1/3" />
                  <div className="w-2/3">
                    <PropertyApprovalActions propertyId={prop.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed rounded-lg text-center text-gray-500">
            No properties pending approval.
          </div>
        )}
      </section>

      {/* SECTION 1B: Pending Influencers */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="text-orange-500" /> Pending Influencer Approvals
        </h2>
        {pendingInfluencers && pendingInfluencers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {pendingInfluencers.map((inf) => (
              <div key={inf.id} className="border bg-white rounded-lg p-5 shadow-sm flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-lg">{inf.name}</h3>
                  <p className="text-sm text-gray-500">{inf.email}</p>
                </div>
                
                <InfluencerApprovalActions influencerId={inf.id} />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed rounded-lg text-center text-gray-500">
            No influencers pending approval.
          </div>
        )}
      </section>

      {/* SECTION 2: All Properties */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="text-green-500" /> Approved Properties
          <span className="text-sm font-normal text-gray-400 ml-2">{approvedProperties?.length || 0} total</span>
        </h2>
        <AdminPropertiesSearch 
          properties={(approvedProperties || []) as any} 
          influencers={(influencers || []) as any} 
        />
      </section>

      {/* SECTION 3: Influencer Performance Hub */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl"><BarChart3 className="text-blue-600 w-6 h-6" /></div>
          Influencer Performance Center
        </h2>
        <InfluencerPerformanceHub promotions={promotions} />
      </section>

    </div>
  )
}
