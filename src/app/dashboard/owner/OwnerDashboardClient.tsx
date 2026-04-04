'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Home, List, MessageSquare, Users, Wallet, User, Zap } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { claimFreeTrial } from './actions'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { PropertyCard } from '@/components/PropertyCard'
import { CollapsibleTile } from '@/components/CollapsibleTile'
import WalletSection from '@/components/WalletSection'
import CreatePropertyForm from './CreatePropertyForm'
import AddLeadTile from './AddLeadTile'
import QuickCheckin from './QuickCheckin'
import { requestPayout } from '@/app/actions/wallet'
import React, { useMemo } from 'react'

// Lazy load heavy tab sections
const LeadsSection = dynamic(() => import('./LeadsSection'), { loading: () => <DashboardSkeleton /> })
const GuestList = dynamic(() => import('./GuestList'), { loading: () => <DashboardSkeleton /> })

export default function OwnerDashboardClient({ 
  userId, 
  ownerId, 
  isSuperAdmin 
}: { 
  userId: string, 
  ownerId: string, 
  isSuperAdmin: boolean 
}) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'properties'
  
  const { data, isLoading, error } = useDashboardData(ownerId, isSuperAdmin)

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) return <div className="p-8 text-center text-red-500">Error loading dashboard: {error?.message || 'Unknown error'}</div>

  const { properties, leads, checkins, wallet, subscription } = data as any
  const isLocked = !subscription?.is_active && !isSuperAdmin

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
        <TabLink href="/dashboard/owner?tab=properties" active={activeTab === 'properties'} icon={<List className="w-4 h-4 md:w-5 md:h-5" />} label="Properties" />
        <TabLink href="/dashboard/owner?tab=leads" active={activeTab === 'leads'} icon={<MessageSquare className="w-4 h-4 md:w-5 md:h-5" />} label="Leads" count={leads?.length} />
        <TabLink href="/dashboard/owner?tab=guests" active={activeTab === 'guests'} icon={<Users className="w-4 h-4 md:w-5 md:h-5" />} label="Guests" count={checkins?.length} />
        <TabLink href="/dashboard/owner?tab=wallet" active={activeTab === 'wallet'} icon={<Wallet className="w-4 h-4 md:w-5 md:h-5" />} label="Wallet" />
        <TabLink href="/dashboard/owner/profile" active={activeTab === 'profile'} icon={<User className="w-4 h-4 md:w-5 md:h-5" />} label="Profile & Plan" />
      </div>

      {activeTab === 'wallet' ? (
        <WalletSection 
          transactions={wallet.transactions || []} 
          payouts={wallet.payouts || []} 
          onRequestPayout={requestPayout.bind(null, userId || '')} 
        />
      ) : activeTab === 'properties' ? (
        <div className="flex flex-col gap-6 items-start w-full">
          <div className="flex flex-col w-full gap-2 lg:bg-white lg:border lg:p-4 lg:shadow-sm lg:rounded-xl">
            <AddLeadTile ownerId={ownerId} properties={properties || []} />
            <QuickCheckin properties={properties || []} />
            <CollapsibleTile title="Add New Property">
              <CreatePropertyForm />
            </CollapsibleTile>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <h2 className="text-xl font-bold mt-4 lg:mt-2 px-1">Your Properties Database</h2>
            {properties && properties.length > 0 ? (
              properties.map((prop: any) => <PropertyCard key={prop.id} prop={prop} />)
            ) : (
              <EmptyState message="You haven't added any properties yet." icon={<Home className="w-12 h-12 mx-auto text-gray-300 mb-4" />} />
            )}
          </div>
        </div>
      ) : activeTab === 'leads' ? (
        <LeadsSection 
          ownerId={ownerId} 
          properties={properties || []} 
          initialLeads={leads as any || []} 
        />
      ) : (
        <GuestList checkins={checkins as any || []} />
      )}

      {/* Lockout Overlay */}
      {isLocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/20 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white border-2 border-red-100 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Wallet className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900 italic">Access Locked</h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                Your partner subscription has expired or hasn't started yet. Please renew to access your property management tools.
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-1">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Support Line</p>
              <p className="text-xl font-bold text-blue-600">+91 75062 88907</p>
            </div>

            <div className="grid gap-3">
              {subscription?.status === 'none' && (
                <Button 
                  onClick={async () => {
                    if (confirm('Start your 7-day free trial?')) {
                      const res = await claimFreeTrial()
                      if (res.success) window.location.reload()
                      else alert(res.error)
                    }
                  }} 
                  className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-black rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  Start 7-Day Free Trial
                </Button>
              )}
              
              <Button 
                onClick={() => window.location.href = '/dashboard/owner/profile'} 
                variant="outline"
                className="w-full h-14 text-lg font-black rounded-xl border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                View My Account
              </Button>
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

function EmptyState({ message, icon }: { message: string, icon: React.ReactNode }) {
  return (
    <div className="text-center p-12 border-2 border-dashed bg-white rounded-lg text-gray-500 w-full">
      {icon}
      <p>{message}</p>
    </div>
  )
}
