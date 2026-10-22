import 'server-only'
import { SupabaseClient } from '@supabase/supabase-js'

export interface EnsureOwnerParams {
  userId?: string | null
  email: string
  name: string
  phone?: string | null
}

export interface EnsureOwnerResult {
  owner: {
    id: string
    user_id: string | null
    name: string
    email: string
    phone: string | null
  }
  created: boolean
}

/**
 * Single source of truth for creating or linking an owner record in FixyStays.
 * - Enforces case-insensitive email matching.
 * - Never produces duplicate rows.
 * - Updates missing user_id or phone on existing rows.
 * - Always handles errors and logs appropriately.
 */
export async function ensureOwner(
  supabaseAdmin: SupabaseClient,
  params: EnsureOwnerParams
): Promise<EnsureOwnerResult> {
  const normalizedEmail = params.email.toLowerCase().trim()
  const cleanPhone = params.phone ? params.phone.trim() : null
  const cleanName = params.name ? params.name.trim() : normalizedEmail.split('@')[0]

  // 1. Try to find existing owner by user_id first (if provided)
  let existingOwner: any = null
  if (params.userId) {
    const { data, error } = await supabaseAdmin
      .from('owners')
      .select('id, user_id, name, email, phone')
      .eq('user_id', params.userId)
      .maybeSingle()

    if (error) {
      console.error('[ensureOwner] Error querying by user_id:', error)
    }
    existingOwner = data
  }

  // 2. If not found by user_id, find by normalized lower(email)
  if (!existingOwner) {
    const { data, error } = await supabaseAdmin
      .from('owners')
      .select('id, user_id, name, email, phone')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (error) {
      console.error('[ensureOwner] Error querying by email:', error)
    }
    existingOwner = data
  }

  // 3. If found, ensure user_id, phone, and name are updated
  if (existingOwner) {
    const updates: Record<string, any> = {}
    if (params.userId && !existingOwner.user_id) {
      updates.user_id = params.userId
    }
    if (cleanPhone && !existingOwner.phone) {
      updates.phone = cleanPhone
    }
    if (cleanName && (!existingOwner.name || existingOwner.name === 'Partner')) {
      updates.name = cleanName
    }

    if (Object.keys(updates).length > 0) {
      const { data: updatedOwner, error: updateErr } = await supabaseAdmin
        .from('owners')
        .update(updates)
        .eq('id', existingOwner.id)
        .select('id, user_id, name, email, phone')
        .single()

      if (updateErr) {
        console.error('[ensureOwner] Failed to update owner attributes:', updateErr)
      } else if (updatedOwner) {
        existingOwner = updatedOwner
      }
    }

    return {
      owner: existingOwner,
      created: false,
    }
  }

  // 4. Owner does not exist, insert fresh record
  const { data: newOwner, error: insertError } = await supabaseAdmin
    .from('owners')
    .insert([
      {
        user_id: params.userId || null,
        email: normalizedEmail,
        name: cleanName,
        phone: cleanPhone,
      },
    ])
    .select('id, user_id, name, email, phone')
    .single()

  if (insertError) {
    console.error('[ensureOwner] Failed to insert owner record:', insertError)
    // Retry lookup in case of parallel insertion
    const { data: retryOwner } = await supabaseAdmin
      .from('owners')
      .select('id, user_id, name, email, phone')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (retryOwner) {
      return { owner: retryOwner, created: false }
    }

    throw new Error(`Failed to create owner profile: ${insertError.message}`)
  }

  return {
    owner: newOwner,
    created: true,
  }
}
