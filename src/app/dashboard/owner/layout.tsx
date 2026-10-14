import { createClient } from '@/utils/supabase/server'
import { isSuperAdminUser, getEffectiveUserRole } from '@/utils/supabase/auth-roles'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/DashboardHeader'
import SupportWidget from '@/components/SupportWidget'
import OwnerSidebar from '@/components/OwnerSidebar'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isSuperAdmin = isSuperAdminUser(user)
  const role = isSuperAdmin ? 'owner' : getEffectiveUserRole(user)

  if (!user || (role !== 'owner' && !isSuperAdmin)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row w-full">
      <OwnerSidebar userEmail={user?.email} userRole={role} />
      
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile Header (Hidden on tablet/desktop sidebar mode) */}
        <div className="md:hidden">
          <DashboardHeader userEmail={user?.email} userRole={role} />
        </div>
        
        {/* Main Dashboard Panel Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 pb-24 sm:p-6 sm:pb-24 md:p-8 md:pb-8 min-w-0">
          {children}
        </main>
      </div>
      <SupportWidget />
    </div>
  )
}

