'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Home, MessageSquare, Users, Wallet, User, Zap, Megaphone } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { PropertyCard } from '@/components/PropertyCard'
import WalletSection from '@/components/WalletSection'
import AddLeadTile from './AddLeadTile'
import QuickCheckin from './QuickCheckin'
import { requestPayout } from '@/app/actions/wallet'
import React, { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

// Lazy load heavy tab sections
const LeadsSection = dynamic(() => import('./LeadsSection'), { loading: () => <DashboardSkeleton /> })
const GuestList = dynamic(() => import('./GuestList'), { loading: () => <DashboardSkeleton /> })
const InfluencerRequestsInbox = dynamic(() => import('./InfluencerRequestsInbox'), { loading: () => <DashboardSkeleton /> })
const EmployeeSection = dynamic(() => import('./EmployeeSection'), { loading: () => <DashboardSkeleton /> })
const MarketingSection = dynamic(() => import('./MarketingSection'), { loading: () => <DashboardSkeleton /> })

export default function OwnerDashboardClient({ 
  userId, 
  email,
  ownerId, 
  isSuperAdmin,
  hasGoogleDrive = false,
  googleEmail = null
}: { 
  userId: string; 
  email: string;
  ownerId: string; 
  isSuperAdmin: boolean; 
  hasGoogleDrive?: boolean;
  googleEmail?: string | null;
}) {
  console.log('OwnerDashboardClient Rendered:', { userId, email, ownerId, isSuperAdmin })
  
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'properties'
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useDashboardData(ownerId, isSuperAdmin)

  // Use useMemo for trial calculation to avoid redundant calculations
  const { isFreeTier } = useMemo(() => {
    if (!data) return { isFreeTier: false }
    
    const { subscription, owner } = data as any
    const isPaid = subscription?.status === 'active' && new Date(subscription.end_date) > new Date()
    
    // 7-day Trial Logic from Owner Creation Date
    const ownerCreatedAt = owner?.created_at ? new Date(owner.created_at) : null
    const trialEndDate = ownerCreatedAt ? new Date(ownerCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null
    const isExpired = !isPaid && trialEndDate ? trialEndDate <= new Date() : false
    
    return { isFreeTier: isExpired }
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
            <Link href="/pricing/starter">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border-none shadow-lg hover:shadow-orange-200/50 transition-all hover:scale-105 rounded-xl px-6">
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Upgrade to Pro
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs / Navigation (Only visible on Mobile, hidden on tablet/desktop mode) */}
      <div className="md:hidden flex flex-wrap border-b border-gray-100 w-full mb-2">
        <TabLink href="/dashboard/owner?tab=properties" active={activeTab === 'properties'} icon={<Home className="w-4 h-4 md:w-5 md:h-5" />} label="Properties" />
        <TabLink href="/dashboard/owner?tab=leads" active={activeTab === 'leads'} icon={<MessageSquare className="w-4 h-4 md:w-5 md:h-5" />} label="Leads" count={leads?.length} />
        <TabLink href="/dashboard/owner?tab=guests" active={activeTab === 'guests'} icon={<Users className="w-4 h-4 md:w-5 md:h-5" />} label="Guests" count={checkins?.length} />
        <TabLink href="/dashboard/owner?tab=employees" active={activeTab === 'employees'} icon={<Users className="w-4 h-4 md:w-5 md:h-5" />} label="Employees" />
        <TabLink href="/dashboard/owner?tab=influencers" active={activeTab === 'influencers'} icon={<Megaphone className="w-4 h-4 md:w-5 md:h-5" />} label="Influencers" count={pendingInfluencerRequestCount} />
        <TabLink href="/dashboard/owner?tab=wallet" active={activeTab === 'wallet'} icon={<Wallet className="w-4 h-4 md:w-5 md:h-5" />} label="Wallet" />
        <TabLink href="/dashboard/owner?tab=marketing" active={activeTab === 'marketing'} icon={<Megaphone className="w-4 h-4 md:w-5 md:h-5" />} label="Marketing" />
        <TabLink href="/dashboard/owner/profile" active={activeTab === 'profile'} icon={<User className="w-4 h-4 md:w-5 md:h-5" />} label="Profile & Plan" />
      </div>

      {/* Dynamic Tab Content */}
      <div className="space-y-6">
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
                <Link href="/dashboard/owner/profile" className="text-blue-600 hover:underline shrink-0 font-bold uppercase tracking-wider text-[10px]">
                  Set Up Sync &rarr;
                </Link>
              )}
            </div>

            {/* CRM Forms Block */}
            <div id="dashboard-forms" className="flex flex-col w-full gap-3 bg-white border border-gray-150 p-5 shadow-sm rounded-2xl">
              <AddLeadTile ownerId={ownerId} properties={properties || []} />
              <QuickCheckin properties={properties || []} />
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
                    <Link href="/dashboard/owner/profile">
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

function TabLink({ href, active, icon, label, count }: { href: string, active: boolean, icon: React.ReactNode, label: string, count?: number }) {
  return (
    <Link 
      href={href}
      className={`flex-auto text-center px-2 md:px-8 py-3.5 font-bold text-[11px] sm:text-sm transition-all border-b-2 flex items-center justify-center gap-1 sm:gap-2 min-w-[30%] sm:min-w-[120px] ${
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

