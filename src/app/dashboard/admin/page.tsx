import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { approveProperty, assignInfluencer, assignInfluencerFromForm, approveInfluencer, rejectInfluencer, processPayout } from './actions'
import { CheckCircle, Users, Wallet, CreditCard, Banknote } from 'lucide-react'
import Link from 'next/link'
import DeletePropertyButton from './DeletePropertyButton'
import FeaturedToggle from './FeaturedToggle'
import AdminPropertiesSearch from './AdminPropertiesSearch'

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
  // We will need a complex query to get clicks, bookings, revenue, commission.
  // For now, let's fetch basic mappings and calculate.
  const { data: promotionData } = await supabase
    .from('influencer_properties')
    .select(`
      id,
      property_id,
      influencer_id,
      properties(name),
      influencers(name)
    `)

  const { data: clicks } = await supabase.from('influencer_clicks').select('*')
  const { data: bookings } = await supabase.from('bookings').select('*')

  const promotions = promotionData?.map(promo => {
    const promoClicks = clicks?.filter(c => c.property_id === promo.property_id && c.influencer_id === promo.influencer_id).length || 0
    const promoBookings = bookings?.filter(b => b.property_id === promo.property_id && b.influencer_id === promo.influencer_id) || []
    const totalRevenue = promoBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0)
    const commission = totalRevenue * 0.10 // 10% commission rule

    return {
      ...promo,
      clicks: promoClicks,
      bookingsCount: promoBookings.length,
      revenue: totalRevenue,
      commission
    }
  }) || []

  // 5. Global Wallet Stats — guarded in case wallet_migrations.sql hasn't been run yet
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
    console.warn('Wallet tables not found. Run supabase/wallet_migrations.sql to enable wallet features.')
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
                    <div className="flex justify-end gap-2">
                      <form action={processPayout.bind(null, req.id, 'reject')}>
                        <Button type="submit" variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">Reject</Button>
                      </form>
                      <form action={processPayout.bind(null, req.id, 'approve')}>
                        <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white">Mark Paid</Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingPayouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No pending payout requests. All caught up!</td>
                </tr>
              )}
            </tbody>
          </table>
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
                  <h3 className="font-semibold text-lg">{prop.name}</h3>
                  <p className="text-sm text-gray-500">{prop.type} • Owner: {prop.owners?.name}</p>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    <p><span className="font-semibold">Amenities:</span> {prop.amenities?.join(', ') || 'None'}</p>
                    <p><span className="font-semibold">Max Price Tier:</span> {prop.rooms?.[0]?.price_bucket || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="mt-auto flex gap-2">
                  <DeletePropertyButton propertyId={prop.id} propertyName={prop.name} className="w-1/3" />
                  <form action={approveProperty.bind(null, prop.id)} className="w-2/3">
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
                      Approve
                    </Button>
                  </form>
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
                
                <div className="mt-auto flex flex-col gap-2">
                  <form action={approveInfluencer} className="flex gap-2">
                    <input type="hidden" name="influencerId" value={inf.id} />
                    <div className="flex flex-col gap-1 w-1/3">
                      <label className="text-[10px] uppercase text-gray-500 font-bold">Comm. %</label>
                      <input type="number" name="commissionRate" required min="0" max="100" step="0.5" defaultValue="5" className="border rounded px-2 py-1.5 focus:ring-blue-500 outline-none text-sm w-full font-bold" />
                    </div>
                    <Button type="submit" size="sm" className="w-2/3 bg-green-600 hover:bg-green-700 text-white mt-auto h-8">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectInfluencer.bind(null, inf.id)}>
                    <Button type="submit" variant="destructive" size="sm" className="w-full h-8">
                      Reject
                    </Button>
                  </form>
                </div>
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
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Property</th>
                <th className="px-6 py-3">Influencer</th>
                <th className="px-6 py-3 text-right">Clicks</th>
                <th className="px-6 py-3 text-right">Bookings</th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-right">Commission (10%)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {promotions.map((promo) => {
                // Supabase joins with to-one relationships return an object or array. We need to safely extract name.
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
              {promotions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No influencers assigned to properties yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      
    </div>
  )
}
