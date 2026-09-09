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
          // If ghost email is nikhilberde169@gmail.com, auto-create the user with riverpark password
          if (ghost.email.toLowerCase() === 'nikhilberde169@gmail.com') {
            const { data: createdUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
              email: ghost.email.toLowerCase(),
              password: 'riverpark',
              email_confirm: true,
              user_metadata: { name: 'Nikhil Berde', role: 'owner' }
            })
            if (createdUser?.user) {
              await supabaseAdmin.from('owners').update({ user_id: createdUser.user.id, name: 'Nikhil Berde' }).eq('id', ghost.id)
              report.ghosts_merged++
            } else {
              report.errors.push(`Failed to create auth user for ghost ${ghost.email}: ${createAuthError?.message}`)
            }
          } else {
            report.errors.push(`Ghost ${ghost.email} has no real user account.`)
          }
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

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient()
    const body = await req.json().catch(() => ({}))
    const email = (body.email || 'nikhilberde169@gmail.com').toLowerCase()
    const password = body.password || 'riverpark'
    const name = body.name || 'Nikhil Berde'
    const planName = body.planName || 'Business 3 Months'
    const durationMonths = body.durationMonths || 3
    const amount = body.amount || 300

    // 1. Purge existing records for this email
    const { data: existingOwners } = await supabaseAdmin.from('owners').select('id').eq('email', email)
    if (existingOwners && existingOwners.length > 0) {
      for (const o of existingOwners) {
        await supabaseAdmin.from('properties').delete().eq('owner_id', o.id)
        await supabaseAdmin.from('owner_payments').delete().eq('owner_id', o.id)
        await supabaseAdmin.from('owner_subscriptions').delete().eq('owner_id', o.id)
        await supabaseAdmin.from('owners').delete().eq('id', o.id)
      }
    }

    // Delete any existing auth user
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = users?.find(u => u.email?.toLowerCase() === email)
    if (existingAuthUser) {
      await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id)
    }

    // 2. Create fresh auth user
    const { data: newAuthData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'owner'
      }
    })

    if (authError || !newAuthData?.user) {
      return NextResponse.json({ success: false, error: authError?.message || 'Failed to create auth user' }, { status: 500 })
    }

    const userId = newAuthData.user.id

    // 3. Insert owner
    const { data: newOwner, error: ownerError } = await supabaseAdmin.from('owners').insert({
      user_id: userId,
      name,
      email
    }).select('id').single()

    if (ownerError || !newOwner) {
      return NextResponse.json({ success: false, error: ownerError?.message || 'Failed to create owner profile' }, { status: 500 })
    }

    // 4. Insert active subscription
    const endDate = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin.from('owner_subscriptions').insert({
      owner_id: newOwner.id,
      plan_name: planName,
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: endDate
    })

    // 5. Insert payment log
    await supabaseAdmin.from('owner_payments').insert({
      owner_id: newOwner.id,
      amount,
      payment_method: 'Razorpay',
      payment_ref: `manual_fix_${Date.now()}`,
      plan_duration_months: durationMonths
    })

    return NextResponse.json({
      success: true,
      message: `Account purged and recreated successfully for ${email}`,
      user: {
        id: userId,
        email,
        name,
        owner_id: newOwner.id,
        plan_name: planName,
        end_date: endDate
      }
    })
  } catch (err: any) {
    console.error('Repair POST Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
