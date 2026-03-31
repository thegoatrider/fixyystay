'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutDashboard, Search, User, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function BottomNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function getRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        if (user.email === 'superadmin@fixstay.com') {
          setRole('admin')
        } else {
          setRole(user.user_metadata?.role || 'guest')
        }
      }
    }
    getRole()
  }, [supabase])

  // Don't show on login/signup pages or if we can't determine role yet (optional)
  const hideOn = ['/login', '/signup']
  if (hideOn.includes(pathname)) return null

  const dashboardPath = role ? (role === 'guest' ? '/guest' : `/dashboard/${role}`) : '/login'

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <Link 
        href="/" 
        className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/' ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
      </Link>

      <Link 
        href="/guest" 
        className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/guest' ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <Search className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Explore</span>
      </Link>

      <Link 
        href={dashboardPath} 
        className={`flex flex-col items-center gap-1 transition-colors ${pathname.includes('/dashboard') ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <LayoutDashboard className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Panel</span>
      </Link>

      {role === 'owner' || role === 'influencer' ? (
        <Link 
          href={`${dashboardPath}?tab=wallet`} 
          className={`flex flex-col items-center gap-1 transition-colors ${pathname.includes('wallet') ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Wallet className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Wallet</span>
        </Link>
      ) : (
        <Link 
          href="/guest/profile" 
          className={`flex flex-col items-center gap-1 transition-colors ${pathname.includes('/profile') ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Profile</span>
        </Link>
      )}
    </nav>
  )
}
