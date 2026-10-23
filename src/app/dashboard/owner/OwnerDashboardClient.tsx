'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Home, MessageSquare, Users, Wallet, User, Zap, Megaphone, QrCode, CreditCard } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { PropertyCard } from '@/components/PropertyCard'
import WalletSection from '@/components/WalletSection'
import AddLeadTile from './AddLeadTile'
import QuickCheckin from './QuickCheckin'
import DigitizeRegisterTile from './DigitizeRegisterTile'
import { requestPayout } from '@/app/actions/wallet'
import React, { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

// Lazy load heavy tab sections
const LeadsSection = dynamic(() => import('./LeadsSection'), { loading: () => <DashboardSkeleton /> })
const GuestList = dynamic(() => import('./GuestList'), { loading: () => <DashboardSkeleton /> })
const InfluencerRequestsInbox = dynamic(() => import('./InfluencerRequestsInbox'), { loading: () => <DashboardSkeleton /> })
const EmployeeSection = dynamic(() => import('./EmployeeSection'), { loading: () => <DashboardSkeleton /> })
const MarketingSection = dynamic(() => import('./MarketingSection'), { loading: () => <DashboardSkeleton /> })
const GuestHubSection = dynamic(() => import('./GuestHubSection'), { loading: () => <DashboardSkeleton /> })
const CreatePropertyForm = dynamic(() => import('./CreatePropertyForm'), { loading: () => <div className="p-4 bg-white rounded-xl border text-sm text-gray-400">Loading property form...</div> })

export default function OwnerDashboardClient({ 
  userId, 
  email,
  ownerId, 
  isSuperAdmin,
  hasGoogleDrive = false,
  googleEmail = null,
  initialOwner = null,
  initialSubscription = null
}: { 
  userId: string; 
  email: string;
  ownerId: string; 
  isSuperAdmin: boolean; 
  hasGoogleDrive?: boolean;
  googleEmail?: string | null;
  initialOwner?: any;
  initialSubscription?: any;
}) {
  console.log('OwnerDashboardClient Rendered:', { userId, email, ownerId, isSuperAdmin })
  
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = React.useState<string>(() => searchParams.get('tab') || 'properties')
  const queryClient = useQueryClient()

  // Sync state with URL if changed externally (e.g. Next.js router)
  React.useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'properties')
  }, [searchParams])

  // Listen to popstate for instant back/forward button navigation with 0 server roundtrips
  React.useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      setActiveTab(params.get('tab') || 'properties')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Client-only tab switcher: 0ms UI update, pushState to URL, 0 server calls
  const switchTab = React.useCallback((tab: string) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.pushState(null, '', url.pathname + url.search)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])

  const { data, isLoading, error } = useDashboardData(ownerId, isSuperAdmin)

  // Subscription and status calculation (No free tier, no trial)
  const subscriptionInfo = useMemo(() => {
    const sub = (data as any)?.subscription || initialSubscription
    const isPaid = sub?.status === 'active' && !!sub?.end_date && new Date(sub.end_date) > new Date()

    let endDate: Date | null = null
    let daysRemaining = 0
    let planDisplayName = 'FixyStays Partner'

    if (isPaid && sub?.end_date) {
      endDate = new Date(sub.end_date)
      daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      planDisplayName = sub.plan_name ? sub.plan_name.toUpperCase() : 'ACTIVE SUBSCRIPTION'
    } else if (sub?.end_date) {
      endDate = new Date(sub.end_date)
      daysRemaining = 0
      planDisplayName = 'EXPIRED SUBSCRIPTION'
    } else {
      planDisplayName = 'SUBSCRIPTION REQUIRED'
    }

    const formattedEndDate = endDate
      ? endDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      : null

    const isExpiringSoon = isPaid && daysRemaining <= 7

    return {
      isFreeTier: !isPaid,
      isPaid,
      planDisplayName,
      formattedEndDate,
      daysRemaining,
      isExpiringSoon,
      hasEndDate: !!endDate
    }
  }, [data, initialOwner, initialSubscription])

  const isFreeTier = subscriptionInfo.isFreeTier



  const handleRequestPayout = async (amount: number, bankDetails: string) => {
    try {
      const result = await requestPayout(ownerId, amount, bankDetails) as any
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['dashboard_data', ownerId] })
        toast.success('Payout request submitted successfully!')
      } else {
        toast.error(result.error || 'Failed to request payout')
      }
    } catch (err) {
      toast.error('An error occurred while requesting payout')
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

  const { properties, leads, checkins, influencer_requests, wallet_transactions, payout_requests, property_rooms } = data as any
  const pendingInfluencerRequestCount = influencer_requests?.filter((r: any) => r.status === 'pending').length || 0



  return (
    <div className="flex flex-col gap-8 pb-32 w-full min-w-0 overflow-x-hidden md:overflow-visible">
      {/* Welcome Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 drop-shadow-sm flex items-center gap-2">
            Welcome, {(data as any)?.owner?.name || email?.split('@')[0] || 'Partner'}!
          </h1>
          <p className="text-gray-500 font-medium">Manage your properties, guests, and leads in one dashboard</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!subscriptionInfo.isPaid && (
            <Link href="/renew" prefetch={false}>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-5 shadow-sm">
                <CreditCard className="w-4 h-4 mr-2" />
                Renew Subscription
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Non-blocking Missing Phone Notification */}
      {!(data as any)?.owner?.phone && !initialOwner?.phone && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>Your owner WhatsApp number is missing. Please add it to your profile for guest check-in updates and instant support.</span>
          </div>
          <Link href="/dashboard/owner/profile" className="text-amber-700 underline font-bold uppercase shrink-0">
            Update Profile &rarr;
          </Link>
        </div>
      )}

      {/* Tabs / Navigation (Only visible on Mobile, hidden on tablet/desktop mode) */}
      <div className="md:hidden flex flex-wrap border-b border-gray-100 w-full mb-2">
        <TabButton active={activeTab === 'properties'} onClick={() => switchTab('properties')} icon={<Home className="w-4 h-4 md:w-5 md:h-5" />} label="Properties" />
        <TabButton active={activeTab === 'guest-hub'} onClick={() => switchTab('guest-hub')} icon={<QrCode className="w-4 h-4 md:w-5 md:h-5" />} label="Guest Hub" />
        <TabButton active={activeTab === 'leads'} onClick={() => switchTab('leads')} icon={<MessageSquare className="w-4 h-4 md:w-5 md:h-5" />} label="Leads" count={leads?.length} />
        <TabButton active={activeTab === 'guests'} onClick={() => switchTab('guests')} icon={<Users className="w-4 h-4 md:w-5 md:h-5" />} label="Guests" count={checkins?.length} />
        <TabButton active={activeTab === 'employees'} onClick={() => switchTab('employees')} icon={<Users className="w-4 h-4 md:w-5 md:h-5" />} label="Employees" />
        <TabButton active={activeTab === 'influencers'} onClick={() => switchTab('influencers')} icon={<Megaphone className="w-4 h-4 md:w-5 md:h-5" />} label="Influencers" count={pendingInfluencerRequestCount} />
        <TabButton active={activeTab === 'wallet'} onClick={() => switchTab('wallet')} icon={<Wallet className="w-4 h-4 md:w-5 md:h-5" />} label="Wallet" />
        <TabButton active={activeTab === 'marketing'} onClick={() => switchTab('marketing')} icon={<Megaphone className="w-4 h-4 md:w-5 md:h-5" />} label="Marketing" />
        <Link 
          href="/dashboard/owner/profile" 
          prefetch={false}
          className={`flex-auto text-center px-2 md:px-8 py-3.5 font-bold text-[11px] sm:text-sm transition-all border-b-2 flex items-center justify-center gap-1 sm:gap-2 min-w-[30%] sm:min-w-[120px] active:scale-[0.98] ${
            activeTab === 'profile' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/30' 
              : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          <User className="w-4 h-4 md:w-5 md:h-5" />
          <span>Profile &amp; Plan</span>
        </Link>
      </div>

      {/* Dynamic Tab Content */}
      <div className="space-y-6">
        {activeTab === 'guest-hub' && (
          <GuestHubSection
            ownerId={ownerId}
            ownerEmail={email}
            properties={properties || []}
            isSuperAdmin={isSuperAdmin}
            initialPropertyId={searchParams.get('propertyId') || undefined}
          />
        )}

        {activeTab === 'properties' && (
          <div className="flex flex-col gap-6 items-start w-full">
            {/* Google Drive Sync Banner */}
            <div className={`w-full p-4 rounded-2xl border flex items-center justify-between gap-4 text-xs font-semibold shadow-sm ${
              hasGoogleDrive 
                ? 'bg-green-50/50 border-green-200 text-green-800' 
                : 'bg-blue-50/50 border-blue-100 text-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-base">☁️</span>
                <span>
                  {hasGoogleDrive 
                    ? `Google Drive Sync is Active: Saving guest check-in PDF records to ${googleEmail}` 
                    : 'Google Drive Sync is Offline: Save copies of guest check-ins directly to your personal cloud.'
                  }
                </span>
              </div>
              {!hasGoogleDrive && (
                <Link href="/dashboard/owner/profile" prefetch={false} className="text-blue-600 hover:underline shrink-0 font-bold uppercase tracking-wider text-[10px]">
                  Set Up Sync &rarr;
                </Link>
              )}
            </div>

            {/* CRM Forms Block */}
            <div id="dashboard-forms" className="flex flex-col w-full gap-3 bg-white border border-gray-150 p-5 shadow-sm rounded-2xl">
              <AddLeadTile ownerId={ownerId} properties={properties || []} />
              <QuickCheckin properties={properties || []} />
              <DigitizeRegisterTile properties={properties || []} />
              <CreatePropertyForm initialPhone={initialOwner?.phone || (data as any)?.owner?.phone || ""} />
            </div>

            {/* Properties Grid Portfolio */}
            <div className="w-full space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Your Property Portfolio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 w-full">
                {properties?.map((property: any) => {
                  const room_count = property.room_count || property_rooms?.filter((r: any) => r.property_id === property.id).length || 0;
                  return <PropertyCard key={property.id} prop={{ ...property, room_count }} />
                })}
                {properties?.length === 0 && (
                  <div className="col-span-full p-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 w-full">
                    <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">No properties yet</h3>
                    <p className="text-gray-500 mb-6 max-w-xs mx-auto">Use the Add New Property form above to register your first property listing.</p>
                    <Button onClick={() => {
                      const el = document.getElementById('dashboard-forms')
                      el?.scrollIntoView({ behavior: 'smooth' })
                    }}>
                      Add New Property
                    </Button>
                  </div>
                )}
              </div>
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
            properties={properties || []}
            propertyRooms={property_rooms || []}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeSection 
            ownerId={ownerId} 
            properties={properties || []} 
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

        {activeTab === 'marketing' && (
          <MarketingSection ownerId={ownerId} />
        )}
      </div>

      {/* Renewal banner for expired subscriptions */}
      {!subscriptionInfo.isPaid && activeTab !== 'guest-hub' && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 bg-gray-900 text-white p-6 rounded-3xl shadow-2xl border border-gray-800 animate-in slide-in-from-bottom-10 z-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Subscription Expired</h4>
              <p className="text-gray-400 text-sm mb-4">Your property subscription has expired. Renew to unlock guest check-ins, direct leads, and public listings.</p>
              <Link href="/renew" prefetch={false}>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11">
                  Renew Subscription
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label, 
  count 
}: { 
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number 
}) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`flex-auto text-center px-2 md:px-8 py-3.5 font-bold text-[11px] sm:text-sm transition-all border-b-2 flex items-center justify-center gap-1 sm:gap-2 min-w-[30%] sm:min-w-[120px] active:scale-[0.98] ${
        active 
          ? 'border-blue-600 text-blue-600 bg-blue-50/30' 
          : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="flex items-center">
        {label}
        {count !== undefined && count > 0 && (
          <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1 font-black">{count}</span>
        )}
      </span>
    </button>
  )
}

