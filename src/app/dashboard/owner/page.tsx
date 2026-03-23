import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import CreatePropertyForm from './CreatePropertyForm'
import LeadsSection from './LeadsSection'
import GuestList from './GuestList'
import QuickCheckin from './QuickCheckin'
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

  // Fetch Wallet Transactions
  let walletQuery = supabase.from('wallet_transactions').select('*')
  if (!isSuperAdmin) walletQuery = walletQuery.eq('user_id', owner?.id)
  const { data: transactions } = await walletQuery.order('created_at', { ascending: false })

  // Fetch Payout Requests
  let payoutQuery = supabase.from('payout_requests').select('*')
  if (!isSuperAdmin) payoutQuery = payoutQuery.eq('user_id', owner?.id)
  const { data: payouts } = await payoutQuery.order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Owner Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage listings and track incoming enquiries.</p>
        </div>
      </div>

      {/* Tabs Design */}
      <div className="flex border-b border-gray-200 w-full mb-2">
        <Link 
          href="/dashboard/owner?tab=properties"
          className={`px-8 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'properties' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <List className="w-4 h-4" /> Properties
        </Link>
        <Link 
          href="/dashboard/owner?tab=leads"
          className={`px-8 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'leads' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Leads
          {leads && leads.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{leads.length}</span>}
        </Link>
        <Link 
          href="/dashboard/owner?tab=guests"
          className={`px-8 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'guests' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" /> Guests
          {checkins && checkins.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{checkins.length}</span>}
        </Link>
        <Link 
          href="/dashboard/owner?tab=wallet"
          className={`px-8 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'wallet' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Wallet className="w-4 h-4" /> Wallet
        </Link>
      </div>

      {activeTab === 'wallet' ? (
        <WalletSection 
          transactions={transactions || []} 
          payouts={payouts || []} 
          onRequestPayout={requestPayout.bind(null, owner?.id || '')} 
        />
      ) : activeTab === 'properties' ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 md:gap-8 items-start">
          
          {/* Quick Checkin (A) - Mobile Top, Desktop Right Top */}
          <div className="order-1 md:order-none md:col-start-2 md:sticky md:top-24 z-10 w-full max-w-full">
            <QuickCheckin properties={properties || []} />
          </div>

          {/* Properties List (C) - Mobile Middle, Desktop Left (spans all rows) */}
          <div className="flex flex-col gap-4 order-2 md:order-none md:col-start-1 md:row-span-2">
            {properties?.map(prop => (
              <div 
                key={prop.id} 
                className="bg-white border rounded-lg p-4 md:p-6 hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
              >
                <div className="flex items-start gap-4 w-full md:w-auto overflow-hidden">
                  <div className="bg-blue-100 text-blue-600 rounded-md overflow-hidden flex-shrink-0 relative w-16 h-16 md:w-20 md:h-20">
                    {prop.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prop.image_url} alt={prop.name} className="object-cover w-full h-full" />
                    ) : (
                      <div className="flex w-full h-full items-center justify-center">
                        <Home className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg md:text-xl font-bold group-hover:text-blue-600 transition truncate">{prop.name}</h2>
                    <p className="text-xs md:text-sm text-gray-500 capitalize truncate">{prop.type} • {prop.rooms[0]?.count || 0} Rooms</p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] md:text-xs font-medium">
                      {prop.approved ? (
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Approved</span>
                      ) : (
                        <span className="text-orange-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex w-full md:w-auto items-center gap-2 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-gray-100">
                  <Link href={`/dashboard/owner/property/${prop.id}/edit`} className="flex-1 md:flex-none">
                    <Button variant="outline" className="w-full">Edit</Button>
                  </Link>
                  <Link href={`/dashboard/owner/property/${prop.id}`} className="flex-1 md:flex-none">
                    <Button variant="default" className="w-full">Manage</Button>
                  </Link>
                </div>
              </div>
            ))}
            {(!properties || properties.length === 0) && (
              <div className="text-center p-12 border-2 border-dashed rounded-lg text-gray-500">
                <Home className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p>You haven't added any properties yet.</p>
              </div>
            )}
          </div>

          {/* Create Property Form (B) - Mobile Bottom, Desktop Right Bottom */}
          <div className="bg-white border rounded-lg p-6 shadow-sm order-3 md:order-none md:col-start-2">
            <h3 className="font-bold text-lg mb-4 flex gap-2 items-center"><Plus className="w-5 h-5"/> Add New Property</h3>
            <CreatePropertyForm />
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
