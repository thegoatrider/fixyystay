import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { CheckCircle, Users, Wallet, CreditCard, Banknote, MapPin, BarChart3, Building2, Megaphone, XCircle, Clock, TrendingUp, Mail, Zap } from 'lucide-react'
import Link from 'next/link'
import DeletePropertyButton from './DeletePropertyButton'
import FeaturedToggle from './FeaturedToggle'
import AdminPropertiesSearch from './AdminPropertiesSearch'
import PayoutActions from './PayoutActions'
import PropertyApprovalActions from './PropertyApprovalActions'
import InfluencerApprovalActions from './InfluencerApprovalActions'
import InfluencerPerformanceHub from './InfluencerPerformanceHub'
import { CreatePartnerForm } from './CreatePartnerForm'
import { CreateAgentForm } from './CreateAgentForm'
import WebsiteQR from '@/components/WebsiteQR'
import GrowthHubWrapper from '@/components/GrowthHubWrapper'
import FreeTierToggle from './FreeTierToggle'
import OrganizationsManagement from './OrganizationsManagement'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // 1. Pending Approvals (excluding onboarding placeholder properties that are not fully edited)
  const { data: pendingProperties } = await supabase
    .from('properties')
    .select('*, owners(name), rooms(price_bucket)')
    .eq('approved', false)
    .neq('city', 'Pending')
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
  
  // 5b. Detailed Owner List for Account Management
  const { data: allOwnersDetailed } = await supabase
    .from('owners')
    .select('*, owner_subscriptions(plan_name, status, end_date)')
    .order('created_at', { ascending: false })
  
  const pendingPayouts = pendingPayoutsRaw?.map(req => {
    const isInf = influencers?.find(i => i.id === req.user_id)
    const isOwner = allOwnersDetailed?.find(o => o.id === req.user_id)
    
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
  let leadUsageBreakdown: any[] = []
  let checkinUsageBreakdown: any[] = []
  
  try {
    const { data: leadUsage } = await supabase.from('owner_lead_usage').select('*').order('total_leads', { ascending: false })
    const { data: checkinUsage } = await supabase.from('owner_checkin_usage').select('*').order('total_checkins', { ascending: false })
    
    leadUsageBreakdown = leadUsage || []
    checkinUsageBreakdown = checkinUsage || []
  } catch (e) {
    console.warn('Detailed usage views missing, falling back to basic fetching.')
  }

  // Basic counts for top-level cards (actual users vs total)
  const leadFormOwnersCount = leadUsageBreakdown.filter(i => i.total_leads > 0).length
  const guestFormOwnersCount = checkinUsageBreakdown.filter(i => i.total_checkins > 0).length

  // 9. Organizations (White-Label)
  let organizations: any[] = []
  try {
    const { data: orgs } = await supabase.from('organizations').select('*, properties(id, name)').order('created_at', { ascending: false })
    organizations = orgs || []
  } catch (e) {
    console.warn('Organizations table not found.')
  }

  return (
    <div className="flex flex-col gap-10">

      {/* SECTION 0: Global Ledger */}
      <section>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border p-6 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Booking Value</p>
            <p className="text-3xl font-bold text-gray-900">₹{totalRevenueGenerated.toLocaleString()}</p>
          </div>
          <div className="bg-white border p-6 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Owner Payouts (80%)</p>
            <p className="text-3xl font-black text-gray-900">₹{paidToOwners.toLocaleString()}</p>
          </div>
          <div className="bg-white border p-6 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Agent Commissions</p>
            <p className="text-3xl font-black text-gray-900">₹{paidToInfluencers.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-16 h-16" /></div>
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1 relative z-10">Net Platform Revenue</p>
            <p className="text-3xl font-black relative z-10">₹{platformCommission.toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* HORIZONTAL GRID: Growth & Communications */}
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left 2/3: Communications & Marketing Hub */}
        <div className="lg:col-span-2 space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl"><Megaphone className="text-indigo-600 w-6 h-6" /></div>
              Communications Log
              <span className="text-sm font-normal text-gray-400 ml-2">{promotionRequests?.length || 0} pitche(s)</span>
            </h2>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Influencer</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {promotionRequests?.slice(0, 5).map((req: any) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{req.influencers?.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{req.influencers?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-black uppercase text-indigo-600">
                            {req.properties?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {req.status === 'accepted' ? (
                            <span className="text-[10px] font-black text-green-600 uppercase">Approved</span>
                          ) : (
                            <span className="text-[10px] font-black text-orange-500 uppercase">{req.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!promotionRequests || promotionRequests.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400">No recent requests.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <GrowthHubWrapper stats={{
            totalProperties: approvedProperties?.length || 0,
            pendingProperties: pendingProperties?.length || 0,
            totalInfluencers: influencers?.length || 0,
            activePromotions: promotions?.filter(p => p.bookingsCount > 0).length || 0
          }}>
            <div className="grid sm:grid-cols-2 gap-6">
              <CreatePartnerForm />
              <CreateAgentForm />
            </div>
          </GrowthHubWrapper>
        </div>

        {/* Right 1/3: Command Center & QR */}
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
             <div className="absolute -right-12 -bottom-12 opacity-10 rotate-12"><TrendingUp className="w-64 h-64" /></div>
             <div>
                <h3 className="text-4xl font-black mb-4 relative z-10 leading-tight">Command <br/>Center</h3>
                <p className="text-blue-100 text-sm relative z-10 leading-relaxed font-medium">
                  Strategic growth portal for the Alibag hospitality network.
                </p>
             </div>
             
             <div className="space-y-4 relative z-10">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                  <p className="text-[9px] font-black uppercase text-blue-200 tracking-wider mb-1">Growth Index</p>
                  <p className="text-2xl font-black">+{((approvedProperties?.length || 0) * 1.5).toFixed(1)}%</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                  <p className="text-[9px] font-black uppercase text-blue-200 tracking-wider mb-1">Market Reach</p>
                  <p className="text-2xl font-black">{influencers?.length ? (influencers.length * 2400).toLocaleString() : 0}</p>
                </div>
             </div>
          </div>
          <WebsiteQR />
        </div>
      </div>

      {/* HORIZONTAL GRID: Payouts & Leads */}
      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Banknote className="text-green-600" /> Payout Queue
          </h2>
          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingPayouts.map((req) => (
                    <tr key={req.id}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{req.userName}</p>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{req.userType}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-orange-600">₹{Number(req.amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <PayoutActions requestId={req.id} />
                      </td>
                    </tr>
                  ))}
                  {pendingPayouts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center text-gray-400">All caught up!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-xl"><Building2 className="text-purple-600 w-6 h-6" /></div>
            Business Leads
          </h2>
          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Lead</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inboundLeads?.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{lead.full_name}</td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-600">{lead.area}</p>
                        <p className="text-[9px] text-gray-400 font-black uppercase">{lead.city}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a href={lead.google_link} target="_blank" className="text-blue-600 font-black text-[10px] uppercase">Map</a>
                      </td>
                    </tr>
                  ))}
                  {(!inboundLeads || inboundLeads.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center text-gray-400">No leads.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* SECTION 0.8: Platform Feature Adoption */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
          <div className="p-2 bg-pink-50 rounded-xl"><BarChart3 className="text-pink-600 w-6 h-6" /></div>
          Platform Feature Adoption
          <span className="text-sm font-normal text-gray-400 ml-2">Real-time owner engagement</span>
        </h2>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Lead ID Form Usage */}
          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Users className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Lead ID Form Adoption</h3>
                  <p className="text-xs text-gray-500">{leadFormOwnersCount} unique owners active</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-indigo-600">
                  {leadUsageBreakdown.reduce((sum, item) => sum + Number(item.total_leads), 0)}
                </p>
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-tighter">Total Leads</p>
              </div>
            </div>
            
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/30 text-[10px] font-black uppercase text-gray-400 tracking-widest sticky top-0 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3">Owner</th>
                    <th className="px-6 py-3 text-center">Volume</th>
                    <th className="px-6 py-3 text-right">Last Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leadUsageBreakdown.map((item) => (
                    <tr key={item.owner_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{item.owner_name}</span>
                          <span className="text-[10px] text-blue-600 font-medium select-all">{item.owner_email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.total_leads > 0 ? (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md font-black text-xs">
                            {item.total_leads}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Never Used</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-gray-400">
                        {item.last_activity ? new Date(item.last_activity).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Guest ID Form Usage */}
          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600"><CheckCircle className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Guest ID Form Adoption</h3>
                  <p className="text-xs text-gray-500">{guestFormOwnersCount} of {checkinUsageBreakdown.length} owners active</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-green-600">
                  {checkinUsageBreakdown.reduce((sum, item) => sum + Number(item.total_checkins), 0)}
                </p>
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-tighter">Total Check-ins</p>
              </div>
            </div>
            
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/30 text-[10px] font-black uppercase text-gray-400 tracking-widest sticky top-0 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3">Owner</th>
                    <th className="px-6 py-3 text-center">Volume</th>
                    <th className="px-6 py-3 text-right">Last Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {checkinUsageBreakdown.map((item) => (
                    <tr key={item.owner_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{item.owner_name}</span>
                          <span className="text-[10px] text-green-600 font-medium select-all">{item.owner_email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.total_checkins > 0 ? (
                          <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md font-black text-xs">
                            {item.total_checkins}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Never Used</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-gray-400">
                        {item.last_activity ? new Date(item.last_activity).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                
                <div className="mt-auto flex flex-col gap-2">
                  <Link 
                    href={`/dashboard/admin/properties/${prop.id}`} 
                    className="flex justify-center items-center w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                  >
                    Review Details & Images
                  </Link>
                  <div className="flex gap-2">
                    <DeletePropertyButton propertyId={prop.id} propertyName={prop.name} className="w-1/3" />
                    <div className="w-2/3">
                      <PropertyApprovalActions propertyId={prop.id} />
                    </div>
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

      {/* SECTION 4: Partner Management (FREE TIER CONTROL) */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl"><Users className="text-blue-600 w-6 h-6" /></div>
          Partner Account Management
          <span className="text-sm font-normal text-gray-400 ml-2">{allOwnersDetailed?.length || 0} partners</span>
        </h2>
        
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Partner / Email</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allOwnersDetailed?.map((owner: any) => {
                  const sub = owner.owner_subscriptions?.[0]
                  const isActive = sub?.status === 'active' && new Date(sub.end_date) > new Date()
                  
                  return (
                    <tr key={owner.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{owner.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{owner.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        {isActive ? (
                          <div className="flex flex-col">
                             <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase tracking-wider w-fit">
                               <Zap className="w-3 h-3 fill-current" /> {sub.plan_name}
                             </span>
                             <span className="text-[9px] text-gray-400 mt-1">Exp: {new Date(sub.end_date).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase tracking-wider">
                             No Active Plan
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400 text-xs font-medium">
                        {new Date(owner.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 5: White-Label Organizations */}
      <section>
        <OrganizationsManagement organizations={organizations} />
      </section>

    </div>
  )
}
