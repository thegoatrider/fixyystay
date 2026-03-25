import { createClient } from '@/utils/supabase/server'
import { DashboardHeader } from '@/components/DashboardHeader'

export default async function GuestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader userEmail={user?.email} userRole={user?.user_metadata?.role || 'guest'} />
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
