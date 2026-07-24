import { createClient } from '@/utils/supabase/server'
import DeleteAccountClient from './DeleteAccountClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DeleteAccountPage({ searchParams }: PageProps) {
  let user = null

  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      user = {
        email: currentUser.email || '',
        id: currentUser.id,
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve user session on deletion page', err)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative">
      <DeleteAccountClient initialUser={user} />
      
      {/* Small public footer links */}
      <div className="mt-8 text-center space-x-4 text-xs font-bold text-gray-400">
        <Link href="/" className="hover:text-blue-600 transition">Home</Link>
        <span>•</span>
        <Link href="/privacy-policy" className="hover:text-blue-600 transition">Privacy Policy</Link>
        <span>•</span>
        <Link href="/terms-and-conditions" className="hover:text-blue-600 transition">Terms & Conditions</Link>
      </div>
    </div>
  )
}
