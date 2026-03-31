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
    <header className="bg-white border-b sticky top-0 z-50 w-full shadow-sm pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[3.5rem] sm:min-h-[4rem] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="font-black text-lg sm:text-xl text-blue-600 tracking-tight whitespace-nowrap">
            Fixy Stays
          </span>
        </Link>

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
