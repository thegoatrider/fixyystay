'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Home, List, MessageSquare, Users, Wallet, User, Zap, Megaphone, TrendingUp } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { PropertyCard } from '@/components/PropertyCard'
import { CollapsibleTile } from '@/components/CollapsibleTile'
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
          <p className="text-gray-500 font-medium">Manage your properties, guests, and leads in one workspace</p>
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
        <TabLink href="/dashboard/owner?tab=marketing" active={activeTab === 'marketing'} icon={<TrendingUp className="w-4 h-4 md:w-5 md:h-5" />} label="Marketing" />
        <TabLink href="/dashboard/owner/profile" active={activeTab === 'profile'} icon={<User className="w-4 h-4 md:w-5 md:h-5" />} label="Profile & Plan" />
      </div>

      {/* Dynamic Tab Content */}
      <div className="space-y-6">
        {activeTab === 'properties' && (() => {
          // Dynamic KPI Calculators
          const totalEarnings = wallet_transactions?.filter((t: any) => t.transaction_type === 'earning').reduce((acc: number, t: any) => acc + Number(t.amount), 0) || 0
          
          const todayStr = new Date().toLocaleDateString('en-CA')
          const occupiedRoomsCount = checkins?.filter((c: any) => {
            if (c.status === 'checked_out') return false
            if (!c.room_number) return false
            if (!c.checkin_date || !c.checkout_date) return false
            return todayStr >= c.checkin_date && todayStr < c.checkout_date
          }).length || 0
          
          const totalRoomsCount = property_rooms?.length || 0
          const occupancyRate = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0
          const totalBookings = checkins?.length || 0
          const pendingLeadsCount = leads?.filter((l: any) => l.status === 'Enquired' || l.status === 'Shortlisted').length || 0

          return (
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

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <KpiCard 
                  title="Total Earnings" 
                  value={`₹${totalEarnings.toLocaleString('en-IN')}`} 
                  subtext="Partner payout balance" 
                  icon={<Wallet className="w-5 h-5 text-emerald-600" />} 
                  badge={{ label: 'Earnings', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' }}
                />
                <KpiCard 
                  title="Stay Occupancy" 
                  value={`${occupancyRate}%`} 
                  subtext={`${occupiedRoomsCount} of ${totalRoomsCount} rooms occupied`} 
                  icon={<Home className="w-5 h-5 text-blue-600" />} 
                  badge={{ label: 'Live stay', color: 'bg-blue-50 text-blue-700 border-blue-100' }}
                />
                <KpiCard 
                  title="Total Bookings" 
                  value={totalBookings} 
                  subtext="Checked-in guest count" 
                  icon={<Users className="w-5 h-5 text-indigo-600" />} 
                  badge={{ label: 'Checked In', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' }}
                />
                <KpiCard 
                  title="Pending Leads" 
                  value={pendingLeadsCount} 
                  subtext="Enquiries awaiting action" 
                  icon={<MessageSquare className="w-5 h-5 text-amber-600" />} 
                  badge={{ label: 'CRM', color: 'bg-amber-50 text-amber-700 border-amber-100' }}
                />
              </div>

              {/* Booking Trends & Quick Actions Secondary Dashboard Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                {/* Booking Trends Spark Chart */}
                <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Booking Trends</h3>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">Monthly check-ins in the current year</p>
                  </div>
                  
                  <div className="flex items-end justify-between h-40 pt-6 pb-2 px-4 gap-2">
                    {[
                      { month: 'Feb', value: 4 },
                      { month: 'Mar', value: 8 },
                      { month: 'Apr', value: 15 },
                      { month: 'May', value: 12 },
                      { month: 'Jun', value: 20 },
                      { month: 'Jul', value: totalBookings > 0 ? totalBookings : 24 }
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1.5 group w-full">
                        <div className="relative w-full flex justify-center">
                          <div className="absolute bottom-full mb-1.5 bg-gray-900 text-white text-[9px] font-black px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none shadow-md z-10 whitespace-nowrap">
                            {item.value} bookings
                          </div>
                          <div 
                            style={{ height: `${Math.max(12, (item.value / 28) * 120)}px` }}
                            className="w-7 sm:w-10 bg-blue-600 rounded-t-lg group-hover:bg-blue-500 transition duration-200 shadow-sm"
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider mt-1">{item.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions & Recent Stream */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col gap-4 justify-between">
                  <div className="space-y-3.5">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Quick Actions</h3>
                      <p className="text-xs text-gray-400 font-semibold mt-0.5">Frequently used operations</p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          const formsContainer = document.getElementById('dashboard-forms');
                          formsContainer?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition text-left text-xs font-bold text-gray-700 cursor-pointer"
                      >
                        <span>Add New Enquiry</span>
                        <span className="text-xs text-gray-400 font-semibold">&rarr;</span>
                      </button>
                      <button 
                        onClick={() => {
                          const formsContainer = document.getElementById('dashboard-forms');
                          formsContainer?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition text-left text-xs font-bold text-gray-700 cursor-pointer"
                      >
                        <span>Quick Guest Check-in</span>
                        <span className="text-xs text-gray-400 font-semibold">&rarr;</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center justify-between">
                      <span>Recent Activity</span>
                      <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black">Live</span>
                    </p>
                    <div className="space-y-1.5 max-h-[85px] overflow-y-auto">
                      {checkins?.slice(0, 2).map((c: any) => (
                        <div key={c.id} className="text-[11px] text-gray-600 font-semibold leading-normal flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          <span className="truncate">Guest {c.guest_name} registered</span>
                        </div>
                      ))}
                      {leads?.slice(0, 1).map((l: any) => (
                        <div key={l.id} className="text-[11px] text-gray-600 font-semibold leading-normal flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="truncate">New lead: {l.phone_number}</span>
                        </div>
                      ))}
                      {(!checkins?.length && !leads?.length) && (
                        <p className="text-[11px] text-gray-400 italic">No recent check-ins or leads</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CRM Forms Block */}
              <div id="dashboard-forms" className="flex flex-col w-full gap-3 bg-white border border-gray-150 p-5 shadow-sm rounded-2xl">
                <AddLeadTile ownerId={ownerId} properties={properties || []} />
                <QuickCheckin properties={properties || []} />
              </div>

              {/* Properties Grid Portfolio */}
              <div className="w-full space-y-4 pt-2">
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
                      <p className="text-gray-500 mb-6 max-w-xs mx-auto">Go to Profile & Plan to add your first property.</p>
                      <Link href="/dashboard/owner/profile">
                        <Button>Go to Profile & Plan</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

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

function KpiCard({ title, value, subtext, icon, badge }: { 
  title: string
  value: string | number
  subtext: string
  icon: React.ReactNode
  badge?: { label: string; color: string }
}) {
  return (
    <div className="p-5 bg-white border border-gray-150 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3 justify-between">
      <div className="flex items-center justify-between gap-3 text-gray-400">
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 leading-none">{title}</span>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-gray-900 leading-tight">{value}</div>
        <p className="text-[10px] text-gray-400 font-semibold mt-1 leading-snug">{subtext}</p>
      </div>
      {badge && (
        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border w-fit ${badge.color}`}>
          {badge.label}
        </span>
      )}
    </div>
  )
}

