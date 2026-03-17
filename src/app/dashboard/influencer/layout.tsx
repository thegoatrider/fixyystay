import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function InfluencerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com'

  if (!user || (user.user_metadata?.role !== 'influencer' && !isSuperAdmin)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-xl text-blue-600 hover:text-blue-700 transition">
              Fixy Stays
            </Link>
          </div>
          <div className="flex items-center gap-4">
          <span>{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-gray-500 hover:text-gray-900 underline">Logout</button>
          </form>
        </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
