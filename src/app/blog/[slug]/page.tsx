import { blogPosts } from '../data'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, Calendar, User, Tag } from 'lucide-react'

export async function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = blogPosts.find(p => p.slug === slug)
  if (!post) return {}
  return {
    title: post.title + ' | Fixy Stays',
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
    }
  }
}

function renderMarkdown(content: string) {
  const lines = content.trim().split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-2xl font-bold text-gray-900 mt-10 mb-4">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-xl font-bold text-gray-800 mt-8 mb-3">{line.slice(4)}</h3>)
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="my-8 border-gray-200" />)
    } else if (line.startsWith('| ')) {
      // Table
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const headers = tableLines[0].split('|').filter(Boolean).map(h => h.trim())
      const rows = tableLines.slice(2).map(r => r.split('|').filter(Boolean).map(c => c.trim()))
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-6">
          <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-blue-50">
              <tr>{headers.map((h, j) => <th key={j} className="px-4 py-3 font-bold text-gray-700">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, j) => (
                <tr key={j} className="hover:bg-gray-50">
                  {row.map((cell, k) => <td key={k} className="px-4 py-3 text-gray-600">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (line.startsWith('- **')) {
      // Bold bullet
      const match = line.match(/^- \*\*(.+?)\*\* — (.+)$/)
      if (match) {
        elements.push(<li key={i} className="mb-2 text-gray-600"><strong className="text-gray-900">{match[1]}</strong> — {match[2]}</li>)
      } else {
        elements.push(<li key={i} className="mb-2 text-gray-600">{line.slice(2)}</li>)
      }
    } else if (line.startsWith('- ')) {
      elements.push(<li key={i} className="mb-2 text-gray-600">{line.slice(2)}</li>)
    } else if (line.match(/^\*\*(.+)\*\*$/)) {
      elements.push(<p key={i} className="font-bold text-gray-900 mt-4">{line.replace(/\*\*/g, '')}</p>)
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-3" />)
    } else {
      // Inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      const rendered = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>
        }
        // Inline link
        const linkMatch = part.match(/\[(.+?)\]\((.+?)\)/)
        if (linkMatch) {
          return <Link key={j} href={linkMatch[2]} className="text-blue-600 hover:underline font-medium">{linkMatch[1]}</Link>
        }
        return part
      })
      elements.push(<p key={i} className="text-gray-600 leading-relaxed">{rendered}</p>)
    }
    i++
  }
  return <>{elements}</>
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = blogPosts.find(p => p.slug === slug)
  if (!post) notFound()

  const otherPosts = blogPosts.filter(p => p.slug !== slug)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Fixy Stays
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 md:p-12 text-white mb-10 text-center">
          <div className="text-6xl mb-6">{post.coverEmoji}</div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-200 bg-white/20 px-3 py-1 rounded-full">{post.category}</span>
          <h1 className="text-2xl md:text-4xl font-extrabold mt-4 leading-tight">{post.title}</h1>
          <p className="text-blue-100 mt-4 text-lg leading-relaxed">{post.excerpt}</p>
          <div className="flex justify-center flex-wrap gap-4 mt-6 text-sm text-blue-200">
            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {post.author}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {post.date}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {post.readTime}</span>
          </div>
        </div>

        {/* Content */}
        <article className="bg-white rounded-2xl shadow-sm border p-6 md:p-10 prose-custom">
          {renderMarkdown(post.content)}
        </article>

        {/* CTA */}
        <div className="mt-10 bg-blue-600 rounded-2xl p-8 text-white text-center">
          <p className="text-xl font-bold mb-2">Ready to book your Alibag stay?</p>
          <p className="text-blue-100 mb-6">Browse verified properties — rooms, cottages, and private villas.</p>
          <Link href="/guest" className="inline-block bg-white text-blue-600 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition">
            Browse Properties →
          </Link>
        </div>

        {/* Other Posts */}
        {otherPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">More from the Blog</h2>
            <div className="grid gap-4">
              {otherPosts.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="bg-white border rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition group">
                  <span className="text-3xl">{p.coverEmoji}</span>
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{p.category}</span>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition mt-1">{p.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
