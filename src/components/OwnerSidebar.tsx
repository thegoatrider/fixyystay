'use client'

import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { 
  Home, 
  MessageSquare, 
  Users, 
  Wallet, 
  TrendingUp, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Building,
  Sparkles,
  Inbox,
  Lock,
  ChevronRight
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

type OwnerSidebarProps = {
  userEmail?: string
  userRole?: string
}

export default function OwnerSidebar({ userEmail, userRole }: OwnerSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'properties'
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState<string>('Owner')
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  useEffect(() => {
    async function getUserName() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Partner')
      }
    }
    getUserName()
  }, [supabase])

  const menuItems = [
    {
      id: 'properties',
      label: 'Properties',
      icon: Home,
      href: '/dashboard/owner?tab=properties',
      isActive: (pathname === '/dashboard/owner' && activeTab === 'properties') || pathname.startsWith('/dashboard/owner/property')
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: MessageSquare,
      href: '/dashboard/owner?tab=leads',
      isActive: pathname === '/dashboard/owner' && activeTab === 'leads'
    },
    {
      id: 'guests',
      label: 'Guest Records',
      icon: Users,
      href: '/dashboard/owner?tab=guests',
      isActive: pathname === '/dashboard/owner' && activeTab === 'guests'
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: Users,
      href: '/dashboard/owner?tab=employees',
      isActive: pathname === '/dashboard/owner' && activeTab === 'employees',
      subtext: 'Staff'
    },
    {
      id: 'influencers',
      label: 'Influencers',
      icon: Sparkles,
      href: '/dashboard/owner?tab=influencers',
      isActive: pathname === '/dashboard/owner' && activeTab === 'influencers'
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: Wallet,
      href: '/dashboard/owner?tab=wallet',
      isActive: pathname === '/dashboard/owner' && activeTab === 'wallet'
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: TrendingUp,
      href: '/dashboard/owner?tab=marketing',
      isActive: pathname === '/dashboard/owner' && activeTab === 'marketing'
    }
  ]

  const isProfileActive = pathname === '/dashboard/owner/profile'

  return (
    <aside className="hidden md:flex flex-col flex-shrink-0 bg-white border-r border-gray-150 h-screen sticky top-0 z-40 transition-all duration-300 md:w-20 lg:w-64 shadow-sm select-none">
      {/* Top: Logo section */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-center lg:justify-start gap-3 h-16">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-200">
          FS
        </div>
        <span className="hidden lg:inline-block font-black text-lg text-blue-600 tracking-tight leading-none italic uppercase">
          Fixy Stays
        </span>
      </div>

      {/* Workspace Switcher (Desktop Only) */}
      <div className="hidden lg:block p-3">
        <div className="relative">
          <button 
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200/50 hover:bg-gray-100/50 hover:border-gray-300 transition duration-150 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-blue-100">
                A1
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-gray-900 leading-tight">Alibag Region</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none mt-0.5">Workspace</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
          </button>
          
          {workspaceOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-1 animate-in fade-in slide-in-from-top-2 duration-150">
              <p className="text-[9px] font-black uppercase text-gray-400 px-3 py-1.5 tracking-widest">Switch Workspace</p>
              <button 
                onClick={() => setWorkspaceOpen(false)}
                className="w-full text-left px-3 py-2 rounded-lg bg-blue-50/50 text-blue-600 text-xs font-bold flex items-center justify-between"
              >
                <span>Alibag Region</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              <button 
                onClick={() => { alert('Add new regions in settings'); setWorkspaceOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-900 text-xs font-bold transition mt-0.5"
              >
                + Create Workspace
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-16rem)]">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all group ${
                item.isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50' 
                  : 'text-gray-500 hover:bg-blue-50/50 hover:text-blue-600'
              }`}
              title={item.label}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${item.isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`} />
              <span className="hidden lg:inline-block truncate">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings & User Profile */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-2">
        {/* Settings Shortcut */}
        <Link
          href="/dashboard/owner/profile"
          className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all group ${
            isProfileActive 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-500 hover:bg-blue-50/50 hover:text-blue-600'
          }`}
          title="Account & Plan Settings"
        >
          <Settings className={`w-5 h-5 flex-shrink-0 ${isProfileActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`} />
          <span className="hidden lg:inline-block text-xs truncate">
            Account & Plan
          </span>
        </Link>

        {/* User Card */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs uppercase flex-shrink-0">
              {userName.charAt(0)}
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-gray-400 truncate leading-none mt-0.5">{userEmail || 'Partner'}</p>
            </div>
          </div>
          
          <form action="/auth/signout" method="post" className="flex-shrink-0">
            <button 
              type="submit"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
