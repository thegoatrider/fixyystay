import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'

import { HomeSearch } from '@/components/HomeSearch'

export default async function Index() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex-1 w-full flex flex-col items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
          <Link href="/" className="font-bold text-xl text-blue-600 hover:text-blue-700 transition">
            Fixy Stays
          </Link>
          <div>
            {user ? (
              <div className="flex items-center gap-4">
                Hey, {user.user_metadata?.name || user.email}!
                <form action="/auth/signout" method="post">
                  <Button variant="outline" type="submit">
                    Logout
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="px-4 py-2 border rounded-md hover:bg-gray-50">
                  Log in
                </Link>
                <Link href="/signup" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col max-w-4xl px-3 p-20 w-full mt-10">
        <main className="flex flex-col gap-10 items-center text-center w-full">
          
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-gray-900 mb-4">
            Find your perfect stay, <br className="hidden sm:block" />
            <span className="text-blue-600">in Alibag or host your own.</span>
          </h1>

          {/* Inline Search Card */}
          <HomeSearch />

          <div className="flex flex-col gap-4 mt-8 w-full max-w-2xl items-center">
            <div className="flex items-center gap-4 w-full my-4">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-sm text-gray-400 font-medium uppercase">Or manage the platform</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            {/* Role-specific Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Link href="/login?role=owner" className="w-full">
                <Button variant="outline" className="w-full h-auto py-4 bg-white text-sm whitespace-normal leading-tight">
                  Are you a property owner? <br/> <span className="text-blue-600 font-bold">Click here</span>
                </Button>
              </Link>
              <Link href="/login?role=influencer" className="w-full">
                <Button variant="outline" className="w-full h-auto py-4 bg-white text-sm whitespace-normal leading-tight">
                  Are you an influencer? <br/> <span className="text-blue-600 font-bold">Click here</span>
                </Button>
              </Link>
            </div>
            
            {user && (
              <div className="mt-8 border-t pt-8 w-full flex justify-center">
                <Link href={`/dashboard/${user.email === 'superadmin@fixstay.com' ? 'admin' : (user.user_metadata?.role || 'guest')}`}>
                  <Button variant="secondary" size="lg">
                    Go to your Dashboard ({user.email === 'superadmin@fixstay.com' ? 'Admin' : (user.user_metadata?.role || 'guest')})
                  </Button>
                </Link>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
