'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Home, MessageSquare, Users, Wallet, User, Zap, Megaphone, QrCode, Calendar, Clock, ShieldCheck } from 'lucide-react'
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

  // Comprehensive subscription and status calculation
  const subscriptionInfo = useMemo(() => {
    const sub = (data as any)?.subscription || initialSubscription
    const own = (data as any)?.owner || initialOwner
    
    const isFreeTierUser = own?.free_tier_enabled === true
    const isPaid = sub?.status === 'active' && !!sub?.end_date && new Date(sub.end_date) > new Date()
    
    // 7-day Trial Logic from Owner Creation Date
    const ownerCreatedAt = own?.created_at ? new Date(own.created_at) : null
    const trialEndDate = ownerCreatedAt ? new Date(ownerCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null
    const isTrialActive = !isPaid && !isFreeTierUser && !!trialEndDate && trialEndDate > new Date()
    const isExpired = !isPaid && !isTrialActive && !isFreeTierUser

    let endDate: Date | null = null
    let daysRemaining = 0
    let planDisplayName = 'FixyStays Partner'

    if (isPaid && sub?.end_date) {
      endDate = new Date(sub.end_date)
      daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      planDisplayName = sub.plan_name ? sub.plan_name.toUpperCase() : 'ACTIVE SUBSCRIPTION'
    } else if (isTrialActive && trialEndDate) {
      endDate = trialEndDate
      daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      planDisplayName = '7-DAY FREE TRIAL'
    } else if (sub?.end_date) {
      endDate = new Date(sub.end_date)
      daysRemaining = 0
      planDisplayName = sub.plan_name ? `${sub.plan_name.toUpperCase()} (EXPIRED)` : 'EXPIRED SUBSCRIPTION'
    } else if (isFreeTierUser) {
      planDisplayName = 'COURTESY PARTNER ACCESS'
    } else {
      planDisplayName = 'FREE TIER (RESTRICTED)'
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
      isFreeTier: isExpired,
      isPaid,
      isTrialActive,
      isFreeTierUser,
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
          {isFreeTier && (
            <Link href="/pricing/starter" prefetch={false}>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border-none shadow-lg hover:shadow-orange-200/50 transition-all hover:scale-105 rounded-xl px-6">
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Upgrade to Pro
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Subscription & Plan Status Banner */}
      <div className={cn(
        "rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border transition-all",
        subscriptionInfo.isPaid
          ? "bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-blue-50/40 border-emerald-200/80"
          : subscriptionInfo.isTrialActive
            ? "bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-yellow-50/40 border-amber-200/80"
            : subscriptionInfo.isFreeTierUser
              ? "bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-blue-50/40 border-purple-200/80"
              : "bg-gradient-to-r from-red-50/90 via-rose-50/50 to-orange-50/40 border-red-200/80"
      )}>
        <div className="flex items-center gap-3.5">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
            subscriptionInfo.isPaid
              ? "bg-emerald-600 text-white"
              : subscriptionInfo.isTrialActive
                ? "bg-amber-600 text-white"
                : subscriptionInfo.isFreeTierUser
                  ? "bg-purple-600 text-white"
                  : "bg-red-600 text-white"
          )}>
            {subscriptionInfo.isPaid ? (
              <ShieldCheck className="w-6 h-6" />
            ) : subscriptionInfo.isTrialActive ? (
              <Clock className="w-6 h-6" />
            ) : subscriptionInfo.isFreeTierUser ? (
              <Zap className="w-6 h-6" />
            ) : (
              <Clock className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-gray-900 text-sm sm:text-base tracking-tight">
                {subscriptionInfo.planDisplayName}
              </span>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                subscriptionInfo.isPaid
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : subscriptionInfo.isTrialActive
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : subscriptionInfo.isFreeTierUser
                      ? "bg-purple-100 text-purple-800 border-purple-300"
                      : "bg-red-100 text-red-800 border-red-300"
              )}>
                {subscriptionInfo.isPaid ? 'Active' : subscriptionInfo.isTrialActive ? 'Free Trial' : subscriptionInfo.isFreeTierUser ? 'VIP Access' : 'Expired'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {subscriptionInfo.hasEndDate ? (
                <span>
                  {subscriptionInfo.isPaid ? 'Subscription ends on ' : subscriptionInfo.isTrialActive ? 'Trial ends on ' : 'Subscription ended on '}
                  <strong className="text-gray-900 font-bold">{subscriptionInfo.formattedEndDate}</strong>
                  {subscriptionInfo.isPaid && (
                    <span className={cn("ml-1.5 font-semibold", subscriptionInfo.isExpiringSoon ? "text-amber-600 font-bold" : "text-gray-500")}>
                      ({subscriptionInfo.daysRemaining} {subscriptionInfo.daysRemaining === 1 ? 'day' : 'days'} left)
                    </span>
                  )}
                  {subscriptionInfo.isTrialActive && (
                    <span className="ml-1.5 font-bold text-amber-700">
                      ({subscriptionInfo.daysRemaining} {subscriptionInfo.daysRemaining === 1 ? 'day' : 'days'} left)
                    </span>
                  )}
                </span>
              ) : subscriptionInfo.isFreeTierUser ? (
                <span>Full courtesy access enabled by FixyStays admin</span>
              ) : (
                <span>Upgrade to unlock full property leads, guest register, and marketing</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
          <Link href="/dashboard/owner/profile" prefetch={false}>
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold bg-white/90 hover:bg-white border-gray-200 shadow-sm h-9 px-3.5">
              Account &amp; Plan Details →
            </Button>
          </Link>
          {(subscriptionInfo.isFreeTier || subscriptionInfo.isExpiringSoon || subscriptionInfo.isTrialActive) && (
            <Link href="/pricing/starter" prefetch={false}>
              <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold rounded-xl text-xs shadow-md h-9 px-3.5">
                <Zap className="w-3.5 h-3.5 mr-1" />
                {subscriptionInfo.isFreeTier ? 'Upgrade to Pro' : subscriptionInfo.isExpiringSoon ? 'Renew Subscription' : 'Upgrade Plan'}
              </Button>
            </Link>
          )}
        </div>
      </div>

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
            </div>

            {/* Properties Grid Portfolio */}
            <div className="w-full space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Your Property Portfolio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 w-full">
                {properties?.map((property: any) => {
                  const room_count = property_rooms?.filter((r: any) => r.property_id === property.id).length || 0;
                  return <PropertyCard key={property.id} prop={{ ...property, room_count }} />
                })}
                {properties?.length === 0 && (
                  <div className="col-span-full p-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 w-full">
                    <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">No properties yet</h3>
                    <p className="text-gray-500 mb-6 max-w-xs mx-auto">Go to Profile &amp; Plan to add your first property.</p>
                    <Link href="/dashboard/owner/profile" prefetch={false}>
                      <Button>Go to Profile &amp; Plan</Button>
                    </Link>
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

      {/* Subscription Banner for Free Tier (hidden when using standalone Guest Hub tab) */}
      {isFreeTier && activeTab !== 'guest-hub' && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 bg-gray-900 text-white p-6 rounded-3xl shadow-2xl border border-gray-800 animate-in slide-in-from-bottom-10 z-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Trial Expired</h4>
              <p className="text-gray-400 text-sm mb-4">Your 7-day free trial has ended. Upgrade to Pro to unlock lead and guest details.</p>
              <Link href="/pricing/starter" prefetch={false}>
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

