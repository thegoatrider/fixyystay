import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert, LogOut } from 'lucide-react'

export default async function PoliceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'police') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/police" className="flex items-center gap-3 text-blue-900">
              <div className="bg-blue-900 p-2 rounded-xl text-white">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="font-black tracking-tight text-xl hidden md:block">Law Enforcement Hub</span>
            </Link>
            <nav className="flex gap-4">
              <Link href="/dashboard/police" className="text-sm font-bold text-gray-500 hover:text-blue-900">Dashboard</Link>
              <Link href="/dashboard/police/messages" className="text-sm font-bold text-gray-500 hover:text-blue-900">Messages</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">Official Access Only</span>
             <form action="/auth/signout" method="post">
               <button type="submit" className="text-gray-400 hover:text-red-600 transition-colors p-2">
                 <LogOut className="w-5 h-5" />
               </button>
             </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
        {children}
      </main>
      <footer className="bg-white border-t py-6 print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">
            Confidential Platform Data • Unauthorized access is strictly prohibited
          </p>
        </div>
      </footer>
    </div>
  )
}
