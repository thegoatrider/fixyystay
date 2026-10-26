'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient, purgeUserAndRecordsByEmail, findAuthUserByEmail } from '@/utils/supabase/admin'
import { isSuperAdminUser } from '@/utils/supabase/auth-roles'
import { revalidatePath } from 'next/cache'
import { calculateMonthlyFee } from '@/lib/pricing'

export async function approveProperty(propertyId: string) {
  try {
    const supabase = await createClient()
    
    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(user)) {
      return { error: 'Unauthorized' }
    }

    const supabaseAdmin = createAdminClient()

    // Verify property and payment/subscription status
    const { data: propData } = await supabaseAdmin
      .from('properties')
      .select('id, uid, owner_id, is_guest_hub_only')
      .eq('id', propertyId)
      .maybeSingle()

    if (!propData) {
      return { error: 'Property not found.' }
    }

    const nowIso = new Date().toISOString()
    let isPropertyPaid = false

    // Check active property_subscriptions
    const { data: sub } = await supabaseAdmin
      .from('property_subscriptions')
      .select('id, status, end_date')
      .eq('property_id', propertyId)
      .eq('status', 'active')
      .gt('end_date', nowIso)
      .limit(1)
      .maybeSingle()

    if (sub) {
      isPropertyPaid = true
    } else if (propData.is_guest_hub_only) {
      const { data: hub } = await supabaseAdmin
        .from('guest_hub_settings')
        .select('id')
        .eq('property_id', propertyId)
        .eq('subscription_status', 'active')
        .maybeSingle()

      if (hub) isPropertyPaid = true
    } else if (propData.owner_id) {
      // Legacy fallback for old owner_subscriptions
      const { data: legacySub } = await supabaseAdmin
        .from('owner_subscriptions')
        .select('status, end_date')
        .eq('owner_id', propData.owner_id)
        .eq('status', 'active')
        .gt('end_date', nowIso)
        .maybeSingle()

      if (legacySub) isPropertyPaid = true
    }

    if (!isPropertyPaid) {
      return { error: 'Cannot approve property: No active subscription found for this property.' }
    }

    // Keep existing UID if present, or generate a collision-safe identifier
    let uid = propData.uid
    if (!uid) {
      let attempts = 0
      while (attempts < 10) {
        const candidate = 'ALB-' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()
        // Check if this UID already exists in the database
        const { data: existing } = await supabaseAdmin
          .from('properties')
          .select('id')
          .eq('uid', candidate)
          .maybeSingle()
        if (!existing) { uid = candidate; break }
        attempts++
      }
      if (!uid) return { error: 'Failed to generate a unique property UID after 10 attempts' }
    }

    const { error } = await supabaseAdmin
      .from('properties')
      .update({ 
        approved: true, 
        approval_status: 'approved',
        rejection_reason: null,
        uid 
      })
      .eq('id', propertyId)

    if (error) {
      console.error('Failed to approve property', error)
      return { error: 'Failed to approve property' }
    }

    revalidatePath('/dashboard/admin')
    revalidatePath(`/dashboard/admin/properties/${propertyId}`)
    revalidatePath('/dashboard/owner')
    revalidatePath('/guest')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function rejectProperty(propertyId: string, reason: string) {
  try {
    const supabase = await createClient()
    
    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(user)) {
      return { error: 'Unauthorized' }
    }

    if (!reason || !reason.trim()) {
      return { error: 'A rejection reason is mandatory.' }
    }

    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin
      .from('properties')
      .update({
        approved: false,
        approval_status: 'rejected',
        rejection_reason: reason.trim()
      })
      .eq('id', propertyId)

    if (error) {
      console.error('Failed to reject property', error)
      return { error: 'Failed to reject property' }
    }

    revalidatePath('/dashboard/admin')
    revalidatePath(`/dashboard/admin/properties/${propertyId}`)
    revalidatePath('/dashboard/owner')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function deleteProperty(propertyId: string) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(user)) {
      return { error: 'Unauthorized' }
    }

    // 1. Fetch images to delete from storage
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('image_url, image_urls')
      .eq('id', propertyId)
      .single()

    const { data: rooms } = await supabaseAdmin
      .from('rooms')
      .select('image_url')
      .eq('property_id', propertyId)

    const imagesToDelete: string[] = []
    if (property?.image_url) imagesToDelete.push(property.image_url)
    if (property?.image_urls) imagesToDelete.push(...property.image_urls)
    
    rooms?.forEach(room => {
      if (room.image_url) imagesToDelete.push(room.image_url)
      if ((room as any).image_urls) imagesToDelete.push(...(room as any).image_urls)
    })

    const filePaths = imagesToDelete
      .map(url => {
        try {
          const parts = url.split('/property_images/')
          return parts.length > 1 ? parts[1] : null
        } catch {
          return null
        }
      })
      .filter(Boolean) as string[]

    // 2. Delete files from storage
    if (filePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('property_images')
        .remove(filePaths)
      if (storageError) console.error('Storage cleanup failed (non-fatal):', storageError)
    }

    // 3. Delete from DB (cascaded)
    const { error } = await supabaseAdmin
      .from('properties')
      .delete()
      .eq('id', propertyId)

    if (error) {
      console.error('Failed to delete property', error)
      return { error: 'Failed to delete property' }
    }

    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function assignInfluencer(propertyId: string, influencerId: string) {
  try {
    const supabase = await createClient()

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(user)) {
      return { error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('influencer_properties')
      .insert([{ property_id: propertyId, influencer_id: influencerId }])

    if (error) {
      if (error.code === '23505') {
        return { error: 'Influencer already assigned to this property' }
      }
      console.error('Failed to assign influencer', error)
      return { error: 'Failed to assign influencer' }
    }

    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

// FormData version - safe to pass as prop to client components
export async function assignInfluencerFromForm(formData: FormData) {
  const propertyId = formData.get('propertyId') as string
  const influencerId = formData.get('influencerId') as string
  if (!propertyId || !influencerId) return { error: 'Missing IDs' }
  return await assignInfluencer(propertyId, influencerId)
}


export async function toggleFeatured(propertyId: string, currentValue: boolean) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(user)) {
      return { error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('properties')
      .update({ featured: !currentValue })
      .eq('id', propertyId)

    if (error) {
      console.error('Failed to toggle featured', error)
      return { error: 'Failed to update featured status' }
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/guest')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function approveInfluencer(formData: FormData) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(user)) {
      return { error: 'Unauthorized' }
    }

    const influencerId = formData.get('influencerId') as string
    const commissionRate = parseFloat(formData.get('commissionRate') as string) || 0
    const userId = formData.get('userId') as string || null

    const { error } = await supabaseAdmin
      .from('influencers')
      .update({ 
        approved: true, 
        commission_rate: commissionRate,
        user_id: userId
      })
      .eq('id', influencerId)

    if (error) {
      console.error('Failed to approve influencer', error)
      return { error: 'Failed to approve influencer' }
    }

    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function rejectInfluencer(influencerId: string) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(user)) {
      return { error: 'Unauthorized' }
    }

    const { error } = await supabaseAdmin
      .from('influencers')
      .delete()
      .eq('id', influencerId)

    if (error) {
      console.error('Failed to reject influencer', error)
      return { error: 'Failed to reject influencer' }
    }

    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function processPayout(requestId: string, action: 'approve' | 'reject') {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(user)) {
      return { error: 'Unauthorized' }
    }

    // 1. Fetch the request
    const { data: request } = await supabaseAdmin.from('payout_requests').select('id, user_id, amount, status, bank_details').eq('id', requestId).single()
    if (!request || request.status !== 'pending') {
      return { error: 'Invalid or already processed request' }
    }

    // 2. Update status
    const newStatus = action === 'approve' ? 'completed' : 'rejected'
    await supabaseAdmin.from('payout_requests').update({ status: newStatus }).eq('id', requestId)

    // 3. If approved, lock the money by deducting from wallet ledger
    if (action === 'approve') {
      await supabaseAdmin.from('wallet_transactions').insert({
        user_id: request.user_id,
        amount: -Math.abs(request.amount),
        transaction_type: 'payout',
        description: `Manual Payout Processed to ${request.bank_details}`
      })
    }

    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}


export async function onboardPartner(formData: FormData) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    // Verify admin
    const { data: { user: admin } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(admin)) {
      return { error: 'Unauthorized' }
    }

    const name = formData.get('name') as string
    const email = (formData.get('email') as string || '').toLowerCase().trim()
    const phone = ((formData.get('phone') as string) || '').trim()
    const planName = (formData.get('plan') as string) || '1 Month'
    const amount = parseFloat(formData.get('amount') as string) || 0
    const paymentRef = (formData.get('paymentRef') as string) || `ADMIN_MANUAL_${Date.now()}`
    const password = (formData.get('password') as string) || 'FixyOwner@2026'
    const roomCount = parseInt(formData.get('roomCount') as string) || 5

    if (!name || !email) return { error: 'Name and Email are required.' }

    const cleanPhone = phone.replace(/\D/g, '')
    if (!phone || cleanPhone.length < 10) {
      return { error: 'A valid contact/WhatsApp phone number (at least 10 digits) is mandatory.' }
    }

    // 1. Create Auth User with role 'owner' in app_metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'owner', name: name, phone: cleanPhone },
      app_metadata: { role: 'owner' }
    })

    if (authError) {
      console.error('Auth creation failed:', authError)
      return { error: `Signup failed: ${authError.message}` }
    }

    const userId = authData.user.id

    // 2. Create Owner Record
    let ownerId: string
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('owners')
      .insert({ user_id: userId, name, email, phone: cleanPhone })
      .select('id')
      .single()

    if (ownerError) {
      // Retry without phone column if not yet migrated
      const { data: fallbackOwner, error: fallbackError } = await supabaseAdmin
        .from('owners')
        .insert({ user_id: userId, name, email })
        .select('id')
        .single()

      if (fallbackError) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return { error: `Failed to create owner record: ${fallbackError.message}` }
      }
      ownerId = fallbackOwner.id
    } else {
      ownerId = owner.id
    }

    // 3. Calculate Months and Expiry Date
    const now = new Date()
    const expiryDate = new Date(now)
    let months = 1
    if (planName.includes('3 Month') || planName.includes('Quarterly')) {
      months = 3
    } else if (planName.includes('6-Month') || planName.includes('6 Month')) {
      months = 6
    } else if (planName.includes('12 Month') || planName.includes('Yearly')) {
      months = 12
    }
    expiryDate.setMonth(expiryDate.getMonth() + months)

    // Compute monthly fee from calculateMonthlyFee or fallback
    let monthlyFee = Math.round(amount / months)
    if (monthlyFee <= 0) {
      const feeRes = calculateMonthlyFee({ roomCount })
      if (feeRes.monthlyFee) {
        monthlyFee = feeRes.monthlyFee
      } else {
        monthlyFee = 99
      }
    }
    const finalAmount = amount > 0 ? amount : monthlyFee * months

    // 4. Create Initial Property
    let candidateUid = 'ALB-' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()

    const { data: prop } = await supabaseAdmin
      .from('properties')
      .insert({
        owner_id: ownerId,
        name: `${name}'s Stay`,
        type: 'multi-room property',
        city: 'Alibag',
        room_count: roomCount,
        approval_status: 'approved',
        approved: true,
        uid: candidateUid,
        helpdesk_number: cleanPhone
      })
      .select('id')
      .single()

    const propId = prop?.id

    // 5. Create property_subscriptions and owner_payments (with source: 'admin_manual')
    if (propId) {
      await supabaseAdmin
        .from('property_subscriptions')
        .insert({
          property_id: propId,
          owner_id: ownerId,
          status: 'active',
          start_date: now.toISOString(),
          end_date: expiryDate.toISOString(),
          room_count: roomCount,
          monthly_fee: monthlyFee,
          months,
          source: 'admin_manual'
        })
    }

    // Legacy backup records
    await supabaseAdmin
      .from('owner_subscriptions')
      .insert({
        owner_id: ownerId,
        plan_name: planName,
        end_date: expiryDate.toISOString(),
        status: 'active'
      })

    await supabaseAdmin
      .from('owner_payments')
      .insert({
        owner_id: ownerId,
        property_id: propId || null,
        amount: finalAmount,
        payment_method: 'Manual/Admin',
        payment_ref: paymentRef,
        status: 'paid',
        months,
        room_count: roomCount,
        monthly_fee: monthlyFee,
        plan_duration_months: months
      })

    revalidatePath('/dashboard/admin')
    return { success: true, tempPassword: password }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function onboardAgent(formData: FormData) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    // Verify admin
    const { data: { user: admin } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(admin)) {
      return { error: 'Unauthorized' }
    }

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string || 'Agent@2026'

    if (!name || !email) return { error: 'Name and Email are required.' }

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'agent', name: name }
    })

    if (authError) {
      console.error('Auth creation failed:', authError)
      return { error: `Signup failed: ${authError.message}` }
    }

    const userId = authData.user.id

    // 2. Create Influencer Record
    const { error: influencerError } = await supabaseAdmin
      .from('influencers')
      .insert({ 
        user_id: userId, 
        name, 
        email, 
        type: 'agent', 
        commission_rate: 10, 
        approved: true 
      })

    if (influencerError) {
      console.error('Influencer creation failed:', influencerError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return { error: 'Failed to create agent record.' }
    }

    revalidatePath('/dashboard/admin')
    return { success: true, tempPassword: password }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function purgeAccountAction(email: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(user)) {
      return { success: false, error: 'Unauthorized: Admin privileges required.' }
    }

    const res = await purgeUserAndRecordsByEmail(email)
    revalidatePath('/dashboard/admin')
    return res
  } catch (err: any) {
    return { success: false, error: err.message || 'Purge failed.' }
  }
}

export async function onboardPolice(formData: FormData) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Verify admin
    const { data: { user: admin } } = await supabase.auth.getUser()
    if (!isSuperAdminUser(admin)) {
      return { error: 'Unauthorized' }
    }

    const email = (formData.get('email') as string || '').toLowerCase().trim()
    const stationName = (formData.get('stationName') as string || '').trim()
    const officerName = (formData.get('officerName') as string || '').trim()
    const password = (formData.get('password') as string || 'Police@2026').trim()

    if (!email || !stationName) {
      return { error: 'Email and Police Station Name are required.' }
    }

    // 1. Create or update auth user with both user_metadata and app_metadata synced to role: 'police'
    const targetUser = await findAuthUserByEmail(supabaseAdmin, email)

    if (targetUser) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...targetUser.user_metadata,
          role: 'police',
          station_name: stationName,
          officer_name: officerName
        },
        app_metadata: {
          ...targetUser.app_metadata,
          role: 'police'
        }
      })
      if (updateError) return { error: `Failed to update police user: ${updateError.message}` }
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'police',
          station_name: stationName,
          officer_name: officerName
        },
        app_metadata: {
          role: 'police'
        }
      })
      if (authError || !authData.user) {
        return { error: `Police creation failed: ${authError?.message}` }
      }
    }

    revalidatePath('/dashboard/admin')
    return { success: true, tempPassword: password }
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function runSubscriptionExpiryRemindersAction(): Promise<import('@/utils/subscription-reminders').SubscriptionCheckResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!isSuperAdminUser(user)) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        summary: { totalActive: 0, reminders3DaySent: 0, reminders1DaySent: 0, expiredMarked: 0, trialRemindersSent: 0, logs: [] },
        error: 'Unauthorized: Only platform administrators can trigger push reminder checks.'
      }
    }

    const { executeSubscriptionRemindersCheck } = await import('@/utils/subscription-reminders')
    const result = await executeSubscriptionRemindersCheck()

    revalidatePath('/dashboard/admin')
    return result
  } catch (err: any) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      summary: { totalActive: 0, reminders3DaySent: 0, reminders1DaySent: 0, expiredMarked: 0, trialRemindersSent: 0, logs: [] },
      error: err.message || 'An unexpected error occurred while scanning subscriptions'
    }
  }
}


