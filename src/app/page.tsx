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
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-xl text-blue-600 hover:text-blue-700 transition">
              Fixy Stays
            </Link>
            <Link href="/blog" className="hidden sm:block font-bold text-gray-400 hover:text-blue-600 transition">
              Blog
            </Link>
          </div>
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
      <footer className="w-full bg-white border-t">
        {/* Social + Support bar */}
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Follow us</span>
            {/* Instagram */}
            <a
              href="https://www.instagram.com/fixystays"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fixy Stays on Instagram"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-400 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            {/* Facebook */}
            <a
              href="https://www.facebook.com/fixystays"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fixy Stays on Facebook"
              className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/company/fixystays"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fixy Stays on LinkedIn"
              className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>

          {/* WhatsApp Support */}
          <a
            href="https://wa.me/917506288907?text=Hi%2C%20I%20need%20help%20with%20Fixy%20Stays!"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Help & Support
          </a>
        </div>

        {/* Copyright */}
        <div className="border-t py-3 text-center text-xs text-gray-400">
          © 2025 Fixy Stays · Alibag's trusted property booking platform
        </div>
      </footer>
    </div>
  )
}

