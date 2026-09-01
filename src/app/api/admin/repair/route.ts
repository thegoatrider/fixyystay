import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    const report = {
      ghosts_merged: 0,
      subscriptions_recovered: 0,
      properties_relinked: 0,
      errors: [] as string[]
    }

    // 1. Merge Ghost Accounts
    // Find owners with no user_id (ghosts created by payment webhook case mismatch)
    const { data: ghosts, error: ghostError } = await supabaseAdmin
      .from('owners')
      .select('id, email, name')
      .is('user_id', null)

    if (ghostError) report.errors.push(`Ghost fetch error: ${ghostError.message}`)
    
    if (ghosts && ghosts.length > 0) {
      for (const ghost of ghosts) {
        // Find real owner with same email (case-insensitive)
        const { data: realOwner } = await supabaseAdmin
          .from('owners')
          .select('id')
          .eq('email', ghost.email.toLowerCase())
          .not('user_id', 'is', null)
          .maybeSingle()

        if (realOwner) {
          // Re-link payments
          await supabaseAdmin.from('owner_payments').update({ owner_id: realOwner.id }).eq('owner_id', ghost.id)
          // Re-link subscriptions
          await supabaseAdmin.from('owner_subscriptions').update({ owner_id: realOwner.id }).eq('owner_id', ghost.id)
          // Re-link properties
          await supabaseAdmin.from('properties').update({ owner_id: realOwner.id }).eq('owner_id', ghost.id)
          
          // Delete ghost
          await supabaseAdmin.from('owners').delete().eq('id', ghost.id)
          report.ghosts_merged++
        } else {
          report.errors.push(`Ghost ${ghost.email} has no real user account.`)
        }
      }
    }

    // 2. Recover Missing Subscriptions
    // Find all paid payments
    const { data: payments, error: payError } = await supabaseAdmin
      .from('owner_payments')
      .select('id, owner_id, email, amount, payment_date, payment_method, status, transaction_id, razorpay_order_id')
      .in('status', ['paid', 'completed'])

    if (payError) report.errors.push(`Payments fetch error: ${payError.message}`)

    if (payments) {
      for (const payment of payments) {
        // Find owner ID (either from the payment or by email)
        let ownerIdToUse = payment.owner_id
        if (!ownerIdToUse) {
           const { data: owner } = await supabaseAdmin.from('owners').select('id').eq('email', payment.email.toLowerCase()).maybeSingle()
           if (owner) ownerIdToUse = owner.id
        }

        if (ownerIdToUse) {
          // Check if subscription exists
          const { data: sub } = await supabaseAdmin
            .from('owner_subscriptions')
            .select('id')
            .eq('owner_id', ownerIdToUse)
            .maybeSingle()

          if (!sub) {
            // No subscription found, run the upgrade logic!
            const { verifyAndUpgrade } = await import('@/app/pricing/business/actions')
            const result = await verifyAndUpgrade(payment.razorpay_order_id)
            if (result.success) {
              report.subscriptions_recovered++
            } else {
              report.errors.push(`Failed to recover subscription for ${payment.email}: ${result.error}`)
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, report })

  } catch (err: any) {
    console.error('Repair API Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
