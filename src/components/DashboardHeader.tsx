'use client'

import Link from 'next/link'
import { LayoutDashboard, LogOut, Home, User } from 'lucide-react'

type DashboardHeaderProps = {
  userEmail?: string
  userRole?: string
}

export function DashboardHeader({ userEmail, userRole }: DashboardHeaderProps) {
  const isGuest = !userRole || userRole === 'guest'
  const dashboardLink = isGuest ? '/guest' : `/dashboard/${userRole}`

  return (
    <header className="bg-white border-b sticky top-0 z-50 w-full shadow-sm pt-[env(safe-area-inset-top)] pt-10 md:pt-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[3.5rem] sm:min-h-[4rem] flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="https://www.fixystays.com" className="flex items-center gap-2 flex-shrink-0">
          <span className="font-black text-lg sm:text-xl text-blue-600 tracking-tight whitespace-nowrap">
            Fixy Stays
          </span>
        </a>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
          {/* User Email - Visible only on Desktop */}
          {userEmail && (
            <span className="hidden lg:inline text-xs font-medium text-gray-400 truncate max-w-[150px]">
              {userEmail}
            </span>
          )}

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Dashboard Link */}
            <Link 
              href={dashboardLink}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all group"
              title="Dashboard"
            >
              <LayoutDashboard className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">{isGuest ? 'Browse' : 'Dashboard'}</span>
            </Link>

            {/* Messages Link for Owners */}
            {userRole === 'owner' && (
              <Link 
                href="/dashboard/owner/messages"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all group"
                title="Messages"
              >
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Messages</span>
              </Link>
            )}

            {/* Support Chats Link for Admins */}
            {userRole === 'admin' && (
              <Link 
                href="/dashboard/admin/messages"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all group"
                title="Support Chats"
              >
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Support Chats</span>
              </Link>
            )}

            {/* Profile Link */}
            <Link 
              href="/guest/profile"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all group"
              title="Profile"
            >
              <User className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Profile</span>
            </Link>

            {/* Logout Action */}
            <form action="/auth/signout" method="post" className="flex-shrink-0">
              <button 
                type="submit"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all group"
                title="Logout"
              >
                <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}
