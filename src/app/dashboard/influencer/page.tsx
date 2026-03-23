import { createClient } from '@/utils/supabase/server'
import { DollarSign, MousePointerClick, CalendarCheck, Megaphone, Wallet } from 'lucide-react'
import { CopyLinkButton } from './CopyLinkButton'
import WalletSection from '@/components/WalletSection'
import { requestPayout } from '@/app/actions/wallet'

export default async function InfluencerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const influencerId = user?.id

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com'

  // 1. Get properties assigned (all for superadmin)
  let assignQuery = supabase.from('influencer_properties').select('property_id, properties (id, name, type, description)')
  if (!isSuperAdmin) assignQuery = assignQuery.eq('influencer_id', influencerId)
  const { data: assignments } = await assignQuery

  // 2. Get click and booking stats
  let clickQuery = supabase.from('influencer_clicks').select('*')
  if (!isSuperAdmin) clickQuery = clickQuery.eq('influencer_id', influencerId)
  const { data: clicks } = await clickQuery

  let bookingQuery = supabase.from('bookings').select('*')
  if (!isSuperAdmin) bookingQuery = bookingQuery.eq('influencer_id', influencerId)
  const { data: bookings } = await bookingQuery

  let walletQuery = supabase.from('wallet_transactions').select('*')
  if (!isSuperAdmin) walletQuery = walletQuery.eq('user_id', influencerId)
  const { data: transactions } = await walletQuery.order('created_at', { ascending: false })

  let payoutQuery = supabase.from('payout_requests').select('*')
  if (!isSuperAdmin) payoutQuery = payoutQuery.eq('user_id', influencerId)
  const { data: payouts } = await payoutQuery.order('created_at', { ascending: false })

  const properties = assignments?.map((a: any) => a.properties) || []

  // Aggregate global stats
  const totalClicks = clicks?.length || 0
  const totalBookings = bookings?.length || 0
  const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.amount || 0), 0) || 0
  const totalCommission = totalRevenue * 0.10

  // Use production domain for affiliate links
  const appOrigin = 'https://www.fixystays.com'

  return (
    <div className="flex flex-col gap-10">
      
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 min-h-[30vh] pt-16 pb-12 px-6 shadow-init relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white text-center md:text-left drop-shadow-sm min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 whitespace-nowrap overflow-ellipsis">Fixy Stays Influencer Dashboard</h1>
            <p className="text-blue-100/90 text-lg max-w-xl truncate">
              Manage your unique links and track your commissions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border p-6 rounded-xl shadow-sm text-center">
          <MousePointerClick className="w-8 h-8 mx-auto text-blue-500 mb-2" />
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Total Clicks</p>
          <p className="text-3xl font-bold">{totalClicks}</p>
        </div>
        <div className="bg-white border p-6 rounded-xl shadow-sm text-center">
          <CalendarCheck className="w-8 h-8 mx-auto text-orange-500 mb-2" />
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Total Bookings</p>
          <p className="text-3xl font-bold">{totalBookings}</p>
        </div>
        <div className="bg-white border p-6 rounded-xl shadow-sm text-center border-green-100 bg-gradient-to-br from-white to-green-50">
          <DollarSign className="w-8 h-8 mx-auto text-green-500 mb-2" />
          <p className="text-sm font-semibold text-green-800 uppercase tracking-widest">Revenue Driven</p>
          <p className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 text-white border p-6 rounded-xl shadow-sm text-center">
          <Megaphone className="w-8 h-8 mx-auto text-yellow-400 mb-2" />
          <p className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Your Commission</p>
          <p className="text-4xl font-black text-yellow-400 text-shadow-sm">₹{totalCommission.toLocaleString()}</p>
      </div>
      </div>

      <section className="mt-4">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600" /> Virtual Wallet
        </h2>
        <WalletSection 
          transactions={transactions || []} 
          payouts={payouts || []} 
          onRequestPayout={requestPayout.bind(null, influencerId || '')} 
        />
      </section>

      <section className="mt-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          Your Promotional Links
        </h2>
        {properties.length === 0 ? (
          <div className="p-8 border-2 border-dashed bg-white rounded-xl text-center text-gray-500">
            You haven't been assigned any properties yet. Reach out to the admin.
          </div>
        ) : (
          <div className="grid gap-6">
            {properties.map((prop: any) => {
              const link = `${appOrigin}/guest/property/${prop.id}?ref=${influencerId}`
              const propClicks = clicks?.filter(c => c.property_id === prop.id).length || 0
              const propBookings = bookings?.filter(b => b.property_id === prop.id) || []
              const propRev = propBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0)
              
              return (
                <div key={prop.id} className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <span className="text-xs uppercase font-bold text-blue-600 mb-1 block">{prop.type}</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{prop.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{prop.description}</p>
                  </div>
                  
                  <div className="md:w-2/3 flex flex-col gap-4 justify-between border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 text-sm">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-gray-500">Clicks</p>
                        <p className="font-bold text-lg">{propClicks}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Bookings</p>
                        <p className="font-bold text-lg">{propBookings.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Earnings</p>
                        <p className="font-bold text-lg text-green-600">₹{(propRev * 0.10).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="w-full">
                      <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Referral Link</p>
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
