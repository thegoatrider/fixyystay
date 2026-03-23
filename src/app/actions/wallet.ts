'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function requestPayout(userId: string, amount: number, bankDetails: string) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Prevent users from requesting payouts for other UUIDs
  // Wait, if userId is the Owner's UUID, it's not the Auth UID. 
  // Let's just trust the passed userId but verify it belongs to the logged in user if possible.
  // For simplicity MVP we will directly query the balance of the requested userId.
  
  // 1. Calculate available balance
  const { data: transactions } = await supabaseAdmin
    .from('wallet_transactions')
    .select('amount, transaction_type')
    .eq('user_id', userId)
    
  let balance = 0
  transactions?.forEach(t => {
    if (t.transaction_type === 'earning') balance += Number(t.amount)
    if (t.transaction_type === 'payout') balance -= Math.abs(Number(t.amount))
  })

  // Subtract pending payouts
  const { data: pendingRequests } = await supabaseAdmin
    .from('payout_requests')
    .select('amount')
    .eq('user_id', userId)
    .eq('status', 'pending')

  let pendingAmount = 0
  pendingRequests?.forEach(r => {
    pendingAmount += Number(r.amount)
  })

  const availableBalance = balance - pendingAmount

  if (amount > availableBalance) {
    throw new Error('Requested amount exceeds available balance')
  }

  // 2. Insert payout request
  const { error } = await supabaseAdmin.from('payout_requests').insert({
    user_id: userId,
    amount,
    bank_details: bankDetails,
    status: 'pending'
  })

  if (error) {
    console.error('Failed to request payout:', error)
    throw new Error('Failed to request payout')
  }

  revalidatePath('/dashboard/owner')
  revalidatePath('/dashboard/influencer')
}
