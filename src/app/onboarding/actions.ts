'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient, findAuthUserByEmail } from '@/utils/supabase/admin'
import { ensureOwner } from '@/lib/ensure-owner'
import { generatePropertyUid } from '@/app/dashboard/owner/actions'
import { z } from 'zod'

// Domain typo list
const COMMON_EMAIL_DOMAIN_TYPOS = [
  'gmail.co',
  'gmail.cm',
  'gmai.com',
  'gamil.com',
  'gmial.com',
  'yahoo.co',
  'yaho.com',
  'hotmial.com',
  'outlok.com',
  'iclod.com',
]

// Server-side Zod Validation Schema
export const onboardingSchema = z.object({
  ownerName: z
    .string()
    .trim()
    .min(2, 'Owner full name must be at least 2 characters.'),
  phone: z
    .string()
    .trim()
    .refine((val) => {
      const clean = val.replace(/\D/g, '')
      const stripped = clean.startsWith('91') && clean.length === 12 ? clean.slice(2) : clean
      return stripped.length === 10 && /^[6-9]\d{9}$/.test(stripped)
    }, 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .refine((val) => {
      const parts = val.toLowerCase().split('@')
      if (parts.length !== 2) return false
      const domain = parts[1]
      return !COMMON_EMAIL_DOMAIN_TYPOS.includes(domain)
    }, 'Email domain appears to have a typo (e.g. did you mean @gmail.com?).'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters.'),
  propertyName: z
    .string()
    .trim()
    .min(2, 'Property name must be at least 2 characters.'),
  propertyType: z
    .string()
    .trim()
    .min(1, 'Please select a property type.'),
  fullAddress: z
    .string()
    .trim()
    .min(5, 'Full property address is required (at least 5 characters).'),
  city: z
    .string()
    .trim()
    .min(2, 'City is required.'),
  state: z
    .string()
    .trim()
    .min(2, 'State is required.'),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits.'),
  roomCount: z
    .number()
    .int()
    .min(1, 'Total number of rooms must be at least 1.')
    .max(100, 'Online onboarding supports up to 100 rooms. For larger properties, contact us.'),
  roomCategories: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Room category name is required.'),
        basePrice: z.number().min(1, 'Base price per night must be at least ₹1.'),
        capacity: z.number().int().min(1, 'Capacity must be at least 1 guest.'),
      })
    )
    .min(1, 'Please configure at least one room category.'),
  photos: z
    .array(z.string().url('Invalid image URL.'))
    .min(3, 'Please upload at least 3 photos of your property.'),
  helpdeskNumber: z.string().trim().optional(),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>

/**
 * Normalizes Indian phone number to E.164 (+91XXXXXXXXXX)
 */
function normalizeIndianPhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  const core10 = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits
  return `+91${core10}`
}

/**
 * Fetches the monthly fee from public.pricing_tiers for a given room count.
 */
export async function getMonthlyFeeForRooms(roomCount: number): Promise<{
  monthlyFee: number | null
  overLimit?: boolean
  error?: string
}> {
  if (roomCount > 100) {
    return { monthlyFee: null, overLimit: true }
  }
  if (roomCount < 1) {
    return { monthlyFee: null, error: 'Room count must be at least 1' }
  }

  const supabaseAdmin = createAdminClient()
  const { data: tier, error } = await supabaseAdmin
    .from('pricing_tiers')
    .select('monthly_fee_inr')
    .eq('active', true)
    .lte('min_rooms', roomCount)
    .gte('max_rooms', roomCount)
    .maybeSingle()

  if (error || !tier) {
    return { monthlyFee: null, error: 'No matching tier' }
  }

  return { monthlyFee: Number(tier.monthly_fee_inr) }
}

/**
 * Uploads an onboarding photo directly to public bucket 'property_images'
 */
export async function uploadOnboardingPhoto(formData: FormData) {
  try {
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) {
      return { error: 'No valid image file provided.' }
    }

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return { error: 'Image size exceeds 10MB limit.' }
    }

    const supabaseAdmin = createAdminClient()
    const rawExt = file.name && file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const fileExt = (rawExt || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
    const fileName = `onboard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('property_images')
      .upload(fileName, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('[uploadOnboardingPhoto] Storage upload error:', uploadError)
      return { error: `Upload failed: ${uploadError.message}` }
    }

    const { data: urlData } = supabaseAdmin.storage.from('property_images').getPublicUrl(fileName)
    return { success: true, url: urlData.publicUrl }
  } catch (err: any) {
    console.error('[uploadOnboardingPhoto] Exception:', err)
    return { error: err.message || 'Image upload failed' }
  }
}

/**
 * Submits the unified onboarding form:
 * - Validates inputs via Zod
 * - Creates/resumes Auth User (app_metadata role: 'owner')
 * - Creates/links Owner row via ensureOwner()
 * - Creates/resumes Property as 'draft' with room_count
 * - Populates rooms table
 * - Pre-computes monthly fee
 */
export async function submitOnboarding(data: OnboardingInput) {
  try {
    // 1. Zod Validation
    const parsed = onboardingSchema.safeParse(data)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return { error: `${firstIssue.path.join('.')}: ${firstIssue.message}` }
    }

    const val = parsed.data
    const normalizedEmail = val.email.toLowerCase().trim()
    const normalizedPhone = normalizeIndianPhone(val.phone)
    const helpdeskPhone = val.helpdeskNumber ? normalizeIndianPhone(val.helpdeskNumber) : normalizedPhone

    const supabaseAdmin = createAdminClient()

    // 2. Auth User: Create or Resume
    let userId: string | null = null
    const existingUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail)

    if (existingUser) {
      userId = existingUser.id
      // Resume existing user: update credentials and ensure owner role in app_metadata
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: val.password,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          name: val.ownerName,
          phone: normalizedPhone,
        },
        app_metadata: {
          ...(existingUser.app_metadata || {}),
          role: existingUser.app_metadata?.role || 'owner',
        },
      })

      if (updateAuthErr) {
        console.error('[submitOnboarding] Error updating existing auth user:', updateAuthErr)
      }
    } else {
      // Create fresh auth user
      const { data: newAuthData, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: val.password,
        email_confirm: true,
        user_metadata: {
          name: val.ownerName,
          phone: normalizedPhone,
        },
        app_metadata: {
          role: 'owner',
        },
      })

      if (createAuthErr || !newAuthData?.user) {
        console.error('[submitOnboarding] Auth creation failed:', createAuthErr)
        return { error: createAuthErr?.message || 'Failed to create owner account.' }
      }
      userId = newAuthData.user.id
    }

    if (!userId) {
      return { error: 'Could not associate an authentication account.' }
    }

    // 3. Ensure Owner record via single canonical helper
    const { owner } = await ensureOwner(supabaseAdmin, {
      userId,
      email: normalizedEmail,
      name: val.ownerName,
      phone: normalizedPhone,
    })

    const ownerId = owner.id

    // 4. Create or Resume Property as 'draft'
    // Check if an existing draft property exists for this owner
    const { data: existingDrafts } = await supabaseAdmin
      .from('properties')
      .select('id, uid')
      .eq('owner_id', ownerId)
      .eq('approval_status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)

    let propertyId: string | null = null
    const safeCity = val.city || 'Alibag'

    const propertyPayload = {
      name: val.propertyName,
      type: val.propertyType,
      city: safeCity,
      state: val.state,
      pincode: val.pincode,
      address: val.fullAddress,
      room_count: val.roomCount,
      helpdesk_number: helpdeskPhone,
      image_url: val.photos[0],
      images: val.photos,
      room_categories: val.roomCategories,
      approval_status: 'draft',
      approved: false,
    }

    if (existingDrafts && existingDrafts.length > 0) {
      // Resume existing draft
      propertyId = existingDrafts[0].id
      const { error: updatePropErr } = await supabaseAdmin
        .from('properties')
        .update(propertyPayload)
        .eq('id', propertyId)

      if (updatePropErr) {
        console.error('[submitOnboarding] Error updating draft property:', updatePropErr)
        return { error: `Failed to update property details: ${updatePropErr.message}` }
      }
    } else {
      // Create new draft property
      const uid = await generatePropertyUid(supabaseAdmin, safeCity)
      const { data: newProp, error: insertPropErr } = await supabaseAdmin
        .from('properties')
        .insert([
          {
            owner_id: ownerId,
            uid,
            ...propertyPayload,
          },
        ])
        .select('id')
        .single()

      if (insertPropErr || !newProp) {
        console.error('[submitOnboarding] Error inserting property:', insertPropErr)
        return { error: `Failed to create property: ${insertPropErr?.message}` }
      }
      propertyId = newProp.id
    }

    // 5. Populate rooms table
    if (propertyId) {
      // Clean previous draft rooms if resuming
      await supabaseAdmin.from('rooms').delete().eq('property_id', propertyId)

      const roomsToInsert = val.roomCategories.map((cat) => ({
        property_id: propertyId,
        name: cat.name,
        category: cat.name,
        base_price: cat.basePrice,
        capacity: cat.capacity,
        price_bucket:
          cat.basePrice <= 2500
            ? 'Under ₹2,500'
            : cat.basePrice <= 5000
            ? '₹2,500 - ₹5,000'
            : '₹5,000+',
      }))

      const { error: roomsErr } = await supabaseAdmin.from('rooms').insert(roomsToInsert)
      if (roomsErr) {
        console.warn('[submitOnboarding] Warning inserting room categories into rooms table:', roomsErr)
      }
    }

    // 6. Look up Monthly Fee for the declared room count
    const feeInfo = await getMonthlyFeeForRooms(val.roomCount)
    if (!feeInfo.monthlyFee) {
      return { error: feeInfo.error || 'Unable to determine pricing for declared rooms.' }
    }

    // 7. Auto-sign in session
    const supabase = await createClient()
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: val.password,
    }).catch(() => {})

    return {
      success: true,
      propertyId,
      ownerId,
      userId,
      email: normalizedEmail,
      phone: normalizedPhone,
      propertyName: val.propertyName,
      roomCount: val.roomCount,
      monthlyFee: feeInfo.monthlyFee,
    }
  } catch (err: any) {
    console.error('[submitOnboarding] Exception:', err)
    return { error: err.message || 'Onboarding submission failed.' }
  }
}
