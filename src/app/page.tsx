import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { HomeSearch } from '@/components/HomeSearch'
import { blogPosts } from './blog/data'
import { Clock, ArrowRight } from 'lucide-react'

export default async function Index() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex-1 w-full flex flex-col items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 pt-[env(safe-area-inset-top)] min-h-16">
        <div className="w-full max-w-4xl flex justify-between items-center px-4 py-3 text-sm">
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

      <div className="flex-1 flex flex-col max-w-4xl px-4 py-12 md:p-20 w-full mt-4 md:mt-10">
        <main className="flex flex-col gap-10 items-center text-center w-full">
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-4 px-2">
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

      {/* ── Blog Section ── */}
      <section className="w-full bg-gray-50 border-t py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Blog</span>
              <h2 className="text-3xl font-extrabold text-gray-900 mt-3">Alibag Travel Guides</h2>
              <p className="text-gray-500 mt-1">Tips, guides, and inspiration for your next Alibag escape.</p>
            </div>
            <Link href="/blog" className="hidden md:flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-sm">
              All posts <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {blogPosts.map(post => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Card Hero */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 flex items-center justify-center">
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{post.coverEmoji}</span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{post.category}</span>
                  <h3 className="font-bold text-gray-900 text-lg mt-2 mb-2 group-hover:text-blue-600 transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 flex-1">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </span>
                    <span className="text-sm font-semibold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read more <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8 md:hidden">
            <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 font-semibold">
              View all posts <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-white border-t py-8 text-center text-sm text-gray-400">
        © 2025 Fixy Stays · Alibag's trusted property booking platform
      </footer>
    </div>
  )
}

