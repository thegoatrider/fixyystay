'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { Resend } from 'resend'

export async function deleteLoggedInAccountAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized: No active session found.' }
    }

    const userId = user.id
    const email = user.email || ''
    const supabaseAdmin = createAdminClient()

    // 1. Delete associated owner record (which will cascade-delete properties, bookings, etc.)
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (owner) {
      const { error: ownerErr } = await supabaseAdmin
        .from('owners')
        .delete()
        .eq('id', owner.id)
      if (ownerErr) throw ownerErr
    }

    // 2. Delete associated influencer record
    await supabaseAdmin
      .from('influencers')
      .delete()
      .eq('user_id', userId)

    // 3. Delete auth user record itself
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authErr) throw authErr

    // 4. Sign out
    await supabase.auth.signOut()

    // 5. Notify admin about the deletion via Resend
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'FixStay <bookings@fixstay.com>',
        to: ['bookings@fixstay.com', 'superadmin@fixstay.com'],
        subject: `Account Permanently Deleted: ${email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #dc2626;">Account Permanently Deleted</h2>
            <p>The user with email <strong>${email}</strong> has deleted their account from the app.</p>
            <p>All associated properties, leads, and payment records have been deleted via database cascading.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">FixStay Security Logs</p>
          </div>
        `
      })
    }

    return { success: true }
  } catch (err: any) {
    console.error('Delete account error:', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}

interface PublicDeletionRequest {
  email: string
  name: string
  phone?: string
  accountType: string
  reason?: string
}

export async function submitPublicDeletionRequestAction(data: PublicDeletionRequest) {
  try {
    const { email, name, phone, accountType, reason } = data

    if (!email || !name || !accountType) {
      return { success: false, error: 'Email, Name, and Account Type are required.' }
    }

    const supabaseAdmin = createAdminClient()

    // 1. Insert request into database
    const { error: dbErr } = await supabaseAdmin
      .from('account_deletion_requests')
      .insert({
        email,
        name,
        phone: phone || null,
        account_type: accountType,
        reason: reason || null,
        status: 'pending'
      })

    // Note: If table does not exist or has migration issue, we catch it but still proceed with email notification!
    if (dbErr) {
      console.warn('DB insertion failed for deletion request, proceeding with email notification...', dbErr.message)
    }

    // 2. Send email to admins
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'FixStay Support <bookings@fixstay.com>',
        to: ['bookings@fixstay.com', 'superadmin@fixstay.com'],
        subject: `Account Deletion Request: ${email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">New Account Deletion Request</h2>
            <p>A request to delete an account and its associated data has been submitted from the web portal.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${phone || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Account Type:</strong> ${accountType}</p>
              <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason || 'Not specified'}</p>
            </div>
            <p>Please log in to your database panel or auth dashboard to process this request.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">FixStay - Account Safety Portal</p>
          </div>
        `
      })
    }

    return { success: true }
  } catch (err: any) {
    console.error('Submit deletion request error:', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}
