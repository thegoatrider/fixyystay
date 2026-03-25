import Link from 'next/link'
import { blogPosts } from './data'
import { Clock, ArrowRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl">F</div>
            <span className="font-black text-xl tracking-tight text-gray-900">Fixy Stays</span>
          </Link>
          <Link href="/guest">
            <Button variant="ghost" size="sm" className="font-bold text-blue-600">Find Stays</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <Link href="/" className="text-sm font-bold text-gray-400 hover:text-blue-600 flex items-center gap-1 mb-4 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Home
            </Link>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Alibag Travel Blog</h1>
            <p className="text-gray-500 mt-2 text-lg">Your ultimate guide to planning the perfect Alibag escape.</p>
          </div>

          <div className="grid gap-8">
            {blogPosts.map(post => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col md:flex-row"
              >
                {/* Visual Area */}
                <div className="md:w-1/3 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-12 overflow-hidden">
                  <span className="text-7xl group-hover:scale-110 transition-transform duration-500">{post.coverEmoji}</span>
                </div>

                {/* Content Area */}
                <div className="md:w-2/3 p-8 flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      {post.category}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3 leading-tight">
                    {post.title}
                  </h2>
                  <p className="text-gray-500 text-base leading-relaxed mb-6 line-clamp-2">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto flex items-center gap-2 text-blue-600 font-bold group-hover:gap-3 transition-all">
                    Read Story <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 bg-blue-600 rounded-3xl p-10 text-center text-white shadow-2xl shadow-blue-200">
            <h3 className="text-2xl font-black mb-2">Ready for your Alibag Trip?</h3>
            <p className="text-blue-100 mb-6 font-medium">Browse our hand-picked collection of premium villas and rooms.</p>
            <Link href="/guest">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-50 rounded-full px-8 h-14 text-lg font-black shadow-xl shadow-blue-900/20">
                Explore Properties
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer Placeholder for consistency */}
      <footer className="bg-white border-t py-8 text-center text-sm text-gray-400">
        © 2025 Fixy Stays · Built for Alibag
      </footer>
    </div>
  )
}
