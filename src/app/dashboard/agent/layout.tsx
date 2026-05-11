import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, LogOut } from 'lucide-react'

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user || (user.user_metadata?.role !== 'autowala' && user.user_metadata?.role !== 'agent')) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between w-full">
          <Link href="/dashboard/agent" className="flex items-center gap-2 text-blue-600">
            <Briefcase className="w-6 h-6" />
            <span className="font-black tracking-tight text-xl text-gray-900">Travel Agent</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-gray-500 hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col gap-6">
        {children}
      </main>
    </div>
  )
}
