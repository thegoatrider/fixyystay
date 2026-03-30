import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'
import { getUserProfile, getUserBookings } from './actions'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Initial fetch for server-side hydration (or pass it down)
  const profileResponse = await getUserProfile()
  const bookingsResponse = await getUserBookings()

  if (profileResponse.error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-red-50 border border-red-100 rounded-2xl max-w-md">
          <p className="text-red-600 font-bold mb-4">Error loading profile</p>
          <p className="text-sm text-red-500">{profileResponse.error}</p>
          <a href="/guest" className="text-sm underline mt-4 block">Return home</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 lg:py-16">
      <h1 className="text-4xl font-black text-gray-900 mb-8 tracking-tight">My Profile</h1>
      <ProfileClient 
        initialProfile={profileResponse.data} 
        initialBookings={bookingsResponse.data || { upcoming: [], past: [] }} 
      />
    </div>
  )
}
