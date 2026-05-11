import { createClient } from '@/utils/supabase/server'
import AutowalaDashboardClient from './AutowalaDashboardClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AutowalaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  // 1. Get Influencer Details
  const { data: influencer } = await supabase
    .from('influencers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!influencer) {
    return <div className="p-4 text-center">Account not setup properly. Contact Admin.</div>
  }

  // 2. Get Properties for dropdown (all approved for now)
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, uid')
    .eq('approved', true)

  // 3. Get Generated Links
  const { data: links } = await supabase
    .from('influencer_links')
    .select(`*, properties(name)`)
    .eq('influencer_id', influencer.id)
    .order('created_at', { ascending: false })

  // 4. Wallet Info
  const { data: transactions } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', user.id)

  const earnings = transactions?.filter(t => t.transaction_type === 'earning').reduce((acc, t) => acc + Number(t.amount), 0) || 0
  const payouts = transactions?.filter(t => t.transaction_type === 'payout').reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0
  const walletBalance = earnings - payouts

  return (
    <AutowalaDashboardClient 
      influencer={influencer}
      properties={properties || []}
      links={links || []}
      walletBalance={walletBalance}
      earnings={earnings}
    />
  )
}
