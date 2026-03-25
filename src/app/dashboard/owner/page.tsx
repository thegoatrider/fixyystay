import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import CreatePropertyForm from './CreatePropertyForm'
import LeadsSection from './LeadsSection'
import GuestList from './GuestList'
import QuickCheckin from './QuickCheckin'
import AddLeadTile from './AddLeadTile'
import { CollapsibleTile } from '@/components/CollapsibleTile'
import { Home, Plus, Clock, CheckCircle, List, MessageSquare, Zap, Users, Wallet } from 'lucide-react'
import WalletSection from '@/components/WalletSection'
import { requestPayout } from '@/app/actions/wallet'

export default async function OwnerDashboard(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams
  const activeTab = searchParams.tab || 'properties'
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com'
  const { data: owner } = await supabase.from('owners').select('id').eq('user_id', user?.id).single()
  
  // Fetch properties (re-used for the dropdown in LeadsSection too)
  let propQuery = supabase.from('properties').select('*, rooms(count)')
  if (!isSuperAdmin) propQuery = propQuery.eq('owner_id', owner?.id)
  const { data: properties } = await propQuery.order('created_at', { ascending: false })

  // Fetch leads with property names
  let leadQuery = supabase.from('leads').select('*, properties(name)')
  if (!isSuperAdmin) leadQuery = leadQuery.eq('owner_id', owner?.id)
  const { data: leads } = await leadQuery.order('created_at', { ascending: false })

  // Fetch guest check-ins with property names for the Guests tab
  let checkinQuery = supabase.from('guest_checkins').select('*, properties(name)')
  if (!isSuperAdmin) checkinQuery = checkinQuery.eq('owner_id', owner?.id)
  const { data: checkins } = await checkinQuery.order('created_at', { ascending: false })

  // Fetch Wallet Transactions — guarded in case wallet_migrations.sql hasn't been run yet
  let transactions: any[] = []
  let payouts: any[] = []
  try {
    let walletQuery = supabase.from('wallet_transactions').select('*')
    if (!isSuperAdmin && owner?.id) walletQuery = walletQuery.eq('user_id', owner.id)
    const { data: walletData, error: walletError } = await walletQuery.order('created_at', { ascending: false })
    if (!walletError) transactions = walletData || []

    let payoutQuery = supabase.from('payout_requests').select('*')
    if (!isSuperAdmin && owner?.id) payoutQuery = payoutQuery.eq('user_id', owner.id)
    const { data: payoutData, error: payoutError } = await payoutQuery.order('created_at', { ascending: false })
    if (!payoutError) payouts = payoutData || []
  } catch (e) {
    // wallet_migrations.sql not yet run — tables don't exist, show empty wallet
    console.warn('Wallet tables not found. Run supabase/wallet_migrations.sql to enable wallet features.')
  }

  return (
    <div className="flex flex-col gap-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Owner Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage listings and track incoming enquiries.</p>
        </div>
      </div>

      {/* Tabs Design */}
      <div className="flex border-b border-gray-100 w-full mb-2 overflow-x-auto no-scrollbar scroll-smooth">
        <Link 
          href="/dashboard/owner?tab=properties"
          className={`flex-none md:flex-1 min-w-[100px] justify-center px-4 md:px-8 py-3.5 font-bold text-[11px] sm:text-sm transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 ${
            activeTab === 'properties' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/30' 
              : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          <List className="w-4 h-4 md:w-5 md:h-5" /> 
          <span>Properties</span>
        </Link>
        <Link 
          href="/dashboard/owner?tab=leads"
          className={`flex-none md:flex-1 min-w-[90px] justify-center px-4 md:px-8 py-3.5 font-bold text-[11px] sm:text-sm transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 ${
            activeTab === 'leads' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/30' 
              : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-4 h-4 md:w-5 md:h-5" /> 
          <span className="flex items-center">
            Leads
            {leads && leads.length > 0 && <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1 font-black">{leads.length}</span>}
          </span>
        </Link>
        <Link 
          href="/dashboard/owner?tab=guests"
          className={`flex-none md:flex-1 min-w-[95px] justify-center px-4 md:px-8 py-3.5 font-bold text-[11px] sm:text-sm transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 ${
            activeTab === 'guests' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/30' 
              : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4 md:w-5 md:h-5" /> 
          <span className="flex items-center">
            Guests
            {checkins && checkins.length > 0 && <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1 font-black">{checkins.length}</span>}
          </span>
        </Link>
        <Link 
          href="/dashboard/owner?tab=wallet"
          className={`flex-none md:flex-1 min-w-[90px] justify-center px-4 md:px-8 py-3.5 font-bold text-[11px] sm:text-sm transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 ${
            activeTab === 'wallet' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/30' 
              : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Wallet className="w-4 h-4 md:w-5 md:h-5" /> 
          <span>Wallet</span>
        </Link>
      </div>

      {activeTab === 'wallet' ? (
        <WalletSection 
          transactions={transactions || []} 
          payouts={payouts || []} 
          onRequestPayout={requestPayout.bind(null, owner?.id || '')} 
        />
      ) : activeTab === 'properties' ? (
        <div className="flex flex-col gap-6 items-start w-full">
          
          {/* Action Tiles (Top) */}
          <div className="flex flex-col w-full gap-2 lg:bg-white lg:border lg:p-4 lg:shadow-sm lg:rounded-xl">
            <AddLeadTile ownerId={owner?.id} properties={properties || []} />
            <QuickCheckin properties={properties || []} />
            <CollapsibleTile title="Add New Property">
              <CreatePropertyForm />
            </CollapsibleTile>
          </div>

          {/* Properties List (Bottom) */}
          <div className="flex flex-col gap-4 w-full">
            <h2 className="text-xl font-bold mt-4 lg:mt-2 px-1">Your Properties Database</h2>
            
            {properties && properties.length > 0 ? properties.map(prop => (
              <div 
                key={prop.id} 
                className="bg-white border rounded-xl p-3 sm:p-5 hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 group w-full"
              >
                <div className="flex items-start gap-3 sm:gap-4 w-full md:w-auto overflow-hidden">
                  <div className="bg-blue-100 text-blue-600 rounded-lg overflow-hidden flex-shrink-0 relative w-14 h-14 sm:w-20 sm:h-20">
                    {prop.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prop.image_url} alt={prop.name} className="object-cover w-full h-full" />
                    ) : (
                      <div className="flex w-full h-full items-center justify-center">
                        <Home className="w-5 h-5 sm:w-8 sm:h-8" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-xl font-bold group-hover:text-blue-600 transition truncate">{prop.name}</h2>
                      <span className="text-[10px] sm:text-xs font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                        {prop.uid || 'NO-ID'}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-sm text-gray-400 capitalize truncate font-medium">{prop.type} • {prop.rooms[0]?.count || 0} Rooms</p>
                    <div className="flex items-center gap-1 mt-1 sm:mt-2 text-[9px] sm:text-xs font-bold uppercase tracking-wider">
                      {prop.approved ? (
                        <span className="text-green-600 flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded"><CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> Approved</span>
                      ) : (
                        <span className="text-orange-500 flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded"><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> Pending</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex w-full md:w-auto items-center gap-2 pt-2 md:pt-0 border-t md:border-0 border-gray-50">
                  <Link href={`/dashboard/owner/property/${prop.id}/edit`} className="flex-1 md:flex-none">
                    <Button variant="outline" size="sm" className="w-full h-9 sm:h-10 font-bold border-gray-200">Edit</Button>
                  </Link>
                  <Link href={`/dashboard/owner/property/${prop.id}`} className="flex-1 md:flex-none">
                    <Button variant="default" size="sm" className="w-full h-9 sm:h-10 font-bold shadow-md">Manage</Button>
                  </Link>
                </div>
              </div>
            )) : (
              <div className="text-center p-12 border-2 border-dashed bg-white rounded-lg text-gray-500 w-full">
                <Home className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p>You haven't added any properties yet.</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'leads' ? (
        <LeadsSection 
          ownerId={owner?.id} 
          properties={properties || []} 
          initialLeads={leads as any || []} 
        />
      ) : (
        <GuestList checkins={checkins as any || []} />
      )}
    </div>
  )
}
