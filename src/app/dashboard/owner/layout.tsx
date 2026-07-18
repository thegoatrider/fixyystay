import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/DashboardHeader'
import SupportWidget from '@/components/SupportWidget'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com'

  if (!user || (user.user_metadata?.role !== 'owner' && !isSuperAdmin)) {
    redirect('/')
  }

  const role = isSuperAdmin ? 'owner' : (user.user_metadata?.role || 'owner')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader userEmail={user.email} userRole={role} />
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 pb-24 sm:p-6 sm:pb-24 md:p-8 md:pb-24">
        {children}
      </main>
      <SupportWidget />
    </div>
  )
}
