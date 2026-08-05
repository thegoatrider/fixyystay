import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import OwnerDashboardClient from './OwnerDashboardClient'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  
  // 1. Get user & session info on SSR for security and speed
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = user?.email === 'superadmin@fixstay.com' || user?.user_metadata?.role === 'admin'
  
  // 2. Initial owner lookup (fast)
  let { data: owner } = await supabase.from('owners').select('id, created_at').eq('user_id', user?.id).maybeSingle()
  
  if (!owner && user?.email) {
    const supabaseAdmin = createAdminClient()
    const lowerEmail = user.email.toLowerCase()
    
    // Self-healing step 1: try to link by email if row exists
    const { data: updatedOwner } = await supabaseAdmin
      .from('owners')
      .update({ user_id: user.id })
      .eq('email', lowerEmail)
      .select('id, created_at')
      .maybeSingle()
    
    if (updatedOwner) {
      owner = updatedOwner
    } else {
      // Self-healing step 2: row doesn't exist at all, create it!
      const { data: newOwner } = await supabaseAdmin
        .from('owners')
        .insert({
          user_id: user.id,
          email: lowerEmail,
          name: user.user_metadata?.name || user.email.split('@')[0],
          phone_number: ''
        })
        .select('id, created_at')
        .single()
        
      if (newOwner) owner = newOwner
    }
  }

  // 3. Fetch Google token status
  let hasGoogleDrive = false
  let googleEmail: string | null = null
  if (owner) {
    const { data: googleToken } = await supabase
      .from('owner_google_tokens')
      .select('google_email')
      .eq('owner_id', owner.id)
      .maybeSingle()
    hasGoogleDrive = !!googleToken?.google_email
    googleEmail = googleToken?.google_email || null
  }
  
  // 4. Render the Client Dashboard
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OwnerDashboardClient 
        userId={user.id} 
        email={user.email || ''}
        ownerId={owner?.id || ''} 
        isSuperAdmin={isSuperAdmin} 
        hasGoogleDrive={hasGoogleDrive}
        googleEmail={googleEmail}
      />
    </Suspense>
  )
}
