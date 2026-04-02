import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { CheckCircle, Users, Wallet, CreditCard, Banknote, MapPin } from 'lucide-react'
import Link from 'next/link'
import DeletePropertyButton from './DeletePropertyButton'
import FeaturedToggle from './FeaturedToggle'
import AdminPropertiesSearch from './AdminPropertiesSearch'
import PayoutActions from './PayoutActions'
import PropertyApprovalActions from './PropertyApprovalActions'
import InfluencerApprovalActions from './InfluencerApprovalActions'
import { assignInfluencerFromForm } from './actions'

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
          <div className="bg-white border p-6 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">Owner Earnings (80%)</p>
            <p className="text-3xl font-bold text-gray-900">₹{paidToOwners.toLocaleString()}</p>
          </div>
          <div className="bg-white border p-6 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">Influencer Earnings</p>
            <p className="text-3xl font-bold text-gray-900">₹{paidToInfluencers.toLocaleString()}</p>
          </div>
          <div className="bg-blue-600 border border-blue-600 p-6 rounded-xl shadow-md text-white">
            <p className="text-sm font-semibold text-blue-200 uppercase tracking-widest mb-1">Net Platform Revenue</p>
            <p className="text-3xl font-black">₹{platformCommission.toLocaleString()}</p>
          </div>
        </div>
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Bank / UPI</p>
                  {req.bank_details}
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
          assignInfluencerAction={assignInfluencerFromForm}
        />
      </section>

      {/* SECTION 3: Influencer Promotion Properties */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users className="text-blue-500" /> Influencer Promotion Properties
        </h2>
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Property</th>
                  <th className="px-6 py-3">Influencer</th>
                  <th className="px-6 py-3 text-right">Clicks</th>
                  <th className="px-6 py-3 text-right">Bookings</th>
                  <th className="px-6 py-3 text-right">Revenue</th>
                  <th className="px-6 py-3 text-right">Commission Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {promotions.map((promo) => {
                  const propVal = promo.properties as any;
                  const infVal = promo.influencers as any;

                  const propName = propVal && !Array.isArray(propVal) ? propVal.name : 'Unknown Property';
                  const infName = infVal && !Array.isArray(infVal) ? infVal.name : 'Unknown Influencer';
                  
                  return (
                    <tr key={promo.id}>
                      <td className="px-6 py-4 font-medium">{propName}</td>
                      <td className="px-6 py-4">{infName}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{promo.clicks}</td>
                      <td className="px-6 py-4 text-right font-medium">{promo.bookingsCount}</td>
                      <td className="px-6 py-4 text-right text-gray-600">₹{promo.revenue.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-bold text-green-600">₹{promo.commission.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y">
            {promotions.map((promo) => {
              const propVal = promo.properties as any;
              const infVal = promo.influencers as any;

              const propName = propVal && !Array.isArray(propVal) ? propVal.name : 'Unknown Property';
              const infName = infVal && !Array.isArray(infVal) ? infVal.name : 'Unknown Influencer';
              
              return (
                <div key={promo.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate">{propName}</div>
                      <div className="text-xs text-gray-500 truncate">by {infName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-green-600 uppercase tracking-tighter">Commission</div>
                      <div className="text-base font-black text-green-700">₹{promo.commission.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-center">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Clicks</p>
                      <p className="text-sm font-bold text-gray-700">{promo.clicks}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Bookings</p>
                      <p className="text-sm font-bold text-gray-700">{promo.bookingsCount}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Revenue</p>
                      <p className="text-sm font-bold text-gray-700">₹{promo.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {promotions.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">No influencers assigned to properties yet.</div>
          )}
        </div>
      </section>

    </div>
  )
}
