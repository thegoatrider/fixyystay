import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { Button } from '@/components/ui/button'
import { CheckCircle, Users, Wallet, CreditCard, Banknote, MapPin, BarChart3, Building2, Megaphone, XCircle, Clock, TrendingUp, Mail, Zap, Phone } from 'lucide-react'
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
import { CreatePoliceForm } from './CreatePoliceForm'
import WebsiteQR from '@/components/WebsiteQR'
import GrowthHubWrapper from '@/components/GrowthHubWrapper'
import OrganizationsManagement from './OrganizationsManagement'
import SubscriptionCheckButton from './SubscriptionCheckButton'
import PushBroadcastModal from './PushBroadcastModal'
import PlatformGuestHubManager from './PlatformGuestHubManager'
import QuickPurgeTool from './QuickPurgeTool'
import PurgeAccountButton from './PurgeAccountButton'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  // Fetch auth users upfront to retrieve phone numbers from auth metadata if missing in owners/properties
  let authUsersMap = new Map<string, any>()
  let authUsersByEmail = new Map<string, any>()
  let authUsersRes: any = null
  try {
    const res = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    authUsersRes = res.data
    if (authUsersRes?.users) {
      authUsersMap = new Map(authUsersRes.users.map((u: any) => [u.id, u]))
      authUsersRes.users.forEach((u: any) => {
        if (u.email) authUsersByEmail.set(u.email.toLowerCase().trim(), u)
      })
    }
  } catch (err) {
    console.warn('Could not list auth users:', err)
  }



  // 1. Pending Approvals: Fetch all properties with approval_status = 'pending'
  let pendingProperties: any[] = []
  try {
    const { data, error } = await supabaseAdmin
      .from('properties')
      .select(`
        *,
        owners ( id, user_id, name, email, phone ),
        rooms ( id, price_bucket ),
        property_rooms ( id ),
        property_subscriptions ( id, status, end_date, months, monthly_fee, amount, razorpay_payment_id, created_at )
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Pending properties relation fetch error, falling back:', error.message)
      const { data: fallbackData } = await supabaseAdmin
        .from('properties')
        .select('*, owners ( id, user_id, name, email, phone )')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false })
      pendingProperties = fallbackData || []
    } else {
      pendingProperties = data || []
    }
  } catch (e) {
    console.error('Failed to load pending properties:', e)
  }

  // Hydrate missing owners, rooms count, subscriptions, and phone numbers
  const pendingPropIds = pendingProperties.map(p => p.id)
  if (pendingPropIds.length > 0) {
    const [roomsRes, subsRes] = await Promise.all([
      supabaseAdmin
        .from('property_rooms')
        .select('id, property_id')
        .in('property_id', pendingPropIds),
      supabaseAdmin
        .from('property_subscriptions')
        .select('*')
        .in('property_id', pendingPropIds)
        .order('created_at', { ascending: false })
    ])

    const roomCounts = new Map<string, number>()
    ;(roomsRes.data || []).forEach(r => {
      roomCounts.set(r.property_id, (roomCounts.get(r.property_id) || 0) + 1)
    })

    const latestSubs = new Map<string, any>()
    ;(subsRes.data || []).forEach(s => {
      if (!latestSubs.has(s.property_id)) {
        latestSubs.set(s.property_id, s)
      }
    })

    for (const prop of pendingProperties) {
      const physicalCount = roomCounts.get(prop.id) ?? prop.property_rooms?.length ?? 0
      prop.physical_room_count = physicalCount
      prop.latest_subscription = latestSubs.get(prop.id) ?? (Array.isArray(prop.property_subscriptions) ? prop.property_subscriptions[0] : null)

      const owner = Array.isArray(prop.owners) ? prop.owners[0] : prop.owners
      const ownerEmail = (owner?.email || '').toLowerCase().trim()
      const authUser = (owner?.user_id && authUsersMap.get(owner.user_id))
        || (ownerEmail && authUsersByEmail.get(ownerEmail))
        || null

      const phone = prop.helpdesk_number 
        || owner?.phone 
        || authUser?.phone 
        || authUser?.user_metadata?.phone 
        || null

      prop.resolved_phone = phone
      if (owner) owner.phone = phone
    }
  }
  // 1b. Incomplete Onboarding Leads: Fetch draft / unpaid properties that dropped off before paying
  let unpaidDrafts: any[] = []
  try {
    const { data: draftProps } = await supabaseAdmin
      .from('properties')
      .select(`
        id,
        uid,
        name,
        type,
        city,
        state,
        pincode,
        room_count,
        approval_status,
        approved,
        helpdesk_number,
        created_at,
        owner_id,
        owners ( id, user_id, name, email, phone ),
        property_subscriptions ( id, status, end_date ),
        owner_payments ( id, status )
      `)
      .or('approval_status.eq.draft,approved.eq.false')
      .not('approval_status', 'eq', 'approved')
      .order('created_at', { ascending: false })

    if (draftProps) {
      const now = new Date()
      const pendingIds = new Set(pendingProperties.map(p => p.id))

      unpaidDrafts = draftProps.filter(p => {
        if (pendingIds.has(p.id)) return false
        if (p.approved === true || p.approval_status === 'approved') return false

        const subs = Array.isArray(p.property_subscriptions)
          ? p.property_subscriptions
          : (p.property_subscriptions ? [p.property_subscriptions] : [])
        const hasActiveSub = subs.some((s: any) => s.status === 'active' && s.end_date && new Date(s.end_date) > now)
        if (hasActiveSub) return false

        const payments = Array.isArray(p.owner_payments)
          ? p.owner_payments
          : (p.owner_payments ? [p.owner_payments] : [])
        const hasPaid = payments.some((pay: any) => pay.status === 'paid' || pay.status === 'captured')
        if (hasPaid) return false

        return true
      })

      // Resolve contact phone numbers from auth metadata if not in owners/properties
      for (const prop of unpaidDrafts) {
        const owner = Array.isArray(prop.owners) ? prop.owners[0] : prop.owners
        const ownerEmail = (owner?.email || '').toLowerCase().trim()
        const authUser = (owner?.user_id && authUsersMap.get(owner.user_id))
          || (ownerEmail && authUsersByEmail.get(ownerEmail))
          || null

        const phone = prop.helpdesk_number 
          || owner?.phone 
          || authUser?.phone 
          || authUser?.user_metadata?.phone 
          || null

        prop.helpdesk_number = phone
        if (owner) owner.phone = phone
      }
    }
  } catch (err) {
    console.warn('Could not load unpaid drafts:', err)
  }

  // 2. All Approved Properties
  const { data: approvedProperties } = await supabaseAdmin
    .from('properties')
    .select('*, owners(id, name, email, phone)')
    .eq('approved', true)
    .order('created_at', { ascending: false })

  // 3. Influencers (Approved)
  const { data: influencers } = await supabase
    .from('influencers')
    .select('id, name, email, approved, commission_rate, created_at')
    .eq('approved', true)

  // 3b. Pending Influencers
  const { data: pendingInfluencers } = await supabase
    .from('influencers')
    .select('id, name, email, approved, commission_rate, created_at')
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

  const { data: clicks } = await supabase.from('influencer_clicks').select('id, property_id, influencer_id, timestamp')
  const { data: bookings } = await supabase.from('bookings').select('id, property_id, influencer_id, amount, status, created_at')

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
    const { data: wt } = await supabase.from('wallet_transactions').select('id, user_id, amount, transaction_type, created_at')
    walletTransactions = wt || []
    const { data: pr } = await supabase
      .from('payout_requests')
      .select('id, user_id, amount, status, bank_details, created_at')
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
  
  // 5b. Detailed Owner List for Account Management (including properties to retrieve contact/phone numbers)
  const { data: allOwnersDetailed } = await supabaseAdmin
    .from('owners')
    .select('*, owner_subscriptions(plan_name, status, end_date), properties(id, name, helpdesk_number)')
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
  const { data: inboundLeads } = await supabaseAdmin
    .from('property_owner_leads')
    .select('id, full_name, phone, area, city, google_link, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  // 7. Global Influencer Promotion Requests
  const { data: promotionRequests } = await supabase
    .from('influencer_promotion_requests')
    .select(`
      id,
      influencer_id,
      property_id,
      status,
      proposal_text,
      created_at,
      influencers(name, email),
      properties(name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  // 8. Feature Usage Metrics (SQL View Fallback to JS)
  let leadUsageBreakdown: any[] = []
  let checkinUsageBreakdown: any[] = []
  
  try {
    const { data: leadUsage } = await supabase.from('owner_lead_usage').select('owner_id, owner_name, total_leads').order('total_leads', { ascending: false }).limit(50)
    const { data: checkinUsage } = await supabase.from('owner_checkin_usage').select('owner_id, owner_name, total_checkins').order('total_checkins', { ascending: false }).limit(50)
    
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

  // 10. All Payments (Full visibility for admin across property_payments and legacy owner_payments)
  let recentPayments: any[] = []
  try {
    const { data: propPayments, error: propPayErr } = await supabaseAdmin
      .from('property_payments')
      .select(`
        id,
        amount,
        currency,
        status,
        payment_method,
        razorpay_order_id,
        razorpay_payment_id,
        months,
        room_count,
        monthly_fee,
        created_at,
        properties ( id, name, uid ),
        owners ( id, name, email, phone )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!propPayErr && propPayments && propPayments.length > 0) {
      recentPayments = propPayments
    } else {
      // Fallback to legacy owner_payments
      const { data: legacyPayments } = await supabaseAdmin
        .from('owner_payments')
        .select(`
          id,
          amount,
          payment_method,
          payment_ref,
          plan_duration_months,
          created_at,
          owners ( id, name, email, phone )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      recentPayments = (legacyPayments || []).map((lp: any) => ({
        id: lp.id,
        amount: lp.amount,
        currency: 'INR',
        status: 'paid',
        payment_method: lp.payment_method,
        razorpay_payment_id: lp.payment_ref,
        months: lp.plan_duration_months,
        created_at: lp.created_at,
        owners: lp.owners,
        properties: null
      }))
    }
  } catch (err) {
    console.warn('Could not load recent payments:', err)
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

      {/* SECTION: Recent Subscription Payments (Full Transparency) */}
      <section className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
              <CreditCard className="text-green-600 w-5 h-5" /> Recent Subscription Payments
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Live audit trail of all owner onboarding and renewal payments processed via Razorpay or Admin.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full w-fit">
            ● Live Payment Feed ({recentPayments.length})
          </span>
        </div>

        {recentPayments && recentPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Owner / Partner</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Plan / Rooms</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Gateway Ref</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPayments.map((pay: any) => {
                  const owner = Array.isArray(pay.owners) ? pay.owners[0] : pay.owners
                  const property = Array.isArray(pay.properties) ? pay.properties[0] : pay.properties
                  const phone = owner?.phone
                  const cleanPhone = phone ? phone.replace(/\D/g, '') : null

                  return (
                    <tr key={pay.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(pay.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 leading-snug">{owner?.name || 'Owner'}</div>
                        <div className="text-xs text-gray-400 font-mono">{owner?.email}</div>
                        {phone && (
                          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                            <a href={`tel:${phone}`} className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {phone}
                            </a>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {property ? (
                          <div>
                            <span className="font-semibold text-gray-800">{property.name}</span>
                            {property.uid && (
                              <span className="ml-1.5 text-[10px] font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                                {property.uid}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Partner Account</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-bold text-gray-900">{pay.months || 1} Month{pay.months > 1 ? 's' : ''}</span>
                        {pay.room_count ? (
                          <span className="text-gray-500 block text-[11px]">{pay.room_count} units • ₹{pay.monthly_fee}/mo</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-black text-green-700 text-sm">₹{Number(pay.amount).toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">
                        {pay.razorpay_payment_id || pay.razorpay_order_id || 'Admin/Manual'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          pay.status === 'paid' || pay.status === 'captured'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : pay.status === 'failed'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {pay.status || 'paid'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-xl text-sm">
            No payments recorded yet. Payments completed via Razorpay or Admin Onboarding will automatically appear here.
          </div>
        )}
      </section>

      {/* SECTION: GUEST HUB PLATFORM BACK END */}
      <section>
        <PlatformGuestHubManager />
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <CreatePartnerForm />
              <CreateAgentForm />
              <CreatePoliceForm />
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
                    <th className="px-6 py-3">Phone / WhatsApp</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inboundLeads?.map((lead) => {
                    const cleanPhone = (lead.phone || '').replace(/\D/g, '')
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{lead.full_name}</td>
                        <td className="px-6 py-4">
                          {lead.phone ? (
                            <div className="flex items-center gap-2">
                              <a href={`tel:${lead.phone}`} className="text-xs font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                {lead.phone}
                              </a>
                              {cleanPhone && (
                                <a 
                                  href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(lead.full_name)},%20reaching%20out%20from%20FixyStays.`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded hover:bg-green-100 transition-colors inline-flex items-center"
                                >
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-600">{lead.area}</p>
                          <p className="text-[9px] text-gray-400 font-black uppercase">{lead.city}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a href={lead.google_link} target="_blank" className="text-blue-600 font-black text-[10px] uppercase">Map</a>
                        </td>
                      </tr>
                    )
                  })}
                  {(!inboundLeads || inboundLeads.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-gray-400">No leads.</td>
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

      {/* SECTION 1: Pending Approvals (Strictly Paid Properties Only) */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle className="text-orange-500" /> Pending Property Approvals ({pendingProperties.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Verified, paid properties ready for admin review and go-live approval.
            </p>
          </div>
        </div>

        {pendingProperties && pendingProperties.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingProperties.map((prop) => {
              const owner = Array.isArray(prop.owners) ? prop.owners[0] : prop.owners
              const ownerName = owner?.name || 'Unknown'
              const phone = prop.resolved_phone || prop.helpdesk_number || owner?.phone
              const cleanPhone = phone ? phone.replace(/\D/g, '') : null
              const priceBucket = prop.rooms?.[0]?.price_bucket || prop.room_categories?.[0]?.price_bucket || 'N/A'
              const declaredRooms = prop.room_count || 1
              const physicalRooms = prop.physical_room_count || 0
              const hasRoomMismatch = physicalRooms > declaredRooms
              const sub = prop.latest_subscription

              return (
                <div key={prop.id} className="border border-green-200/80 bg-white rounded-xl p-5 shadow-sm flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg leading-tight text-gray-900">{prop.name}</h3>
                        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                          {prop.uid || 'NO-ID'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
                        ✓ Paid & Verified
                      </span>
                    </div>

                    <p className="text-sm text-gray-500">
                      {prop.type} • Owner: <span className="font-semibold text-gray-800">{ownerName}</span>
                    </p>

                    {phone ? (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50/70 border border-blue-100 rounded-lg text-xs">
                        <a href={`tel:${phone}`} className="font-bold text-blue-700 hover:underline flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          {phone}
                        </a>
                        {cleanPhone && (
                          <a 
                            href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(ownerName)},%20reviewing%20your%20FixyStays%20listing%20${encodeURIComponent(prop.name)}.`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 ml-auto"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        ⚠️ No phone number set
                      </div>
                    )}

                    {/* Declared vs Physical Room Count */}
                    <div className="flex items-center justify-between text-xs font-semibold py-1.5 px-2.5 bg-gray-50 rounded-lg border border-gray-200 mt-2">
                      <span>Declared Rooms: <strong className="text-gray-900">{declaredRooms}</strong></span>
                      <span>Physical Rooms: <strong className="text-gray-900">{physicalRooms}</strong></span>
                    </div>
                    {hasRoomMismatch && (
                      <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg mt-1.5 leading-snug">
                        ⚠️ Mismatch: {physicalRooms} physical rooms configured, exceeding {declaredRooms} declared/paid rooms!
                      </div>
                    )}

                    {/* Subscription Snapshot */}
                    {sub && (
                      <div className="mt-2 p-2.5 bg-blue-50/40 border border-blue-100 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-blue-950">Payment Snapshot:</span>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            {sub.months} Mo Plan
                          </span>
                        </div>
                        <div className="text-gray-600 flex justify-between">
                          <span>Fee: ₹{sub.monthly_fee}/mo</span>
                          <span className="font-bold text-gray-900">Total: ₹{sub.amount}</span>
                        </div>
                        {sub.razorpay_payment_id && (
                          <div className="text-[10px] text-gray-500 font-mono truncate">
                            Ref: {sub.razorpay_payment_id}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <p><span className="font-semibold">City:</span> {prop.city || 'Location Pending'}</p>
                      <p><span className="font-semibold">Amenities:</span> {prop.amenities?.join(', ') || 'None'}</p>
                      <p><span className="font-semibold">Max Price Tier:</span> {priceBucket}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-gray-100">
                    <Link 
                      href={`/dashboard/admin/properties/${prop.id}`} 
                      className="flex justify-center items-center w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      Review Details & Images
                    </Link>
                    <div className="flex gap-2">
                      <DeletePropertyButton propertyId={prop.id} propertyName={prop.name} className="w-1/4" />
                      <div className="w-3/4">
                        <PropertyApprovalActions propertyId={prop.id} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed rounded-lg text-center text-gray-500">
            No properties pending approval. All paid onboarding listings have been reviewed.
          </div>
        )}
      </section>

      {/* SECTION 1A: Incomplete Onboarding Leads (Unpaid - Sales Outreach Only) */}
      {unpaidDrafts && unpaidDrafts.length > 0 && (
        <section className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-xl font-bold text-amber-950 flex items-center gap-2">
                <Clock className="text-amber-600 w-5 h-5" /> Incomplete Onboarding Leads ({unpaidDrafts.length})
              </h2>
              <p className="text-xs text-amber-700 mt-0.5">
                These properties were registered during onboarding but the owner dropped off without completing payment. They are <strong>blocked from the approval queue</strong> until paid. Use the Call / WhatsApp buttons to follow up and assist them.
              </p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unpaidDrafts.map((prop) => {
              const owner = Array.isArray(prop.owners) ? prop.owners[0] : prop.owners
              const ownerName = owner?.name || 'Unknown'
              const phone = prop.helpdesk_number || owner?.phone
              const cleanPhone = phone ? phone.replace(/\D/g, '') : null

              return (
                <div key={prop.id} className="border border-amber-200/80 bg-white rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-base leading-tight text-gray-900">{prop.name}</h3>
                      <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        {prop.uid || 'NO-ID'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      {prop.type} • Owner: <span className="font-semibold text-gray-800">{ownerName}</span>
                    </p>

                    {phone ? (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50/70 border border-amber-100 rounded-lg text-xs">
                        <a href={`tel:${phone}`} className="font-bold text-amber-900 hover:underline flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-amber-700" />
                          {phone}
                        </a>
                        {cleanPhone && (
                          <a 
                            href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(ownerName)},%20following%20up%20on%20your%20FixyStays%20registration%20for%20${encodeURIComponent(prop.name)}.%20Do%20you%20need%20any%20help%20completing%20your%20subscription%20payment?`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 ml-auto"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        ⚠️ No phone number set
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[11px]">
                        ❌ Payment Not Completed
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-400 font-medium">Approval Blocked</span>
                    <DeletePropertyButton propertyId={prop.id} propertyName={prop.name} className="h-8 text-xs" />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl"><Users className="text-blue-600 w-6 h-6" /></div>
            Partner Account Management
            <span className="text-sm font-normal text-gray-400 ml-2">{allOwnersDetailed?.length || 0} partners</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <SubscriptionCheckButton />
            <PushBroadcastModal />
          </div>
        </div>
        
        <QuickPurgeTool />

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Partner / Email</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone / WhatsApp</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Joined</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  const now = new Date()
                  return allOwnersDetailed?.map((owner: any) => {
                    const sub = owner.owner_subscriptions?.[0]
                  const isActive = sub?.status === 'active' && new Date(sub.end_date) > now
                  const daysLeft = sub?.end_date ? Math.ceil((new Date(sub.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
                  const isExpiringSoon = isActive && daysLeft <= 7
                  
                  const authUser = owner.user_id ? authUsersMap.get(owner.user_id) : null
                  const propWithPhone = owner.properties?.find((p: any) => p.helpdesk_number)
                  const ownerPhone = owner.phone || authUser?.phone || authUser?.user_metadata?.phone || propWithPhone?.helpdesk_number || null
                  const cleanPhone = ownerPhone ? ownerPhone.replace(/\D/g, '') : null

                  return (
                    <tr key={owner.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{owner.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{owner.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        {ownerPhone ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <a href={`tel:${ownerPhone}`} className="text-xs font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                {ownerPhone}
                              </a>
                              {cleanPhone && (
                                <a 
                                  href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(owner.name)},%20reaching%20out%20from%20FixyStays.`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded hover:bg-green-100 transition-colors inline-flex items-center"
                                >
                                  WhatsApp
                                </a>
                              )}
                            </div>
                            {propWithPhone && (
                              <span className="text-[10px] text-gray-400 truncate max-w-[200px]" title={`Property: ${propWithPhone.name}`}>
                                Prop: {propWithPhone.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No phone set</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isActive ? (
                          <div className="flex flex-col gap-1">
                             <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase tracking-wider w-fit">
                               <Zap className="w-3 h-3 fill-current" /> {sub.plan_name}
                             </span>
                             <span className="text-[9px] text-gray-400">Exp: {new Date(sub.end_date).toLocaleDateString()}</span>
                             {isExpiringSoon && (
                               <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider w-fit">
                                 ⚠️ Expiring in {daysLeft}d
                               </span>
                             )}
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
                      <td className="px-6 py-4 text-right">
                        <PurgeAccountButton email={owner.email} ownerName={owner.name} />
                      </td>
                    </tr>
                  )
                })
              })()}
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
