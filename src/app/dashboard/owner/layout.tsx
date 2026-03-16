import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10 w-full px-6 py-4 flex items-center justify-between shadow-sm">
        <Link href="/dashboard/owner" className="font-bold text-xl text-blue-600 hover:text-blue-700 transition">
          FixStay Owner
        </Link>
        <div className="flex gap-4 items-center text-sm">
          <span>{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-gray-500 hover:text-gray-900 underline">Logout</button>
          </form>
        </div>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
