import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/DashboardHeader'

// Default Admin Layout
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com'

  if (!user || (user.user_metadata?.role !== 'admin' && !isSuperAdmin)) {
    redirect('/')
  }

  const role = isSuperAdmin ? 'admin' : (user.user_metadata?.role || 'admin')

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <DashboardHeader userEmail={user.email} userRole={role} />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
