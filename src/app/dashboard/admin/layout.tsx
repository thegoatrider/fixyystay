import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10 w-full px-6 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between shadow-sm">
        <Link href="/" className="font-bold text-xl text-blue-600 hover:text-blue-700 transition">
          Fixy Stays
        </Link>
        <div className="flex gap-4 items-center text-sm">
          <span>{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-gray-500 hover:text-gray-900 underline">Logout</button>
          </form>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
