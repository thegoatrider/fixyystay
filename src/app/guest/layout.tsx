import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function GuestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10 w-full px-6 py-4 flex items-center justify-between shadow-sm">
        <Link href="/" className="font-bold text-xl text-blue-600 hover:text-blue-700 transition">
          Fixy Stays
        </Link>
        <div className="flex gap-4 items-center text-sm">
          {user ? (
            <div className="flex items-center gap-4">
              <span>{user.email}</span>
              <Link href={`/dashboard/${user.user_metadata?.role || 'guest'}`} className="hover:text-blue-600">
                Dashboard
              </Link>
              <form action="/auth/signout" method="post">
                <button className="text-gray-500 hover:text-gray-900 underline">Logout</button>
              </form>
            </div>
          ) : (
            <div className="flex gap-4 items-center">
              <Link href="/login" className="hover:text-blue-600 font-medium">Log in</Link>
              <Link href="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Sign up</Link>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
