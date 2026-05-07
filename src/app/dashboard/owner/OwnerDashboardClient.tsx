'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Home, List, MessageSquare, Users, Wallet, User, Zap, Megaphone } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { PropertyCard } from '@/components/PropertyCard'
import { CollapsibleTile } from '@/components/CollapsibleTile'
import WalletSection from '@/components/WalletSection'
import CreatePropertyForm from './CreatePropertyForm'
import AddLeadTile from './AddLeadTile'
import QuickCheckin from './QuickCheckin'
import { requestPayout } from '@/app/actions/wallet'
import React, { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

// Lazy load heavy tab sections
const LeadsSection = dynamic(() => import('./LeadsSection'), { loading: () => <DashboardSkeleton /> })
const GuestList = dynamic(() => import('./GuestList'), { loading: () => <DashboardSkeleton /> })
const InfluencerRequestsInbox = dynamic(() => import('./InfluencerRequestsInbox'), { loading: () => <DashboardSkeleton /> })

export default function OwnerDashboardClient({ 
  userId, 
  email,
  ownerId, 
  isSuperAdmin 
}: { 
  userId: string; 
  email: string;
  ownerId: string; 
  isSuperAdmin: boolean; 
}) {
  console.log('OwnerDashboardClient Rendered:', { userId, email, ownerId, isSuperAdmin })
  
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'properties'
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useDashboardData(ownerId, isSuperAdmin)

  // Use useMemo for trial calculation to avoid redundant calculations
  const { isTrial, isFreeTier, isPaid } = useMemo(() => {
    if (!data) return { isTrial: false, isFreeTier: false, isPaid: false }
    
    const { subscription, owner } = data as any
    const isPaid = subscription?.status === 'active' && new Date(subscription.end_date) > new Date()
    
    // 7-day Trial Logic from Owner Creation Date
    const ownerCreatedAt = owner?.created_at ? new Date(owner.created_at) : null
    const trialEndDate = ownerCreatedAt ? new Date(ownerCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null
    const isTrial = !isPaid && trialEndDate ? trialEndDate > new Date() : false
    const isExpired = !isPaid && trialEndDate ? trialEndDate <= new Date() : false
    
    return { isTrial, isFreeTier: isExpired, isPaid }
  }, [data])

  const handleRequestPayout = async (amount: number, bankDetails: string) => {
    try {
      const result = await requestPayout(ownerId, amount, bankDetails) as any
      if (result.success) {
        queryClient.invalidateQueries(['dashboard_data', ownerId] as any)
        alert('Payout request submitted successfully!')
      } else {
        alert(result.error || 'Failed to request payout')
      }
    } catch (err) {
      alert('An error occurred while requesting payout')
    }
  }

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) return (
    <div className="p-8 text-center bg-white rounded-3xl border shadow-sm m-4">
      <p className="text-gray-500 mb-2">Failed to load dashboard data.</p>
      <p className="text-xs text-red-500 font-mono mb-4 break-all">
        {error ? (error as any).message : (ownerId ? `Owner ID: ${ownerId}` : 'Missing Owner ID')}<br/>
        {isSuperAdmin ? 'Admin Mode: ON' : 'Admin Mode: OFF'}
      </p>
      <Button onClick={() => window.location.reload()}>Refresh Page</Button>
    </div>
  )

  const { properties, leads, checkins, influencer_requests, wallet_transactions, payout_requests } = data as any
  const pendingInfluencerRequestCount = influencer_requests?.filter((r: any) => r.status === 'pending').length || 0

  return (
    <div className="flex flex-col gap-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 drop-shadow-sm">
            Partner Dashboard
          </h1>
          <p className="text-gray-500 font-medium">Manage your properties, guests, and leads</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isFreeTier && (
            <Link href="/pricing/starter">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border-none shadow-lg hover:shadow-orange-200/50 transition-all hover:scale-105 rounded-xl px-6">
                <Zap className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            </Link>
          )}
          <CreatePropertyForm />
        </div>
      </div>

      {/* Tabs / Navigation */}
      <div className="flex border-b border-gray-100 w-full mb-2 overflow-x-auto no-scrollbar scroll-smooth">
        <TabLink href="/dashboard/owner?tab=properties" active={activeTab === 'properties'} icon={<Home className="w-4 h-4 md:w-5 md:h-5" />} label="Properties" />
        <TabLink href="/dashboard/owner?tab=leads" active={activeTab === 'leads'} icon={<MessageSquare className="w-4 h-4 md:w-5 md:h-5" />} label="Leads" count={leads?.length} />
        <TabLink href="/dashboard/owner?tab=guests" active={activeTab === 'guests'} icon={<Users className="w-4 h-4 md:w-5 md:h-5" />} label="Guests" count={checkins?.length} />
        <TabLink href="/dashboard/owner?tab=influencers" active={activeTab === 'influencers'} icon={<Megaphone className="w-4 h-4 md:w-5 md:h-5" />} label="Influencers" count={pendingInfluencerRequestCount} />
        <TabLink href="/dashboard/owner?tab=wallet" active={activeTab === 'wallet'} icon={<Wallet className="w-4 h-4 md:w-5 md:h-5" />} label="Wallet" />
        <TabLink href="/dashboard/owner/profile" active={activeTab === 'profile'} icon={<User className="w-4 h-4 md:w-5 md:h-5" />} label="Profile & Plan" />
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard 
          title="Properties" 
          value={properties?.length || 0} 
          icon={<Home className="w-5 h-5 text-blue-600" />}
          active={activeTab === 'properties'}
          onClick={() => router.push(`?tab=properties`)}
        />
        <StatsCard 
          title="Guests" 
          value={checkins?.length || 0} 
          icon={<Users className="w-5 h-5 text-purple-600" />}
          active={activeTab === 'guests'}
          onClick={() => router.push(`?tab=guests`)}
        />
        <StatsCard 
          title="Leads" 
          value={leads?.length || 0} 
          icon={<List className="w-5 h-5 text-green-600" />}
          active={activeTab === 'leads'}
          onClick={() => router.push(`?tab=leads`)}
        />
        <StatsCard 
          title="Earnings" 
          value={`₹${wallet_transactions?.filter((t:any) => t.transaction_type === 'earning').reduce((acc:any, t:any) => acc + Number(t.amount), 0).toLocaleString()}`} 
          icon={<Wallet className="w-5 h-5 text-amber-600" />}
          active={activeTab === 'wallet'}
          onClick={() => router.push(`?tab=wallet`)}
        />
      </div>

      {/* Dynamic Tab Content */}
      <div className="space-y-6">
        {activeTab === 'properties' && (
          <div className="flex flex-col gap-6 items-start w-full">
            <div className="flex flex-col w-full gap-2 lg:bg-white lg:border lg:p-4 lg:shadow-sm lg:rounded-xl">
              <AddLeadTile ownerId={ownerId} properties={properties || []} />
              <QuickCheckin properties={properties || []} />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {properties?.map((property: any) => (
                <PropertyCard key={property.id} prop={property} />
              ))}
              {properties?.length === 0 && (
                <div className="col-span-full p-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 w-full">
                  <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900">No properties yet</h3>
                  <p className="text-gray-500 mb-6 max-w-xs mx-auto">Start by adding your first property to get leads and manage guests.</p>
                  <CreatePropertyForm />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <LeadsSection 
            ownerId={ownerId} 
            properties={properties || []} 
            initialLeads={leads || []} 
            isFreeTier={isFreeTier} 
          />
        )}

        {activeTab === 'guests' && (
          <GuestList 
            checkins={checkins || []} 
            isFreeTier={isFreeTier} 
          />
        )}

        {activeTab === 'influencers' && (
          <InfluencerRequestsInbox 
            requests={influencer_requests || []} 
          />
        )}

        {activeTab === 'wallet' && (
          <WalletSection 
            transactions={wallet_transactions || []} 
            payouts={payout_requests || []} 
            onRequestPayout={handleRequestPayout}
          />
        )}
      </div>

      {/* Subscription Banner for Free Tier */}
      {isFreeTier && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 bg-gray-900 text-white p-6 rounded-3xl shadow-2xl border border-gray-800 animate-in slide-in-from-bottom-10 z-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Trial Expired</h4>
              <p className="text-gray-400 text-sm mb-4">Your 7-day free trial has ended. Upgrade to Pro to unlock lead and guest details.</p>
              <Link href="/pricing/starter">
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold rounded-xl h-11">
                  View Pricing Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatsCard({ title, value, icon, active, onClick }: { 
  title: string, 
  value: string | number, 
  icon: React.ReactNode, 
  active?: boolean, 
  onClick: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl border text-left transition-all hover:shadow-md ${
        active 
          ? 'bg-white border-blue-100 shadow-sm ring-1 ring-blue-50' 
          : 'bg-white border-gray-100'
      }`}
    >
      <div className="flex items-center gap-3 mb-2 text-gray-500">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
    </button>
  )
}

function TabLink({ href, active, icon, label, count }: { href: string, active: boolean, icon: React.ReactNode, label: string, count?: number }) {
  return (
    <Link 
      href={href}
      className={`flex-none md:flex-1 min-w-[90px] justify-center px-4 md:px-8 py-3.5 font-bold text-[11px] sm:text-sm transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 ${
        active 
          ? 'border-blue-600 text-blue-600 bg-blue-50/30' 
          : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="flex items-center">
        {label}
        {count !== undefined && count > 0 && <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1 font-black">{count}</span>}
      </span>
    </Link>
  )
}

function NavIconButton({ icon, label, active, onClick, badge }: { 
  icon: React.ReactNode, 
  label: string, 
  active?: boolean, 
  onClick: () => void,
  badge?: number 
}) {
  return (
    <button 
      onClick={onClick}
      className={`group relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-gray-400 hover:bg-gray-100'
      }`}
    >
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5 font-bold' })}
      
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
          {badge}
        </span>
      )}

      <span className="absolute left-full ml-4 px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        {label}
      </span>
    </button>
  )
}
