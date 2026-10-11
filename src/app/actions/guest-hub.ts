'use server'

import crypto from 'crypto'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { addMonths } from 'date-fns'
import Razorpay from 'razorpay'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  starter,
  slugifyHotelName,
  isRestaurantOpen,
  type ServiceId,
} from '@/lib/guest-hub/starter'

const SECRET_SALT = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fixystays-guest-hub-secret-key-2026'
const STAFF_COOKIE_NAME = 'gh_staff_session'
const PRICE_PER_ROOM_PER_MONTH = 20

// ============================================================================
// CRYPTO & SESSION HELPERS
// ============================================================================

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.includes(':')) return false
  const [salt, key] = storedHash.split(':')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'))
}

function signPayload(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET_SALT).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verifySignedPayload<T = any>(token: string | undefined): T | null {
  if (!token || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', SECRET_SALT).update(data).digest('base64url')
  if (sig !== expected) return null
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

export function generateRandomQrToken(): string {
  return crypto.randomBytes(9).toString('hex')
}

export function generate4DigitPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export interface StaffSessionPayload {
  staffId: string
  propertyId: string
  hotelName: string
  name: string
  loginId: string
  role: 'admin' | 'manager' | 'staff' | 'kitchen'
  departments: string[]
  exp: number
}

// ============================================================================
// EVENT LOGGING HELPER
// ============================================================================

async function logHubEvent(params: {
  propertyId: string
  eventType: string
  description: string
  actorName: string
  actorRole?: string
  metadata?: Record<string, any>
}) {
  try {
    const supabaseAdmin = createAdminClient()
    await supabaseAdmin.from('hub_event_logs').insert({
      property_id: params.propertyId,
      event_type: params.eventType,
      description: params.description,
      actor_name: params.actorName,
      actor_role: params.actorRole || 'system',
      metadata: params.metadata || {},
    })
  } catch (e) {
    console.warn('[GuestHub] Event log insert skipped:', e)
  }
}

// ============================================================================
// AUTHORIZATION HELPER (SUPPORTS OWNER, SUPERADMIN, OR STAFF SESSION)
// ============================================================================

export async function getAuthorizedHubActor(targetPropertyId?: string): Promise<{
  authorized: boolean
  actorName: string
  actorRole: 'platform_owner' | 'admin' | 'manager' | 'staff' | 'kitchen'
  propertyId: string | null
  departments: string[]
  isOwnerOrSuperAdmin: boolean
  error?: string
}> {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  // 1. Check Supabase Auth first (Platform Owner / Superadmin or Property Owner)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const email = user.email?.toLowerCase().trim() || ''
    const userRole = (user.user_metadata?.role || '').toLowerCase().trim()
    const appRole = (user.app_metadata?.role || '').toLowerCase().trim()
    const isSuperAdmin =
      email === 'superadmin@fixstay.com' ||
      email === 'admin@fixstay.com' ||
      email.endsWith('@fixstay.com') ||
      userRole === 'admin' ||
      userRole === 'superadmin' ||
      appRole === 'admin' ||
      appRole === 'superadmin'

    if (isSuperAdmin) {
      return {
        authorized: true,
        actorName: user.user_metadata?.name || 'Platform Admin',
        actorRole: 'platform_owner',
        propertyId: targetPropertyId || null,
        departments: ['front_desk', 'restaurant', 'housekeeping', 'emergency'],
        isOwnerOrSuperAdmin: true,
      }
    }

    // Check if Property Owner
    const { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id, name')
      .or(`user_id.eq.${user.id},email.eq.${email}`)
      .maybeSingle()

    if (owner) {
      if (targetPropertyId) {
        const { data: prop } = await supabaseAdmin
          .from('properties')
          .select('id, owner_id')
          .eq('id', targetPropertyId)
          .maybeSingle()

        if (prop && prop.owner_id === owner.id) {
          return {
            authorized: true,
            actorName: owner.name || email.split('@')[0],
            actorRole: 'admin',
            propertyId: targetPropertyId,
            departments: ['front_desk', 'restaurant', 'housekeeping', 'emergency'],
            isOwnerOrSuperAdmin: true,
          }
        }
      } else {
        const { data: firstProp } = await supabaseAdmin
          .from('properties')
          .select('id')
          .eq('owner_id', owner.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        return {
          authorized: true,
          actorName: owner.name || email.split('@')[0],
          actorRole: 'admin',
          propertyId: firstProp?.id || null,
          departments: ['front_desk', 'restaurant', 'housekeeping', 'emergency'],
          isOwnerOrSuperAdmin: true,
        }
      }
    }
  }

  // 2. Check Dedicated Staff Cookie Session
  const cookieStore = await cookies()
  const rawStaffCookie = cookieStore.get(STAFF_COOKIE_NAME)?.value
  const staffSession = verifySignedPayload<StaffSessionPayload>(rawStaffCookie)

  if (staffSession && staffSession.exp > Date.now()) {
    if (!targetPropertyId || staffSession.propertyId === targetPropertyId) {
      return {
        authorized: true,
        actorName: staffSession.name,
        actorRole: staffSession.role,
        propertyId: staffSession.propertyId,
        departments: staffSession.departments,
        isOwnerOrSuperAdmin: false,
      }
    }
  }

  return {
    authorized: false,
    actorName: '',
    actorRole: 'staff',
    propertyId: null,
    departments: [],
    isOwnerOrSuperAdmin: false,
    error: 'Unauthorized access',
  }
}

// ============================================================================
// SUBSCRIPTION & PAYMENT ACTIONS (₹20 / ROOM / MONTH)
// ============================================================================

export async function createGuestHubOrder(params: {
  email: string
  roomsCount: number
  monthsCount: number
  propertyId?: string
  ownerId?: string
  hotelName?: string
  city?: string
  address?: string
  adminName?: string
}) {
  try {
    const rooms = Math.max(1, Math.floor(Number(params.roomsCount) || 1))
    const months = Math.max(1, Math.floor(Number(params.monthsCount) || 1))
    const normalizedEmail = params.email.trim().toLowerCase()

    if (!normalizedEmail) {
      return { error: 'Please provide a valid email address.' }
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return { error: 'Payment gateway keys are not configured. Please contact support.' }
    }

    const supabaseAdmin = createAdminClient()
    const { data: platformSettings } = await supabaseAdmin
      .from('guest_hub_platform_settings')
      .select('price_per_room_monthly')
      .eq('id', 'default')
      .maybeSingle()

    const ratePerRoom = Number(platformSettings?.price_per_room_monthly || PRICE_PER_ROOM_PER_MONTH)
    const totalAmountInr = rooms * ratePerRoom * months

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const notes: Record<string, string> = {
      type: 'guest_hub',
      email: normalizedEmail,
      rooms_count: String(rooms),
      months_count: String(months),
      rate_per_room: String(ratePerRoom),
      property_id: params.propertyId || '',
      owner_id: params.ownerId || '',
      hotel_name: params.hotelName || '',
      city: params.city || '',
      address: params.address || '',
      admin_name: params.adminName || '',
    }

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmountInr * 100), // paise
      currency: 'INR',
      receipt: `gh_${Date.now()}`,
      notes,
    })

    // Record pending payment in guest_hub_payments
    await supabaseAdmin.from('guest_hub_payments').insert({
      owner_id: params.ownerId || null,
      property_id: params.propertyId || null,
      email: normalizedEmail,
      rooms_count: rooms,
      months_count: months,
      price_per_room: ratePerRoom,
      total_amount: totalAmountInr,
      razorpay_order_id: order.id,
      status: 'pending',
    })

    return {
      orderId: order.id,
      amount: order.amount,
      totalInr: totalAmountInr,
      key: process.env.RAZORPAY_KEY_ID,
    }
  } catch (err: any) {
    console.error('[GuestHub] createGuestHubOrder error:', err)
    return { error: err.message || 'Failed to initiate Guest Hub order.' }
  }
}

export async function verifyGuestHubPayment(
  razorpayOrderId: string,
  razorpayPaymentId?: string,
  standaloneSignup?: {
    hotelName?: string
    city?: string
    address?: string
    adminName?: string
    password?: string
    primaryColor?: string
  }
) {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return { error: 'Payment gateway keys missing.' }
    }

    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const order = await razorpay.orders.fetch(razorpayOrderId)
    if (!order) {
      return { error: 'Order not found in Razorpay.' }
    }

    const notes = (order.notes || {}) as Record<string, string>
    const email = (notes.email || '').toLowerCase().trim()
    const roomsCount = Math.max(1, parseInt(notes.rooms_count || '1', 10))
    const monthsCount = Math.max(1, parseInt(notes.months_count || '1', 10))
    let propertyId = notes.property_id || ''
    let ownerId = notes.owner_id || ''
    const hotelName =
      standaloneSignup?.hotelName || notes.hotel_name || 'My Hotel'
    const city = standaloneSignup?.city || notes.city || 'Alibag'
    const address = standaloneSignup?.address || notes.address || `${hotelName}, ${city}`
    const adminName = standaloneSignup?.adminName || notes.admin_name || email.split('@')[0]
    const primaryColor = standaloneSignup?.primaryColor || '#2563eb'

    // 1. Ensure Owner Exists (or create for standalone Guest Hub customer)
    if (!ownerId) {
      const { data: existingOwner } = await supabaseAdmin
        .from('owners')
        .select('id, user_id')
        .eq('email', email)
        .maybeSingle()

      if (existingOwner) {
        ownerId = existingOwner.id
      } else {
        // Check or create Supabase Auth user
        const {
          data: { users },
        } = await supabaseAdmin.auth.admin.listUsers()
        const matchedAuthUser = users?.find((u) => u.email?.toLowerCase() === email)
        let userId = matchedAuthUser?.id || null

        if (!userId) {
          const passwordToUse = standaloneSignup?.password || 'fixystays123'
          const { data: newAuth } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: passwordToUse,
            email_confirm: true,
            user_metadata: {
              name: adminName,
              role: 'owner',
            },
          })
          userId = newAuth?.user?.id || null
        }

        const { data: createdOwner, error: ownerErr } = await supabaseAdmin
          .from('owners')
          .insert({
            user_id: userId,
            name: adminName,
            email,
          })
          .select('id')
          .single()

        if (ownerErr || !createdOwner) {
          return { error: 'Failed to create owner record for Guest Hub.' }
        }
        ownerId = createdOwner.id

        if (standaloneSignup?.password) {
          await supabase.auth
            .signInWithPassword({
              email,
              password: standaloneSignup.password,
            })
            .catch(() => {})
        }
      }
    }

    // 2. Ensure Property Exists (or create standalone property)
    if (!propertyId) {
      const { data: existingProp } = await supabaseAdmin
        .from('properties')
        .select('id, name')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (existingProp && !standaloneSignup?.hotelName) {
        propertyId = existingProp.id
      } else {
        const { data: createdProp, error: propErr } = await supabaseAdmin
          .from('properties')
          .insert({
            owner_id: ownerId,
            name: hotelName,
            type: 'hotel',
            city_area: city,
            city,
            address,
            approved: false,
            is_guest_hub_only: true,
          })
          .select('id')
          .single()

        if (propErr || !createdProp) {
          return { error: 'Failed to create property for Guest Hub.' }
        }
        propertyId = createdProp.id
      }
    }

    // 3. Activate or Extend Guest Hub Settings & Room Allowance
    const result = await initializeOrUpgradePropertyGuestHub({
      propertyId,
      roomsCount,
      monthsCount,
      hotelName,
      city,
      address,
      primaryColor,
      adminName,
      adminLoginId: email.split('@')[0] || 'admin',
      adminPassword: standaloneSignup?.password || 'admin123',
    })

    if (result.error) {
      return { error: result.error }
    }

    // 4. Mark payment record as paid
    await supabaseAdmin
      .from('guest_hub_payments')
      .update({
        owner_id: ownerId,
        property_id: propertyId,
        razorpay_payment_id: razorpayPaymentId || null,
        status: 'paid',
      })
      .eq('razorpay_order_id', razorpayOrderId)

    revalidatePath('/dashboard/owner')
    revalidatePath('/dashboard/admin')

    return {
      success: true,
      propertyId,
      ownerId,
    }
  } catch (err: any) {
    console.error('[GuestHub] verifyGuestHubPayment error:', err)
    return { error: err.message || 'Payment verification failed.' }
  }
}

/**
 * Helper to initialize or upgrade a property's Guest Hub settings, starter content, rooms, and default admin staff user.
 */
async function initializeOrUpgradePropertyGuestHub(params: {
  propertyId: string
  roomsCount: number
  monthsCount: number
  hotelName?: string
  city?: string
  address?: string
  countryCode?: string
  primaryColor?: string
  enabledServices?: Partial<Record<ServiceId, boolean>>
  adminName?: string
  adminLoginId?: string
  adminPassword?: string
  isAdditiveRoomUpgrade?: boolean
}) {
  const supabaseAdmin = createAdminClient()

  const { data: prop } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('id', params.propertyId)
    .maybeSingle()

  if (!prop) {
    return { error: 'Property not found.' }
  }

  const { data: existingHub } = await supabaseAdmin
    .from('guest_hub_settings')
    .select('*')
    .eq('property_id', params.propertyId)
    .maybeSingle()

  const now = new Date()
  let baseEndDate = now
  if (
    existingHub?.subscription_end_date &&
    new Date(existingHub.subscription_end_date) > now
  ) {
    baseEndDate = new Date(existingHub.subscription_end_date)
  }
  const newEndDate = addMonths(baseEndDate, params.monthsCount || 1).toISOString()

  if (!existingHub) {
    const starterData = starter({
      hotelName: params.hotelName || prop.name,
      city: params.city || prop.city_area || prop.city || 'Alibag',
      address: params.address || prop.address || `${prop.name}, ${prop.city_area || 'India'}`,
      countryCode: params.countryCode || '91',
      primaryColor: params.primaryColor || '#2563eb',
      enabledServices: params.enabledServices,
      helpdeskPhone: prop.helpdesk_number || '',
    })

    // Ensure unique slug
    let slug = starterData.slug
    const { data: slugCollision } = await supabaseAdmin
      .from('guest_hub_settings')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (slugCollision) {
      slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`
    }

    const { error: insertErr } = await supabaseAdmin.from('guest_hub_settings').insert({
      property_id: params.propertyId,
      slug,
      hub_status: 'active',
      country_code: starterData.country_code,
      timezone: starterData.timezone,
      subscription_status: 'active',
      paid_rooms_limit: params.roomsCount,
      subscription_start_date: now.toISOString(),
      subscription_end_date: newEndDate,
      branding: starterData.branding,
      departments: starterData.departments,
      house_info: starterData.house_info,
      policies: prop.house_rules
        ? prop.house_rules.split('\n').filter(Boolean)
        : starterData.policies,
      services: starterData.services,
      menu: starterData.menu,
      request_items: starterData.request_items,
      local_guide: starterData.local_guide,
      emergency_contacts: starterData.emergency_contacts,
    })

    if (insertErr) {
      return { error: `Failed to initialize Guest Hub settings: ${insertErr.message}` }
    }
  } else {
    const updatedLimit = params.isAdditiveRoomUpgrade
      ? (existingHub.paid_rooms_limit || 0) + params.roomsCount
      : Math.max(existingHub.paid_rooms_limit || 0, params.roomsCount)

    await supabaseAdmin
      .from('guest_hub_settings')
      .update({
        hub_status: 'active',
        subscription_status: 'active',
        paid_rooms_limit: updatedLimit,
        subscription_end_date: newEndDate,
        updated_at: now.toISOString(),
      })
      .eq('property_id', params.propertyId)
  }

  // Ensure rooms exist up to params.roomsCount and all have qr_tokens
  const { data: existingRooms } = await supabaseAdmin
    .from('property_rooms')
    .select('*')
    .eq('property_id', params.propertyId)
    .order('room_number', { ascending: true })

  const currentRooms = existingRooms || []
  for (const r of currentRooms) {
    if (!r.qr_token) {
      await supabaseAdmin
        .from('property_rooms')
        .update({ qr_token: generateRandomQrToken() })
        .eq('id', r.id)
    }
  }

  if (currentRooms.length === 0 && params.roomsCount > 0) {
    const roomsToInsert = Array.from({ length: params.roomsCount }, (_, idx) => ({
      property_id: params.propertyId,
      room_number: String(101 + idx),
      qr_token: generateRandomQrToken(),
      is_active: true,
    }))
    await supabaseAdmin.from('property_rooms').insert(roomsToInsert)
  }

  // Create default Hotel Admin login in hub_staff_users if none exists yet
  if (params.adminLoginId && params.adminPassword) {
    const { data: existingAdmin } = await supabaseAdmin
      .from('hub_staff_users')
      .select('id')
      .eq('property_id', params.propertyId)
      .eq('login_id', params.adminLoginId.toLowerCase().trim())
      .maybeSingle()

    if (!existingAdmin) {
      const pwHash = await hashPassword(params.adminPassword)
      await supabaseAdmin.from('hub_staff_users').insert({
        property_id: params.propertyId,
        name: params.adminName || 'Hotel Admin',
        login_id: params.adminLoginId.toLowerCase().trim(),
        password_hash: pwHash,
        role: 'admin',
        departments: ['front_desk', 'restaurant', 'housekeeping', 'emergency'],
        is_active: true,
      })
    }
  }

  await logHubEvent({
    propertyId: params.propertyId,
    eventType: 'settings_updated',
    description: `Guest Hub activated with ${params.roomsCount} room(s) allowance`,
    actorName: params.adminName || 'System',
    actorRole: 'admin',
  })

  return { success: true }
}

// ============================================================================
// PLATFORM BACK END (SUPERADMIN) ACTIONS
// ============================================================================

export async function getPlatformGuestHubOverview() {
  const actor = await getAuthorizedHubActor()
  if (!actor.authorized || actor.actorRole !== 'platform_owner') {
    return { error: 'Superadmin access required.' }
  }

  const supabaseAdmin = createAdminClient()

  const [
    { data: platformSettings },
    { data: hubSettings },
    { data: properties },
    { data: rooms },
    { data: stays },
    { data: requests },
    { data: payments },
  ] = await Promise.all([
    supabaseAdmin.from('guest_hub_platform_settings').select('*').eq('id', 'default').maybeSingle(),
    supabaseAdmin.from('guest_hub_settings').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('properties').select('id, name, city_area, city, owner_id, approved, is_guest_hub_only, owners(name, email)').order('created_at', { ascending: false }),
    supabaseAdmin.from('property_rooms').select('id, property_id, room_number, qr_token'),
    supabaseAdmin.from('hub_stays').select('id, property_id, ended_at, access_ends_at'),
    supabaseAdmin.from('hub_requests').select('id, property_id, service, status, created_at'),
    supabaseAdmin.from('guest_hub_payments').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  return {
    platformSettings: platformSettings || { product_name: 'Guest Hub', price_per_room_monthly: 20 },
    hubSettings: hubSettings || [],
    properties: properties || [],
    rooms: rooms || [],
    stays: stays || [],
    requests: requests || [],
    payments: payments || [],
  }
}

export async function adminOnboardHotelAction(params: {
  existingPropertyId?: string
  hotelName: string
  city: string
  address: string
  numRooms: number
  countryCode: string
  primaryColor: string
  enabledServices: Partial<Record<ServiceId, boolean>>
  adminName: string
  adminEmail: string
  adminLoginId: string
  adminPassword: string
  monthsGranted?: number
}) {
  const actor = await getAuthorizedHubActor()
  if (!actor.authorized || actor.actorRole !== 'platform_owner') {
    return { error: 'Only the platform owner can onboard hotels.' }
  }

  const supabaseAdmin = createAdminClient()
  let propertyId = params.existingPropertyId || ''

  if (!propertyId) {
    // Find or create owner by adminEmail
    const normalizedEmail = (params.adminEmail || `${params.adminLoginId}@fixystays.com`)
      .toLowerCase()
      .trim()

    let { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id, user_id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!owner) {
      const {
        data: { users },
      } = await supabaseAdmin.auth.admin.listUsers()
      const existingAuth = users?.find((u) => u.email?.toLowerCase() === normalizedEmail)
      let userId = existingAuth?.id || null

      if (!userId) {
        const { data: createdAuth } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: params.adminPassword || 'fixystays123',
          email_confirm: true,
          user_metadata: { name: params.adminName, role: 'owner' },
        })
        userId = createdAuth?.user?.id || null
      }

      const { data: newOwner, error: ownerErr } = await supabaseAdmin
        .from('owners')
        .insert({
          user_id: userId,
          name: params.adminName,
          email: normalizedEmail,
        })
        .select('id, user_id')
        .single()

      if (ownerErr || !newOwner) {
        return { error: `Failed to create owner: ${ownerErr?.message}` }
      }
      owner = newOwner
    }

    const { data: newProp, error: propErr } = await supabaseAdmin
      .from('properties')
      .insert({
        owner_id: owner.id,
        name: params.hotelName.trim(),
        type: 'hotel',
        city_area: params.city.trim(),
        city: params.city.trim(),
        address: params.address.trim(),
        approved: true,
        is_guest_hub_only: true,
      })
      .select('id')
      .single()

    if (propErr || !newProp) {
      return { error: `Failed to create hotel property: ${propErr?.message}` }
    }
    propertyId = newProp.id
  }

  const res = await initializeOrUpgradePropertyGuestHub({
    propertyId,
    roomsCount: Math.max(1, Number(params.numRooms) || 10),
    monthsCount: params.monthsGranted || 12,
    hotelName: params.hotelName,
    city: params.city,
    address: params.address,
    countryCode: params.countryCode || '91',
    primaryColor: params.primaryColor || '#2563eb',
    enabledServices: params.enabledServices,
    adminName: params.adminName,
    adminLoginId: params.adminLoginId,
    adminPassword: params.adminPassword,
  })

  if (res.error) return { error: res.error }

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
  return { success: true, propertyId }
}

export async function adminUpdateHotelHubStatus(params: {
  propertyId: string
  hubStatus?: 'active' | 'paused' | 'removed'
  subscriptionStatus?: 'active' | 'inactive' | 'expired'
  paidRoomsLimit?: number
  planFeatures?: { phase1: boolean; phase2: boolean; phase3: boolean }
}) {
  const actor = await getAuthorizedHubActor()
  if (!actor.authorized || actor.actorRole !== 'platform_owner') {
    return { error: 'Superadmin access required.' }
  }

  const supabaseAdmin = createAdminClient()
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
  if (params.hubStatus) updateData.hub_status = params.hubStatus
  if (params.subscriptionStatus) updateData.subscription_status = params.subscriptionStatus
  if (typeof params.paidRoomsLimit === 'number') updateData.paid_rooms_limit = params.paidRoomsLimit
  if (params.planFeatures) updateData.plan_features = params.planFeatures

  const { error } = await supabaseAdmin
    .from('guest_hub_settings')
    .update(updateData)
    .eq('property_id', params.propertyId)

  if (error) return { error: error.message }

  await logHubEvent({
    propertyId: params.propertyId,
    eventType: 'settings_updated',
    description: `Platform owner updated hotel status: ${JSON.stringify(updateData)}`,
    actorName: actor.actorName,
    actorRole: 'platform_owner',
  })

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/owner')
  return { success: true }
}

export async function adminSavePlatformSettings(productName: string, pricePerRoomMonthly: number) {
  const actor = await getAuthorizedHubActor()
  if (!actor.authorized || actor.actorRole !== 'platform_owner') {
    return { error: 'Superadmin access required.' }
  }

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin.from('guest_hub_platform_settings').upsert({
    id: 'default',
    product_name: productName.trim() || 'Guest Hub',
    price_per_room_monthly: Math.max(1, Number(pricePerRoomMonthly) || 20),
    updated_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// ============================================================================
// PROPERTY BACK END (HOTEL ADMIN / OWNER) ACTIONS
// ============================================================================

export async function getPropertyGuestHubBundle(propertyId: string) {
  const actor = await getAuthorizedHubActor(propertyId)
  if (!actor.authorized) {
    return { error: 'Unauthorized to access this property.' }
  }

  const supabaseAdmin = createAdminClient()

  const [
    { data: property },
    { data: hubSettings },
    { data: rooms },
    { data: staffUsers },
    { data: stays },
    { data: requests },
    { data: eventLogs },
    { data: platformSettings },
  ] = await Promise.all([
    supabaseAdmin.from('properties').select('*').eq('id', propertyId).maybeSingle(),
    supabaseAdmin.from('guest_hub_settings').select('*').eq('property_id', propertyId).maybeSingle(),
    supabaseAdmin
      .from('property_rooms')
      .select('*')
      .eq('property_id', propertyId)
      .order('room_number', { ascending: true }),
    supabaseAdmin
      .from('hub_staff_users')
      .select('id, property_id, name, login_id, role, departments, is_active, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('hub_stays')
      .select('*')
      .eq('property_id', propertyId)
      .order('checkin_at', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('hub_requests')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(300),
    supabaseAdmin
      .from('hub_event_logs')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('guest_hub_platform_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle(),
  ])

  // Ensure every room has a permanent qr_token
  const ensuredRooms = [...(rooms || [])]
  for (let i = 0; i < ensuredRooms.length; i++) {
    if (!ensuredRooms[i].qr_token) {
      const token = generateRandomQrToken()
      await supabaseAdmin
        .from('property_rooms')
        .update({ qr_token: token })
        .eq('id', ensuredRooms[i].id)
      ensuredRooms[i] = { ...ensuredRooms[i], qr_token: token }
    }
  }

  return {
    actor,
    property,
    hubSettings,
    rooms: ensuredRooms,
    staffUsers: staffUsers || [],
    stays: stays || [],
    requests: requests || [],
    eventLogs: eventLogs || [],
    platformSettings: platformSettings || { product_name: 'Guest Hub', price_per_room_monthly: 20 },
  }
}

export async function saveGuestHubSection(
  propertyId: string,
  section:
    | 'branding'
    | 'departments'
    | 'house_info'
    | 'policies'
    | 'services'
    | 'menu'
    | 'request_items'
    | 'local_guide'
    | 'emergency_contacts'
    | 'bill_settings',
  payload: any
) {
  const actor = await getAuthorizedHubActor(propertyId)
  if (!actor.authorized || (actor.actorRole !== 'admin' && actor.actorRole !== 'platform_owner')) {
    return { error: 'Hotel Admin permission required.' }
  }

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin
    .from('guest_hub_settings')
    .update({
      [section]: payload,
      updated_at: new Date().toISOString(),
    })
    .eq('property_id', propertyId)

  if (error) return { error: error.message }

  await logHubEvent({
    propertyId,
    eventType: 'settings_updated',
    description: `Updated Guest Hub ${section.replace('_', ' ')}`,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
  })

  revalidatePath('/dashboard/owner')
  return { success: true }
}

export async function addHubRoomAction(propertyId: string, roomNumber: string) {
  const actor = await getAuthorizedHubActor(propertyId)
  if (!actor.authorized || (actor.actorRole !== 'admin' && actor.actorRole !== 'platform_owner')) {
    return { error: 'Hotel Admin permission required.' }
  }

  const cleanRoom = roomNumber.trim()
  if (!cleanRoom) return { error: 'Room name or number is required.' }

  const supabaseAdmin = createAdminClient()

  // Check room limit against paid_rooms_limit (unless platform_owner)
  const [{ data: hubSettings }, { count: currentRoomCount }] = await Promise.all([
    supabaseAdmin
      .from('guest_hub_settings')
      .select('paid_rooms_limit, subscription_status')
      .eq('property_id', propertyId)
      .maybeSingle(),
    supabaseAdmin
      .from('property_rooms')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId),
  ])

  const limit = hubSettings?.paid_rooms_limit || 0
  if (actor.actorRole !== 'platform_owner' && (currentRoomCount || 0) >= limit) {
    return {
      error: `Room limit reached (${limit} rooms paid). Please upgrade your room count (₹20/room/month) to add more rooms.`,
      limitReached: true,
    }
  }

  const qrToken = generateRandomQrToken()
  const { data: room, error } = await supabaseAdmin
    .from('property_rooms')
    .insert({
      property_id: propertyId,
      room_number: cleanRoom,
      qr_token: qrToken,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') return { error: `Room "${cleanRoom}" already exists.` }
    return { error: error.message }
  }

  await logHubEvent({
    propertyId,
    eventType: 'settings_updated',
    description: `Added room ${cleanRoom}`,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
  })

  revalidatePath('/dashboard/owner')
  return { success: true, room }
}

export async function renameHubRoomAction(propertyId: string, roomId: string, newRoomNumber: string) {
  const actor = await getAuthorizedHubActor(propertyId)
  if (!actor.authorized || (actor.actorRole !== 'admin' && actor.actorRole !== 'platform_owner')) {
    return { error: 'Hotel Admin permission required.' }
  }

  const cleanRoom = newRoomNumber.trim()
  if (!cleanRoom) return { error: 'Room name cannot be empty.' }

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin
    .from('property_rooms')
    .update({ room_number: cleanRoom })
    .eq('id', roomId)
    .eq('property_id', propertyId)

  if (error) return { error: error.message }

  await logHubEvent({
    propertyId,
    eventType: 'settings_updated',
    description: `Renamed room to ${cleanRoom}`,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
  })

  revalidatePath('/dashboard/owner')
  return { success: true }
}

export async function removeHubRoomAction(propertyId: string, roomId: string) {
  const actor = await getAuthorizedHubActor(propertyId)
  if (!actor.authorized || (actor.actorRole !== 'admin' && actor.actorRole !== 'platform_owner')) {
    return { error: 'Hotel Admin permission required.' }
  }

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin
    .from('property_rooms')
    .delete()
    .eq('id', roomId)
    .eq('property_id', propertyId)

  if (error) return { error: error.message }

  await logHubEvent({
    propertyId,
    eventType: 'settings_updated',
    description: `Removed room`,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
  })

  revalidatePath('/dashboard/owner')
  return { success: true }
}

export async function saveHubStaffUserAction(params: {
  propertyId: string
  staffId?: string
  name: string
  loginId: string
  password?: string
  role: 'admin' | 'manager' | 'staff' | 'kitchen'
  departments: string[]
  isActive?: boolean
}) {
  const actor = await getAuthorizedHubActor(params.propertyId)
  if (!actor.authorized || (actor.actorRole !== 'admin' && actor.actorRole !== 'platform_owner')) {
    return { error: 'Hotel Admin permission required to manage staff logins.' }
  }

  const cleanLogin = params.loginId.trim().toLowerCase()
  const cleanName = params.name.trim()
  if (!cleanLogin || !cleanName) {
    return { error: 'Staff name and login ID are required.' }
  }

  const supabaseAdmin = createAdminClient()

  if (params.staffId) {
    const updatePayload: Record<string, any> = {
      name: cleanName,
      login_id: cleanLogin,
      role: params.role,
      departments: params.departments,
      is_active: params.isActive ?? true,
    }
    if (params.password && params.password.trim().length > 0) {
      updatePayload.password_hash = await hashPassword(params.password.trim())
    }

    const { error } = await supabaseAdmin
      .from('hub_staff_users')
      .update(updatePayload)
      .eq('id', params.staffId)
      .eq('property_id', params.propertyId)

    if (error) return { error: error.message }
  } else {
    if (!params.password || params.password.trim().length < 4) {
      return { error: 'Password must be at least 4 characters.' }
    }
    const passwordHash = await hashPassword(params.password.trim())
    const { error } = await supabaseAdmin.from('hub_staff_users').insert({
      property_id: params.propertyId,
      name: cleanName,
      login_id: cleanLogin,
      password_hash: passwordHash,
      role: params.role,
      departments: params.departments,
      is_active: true,
    })

    if (error) {
      if (error.code === '23505') return { error: `Login ID "${cleanLogin}" already exists for this hotel.` }
      return { error: error.message }
    }
  }

  await logHubEvent({
    propertyId: params.propertyId,
    eventType: 'settings_updated',
    description: `Saved staff login "${cleanLogin}" (${params.role})`,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
  })

  revalidatePath('/dashboard/owner')
  return { success: true }
}

export async function deleteHubStaffUserAction(propertyId: string, staffId: string) {
  const actor = await getAuthorizedHubActor(propertyId)
  if (!actor.authorized || (actor.actorRole !== 'admin' && actor.actorRole !== 'platform_owner')) {
    return { error: 'Hotel Admin permission required.' }
  }

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin
    .from('hub_staff_users')
    .delete()
    .eq('id', staffId)
    .eq('property_id', propertyId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/owner')
  return { success: true }
}

// ============================================================================
// STAFF AUTHENTICATION & SESSIONS (/staff/login & /staff)
// ============================================================================

export async function loginHubStaffAction(params: {
  hotelSlugOrId?: string
  loginId: string
  password: string
}) {
  const cleanLogin = params.loginId.trim().toLowerCase()
  const cleanSlug = params.hotelSlugOrId?.trim().toLowerCase() || ''

  if (!cleanLogin || !params.password) {
    return { error: 'Please enter your Login ID and Password.' }
  }

  const supabaseAdmin = createAdminClient()
  let targetPropertyId: string | null = null

  if (cleanSlug) {
    const { data: hubBySlug } = await supabaseAdmin
      .from('guest_hub_settings')
      .select('property_id, hub_status, branding')
      .eq('slug', cleanSlug)
      .maybeSingle()

    if (hubBySlug) {
      targetPropertyId = hubBySlug.property_id
    } else {
      // Check if UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSlug)
      if (isUuid) targetPropertyId = cleanSlug
    }
  }

  let query = supabaseAdmin
    .from('hub_staff_users')
    .select('*, properties(name)')
    .eq('login_id', cleanLogin)
    .eq('is_active', true)

  if (targetPropertyId) {
    query = query.eq('property_id', targetPropertyId)
  }

  const { data: staffCandidates, error } = await query
  if (error || !staffCandidates || staffCandidates.length === 0) {
    return { error: 'Invalid login credentials or hotel code.' }
  }

  if (staffCandidates.length > 1 && !targetPropertyId) {
    return {
      error: 'Multiple hotels use this Login ID. Please enter your Hotel Slug / Code as well.',
      needsHotelSlug: true,
    }
  }

  let matchedStaff: any = null
  for (const candidate of staffCandidates) {
    const ok = await verifyPassword(params.password, candidate.password_hash)
    if (ok) {
      matchedStaff = candidate
      break
    }
  }

  if (!matchedStaff) {
    return { error: 'Incorrect password.' }
  }

  // Check if hotel is paused or inactive
  const { data: hubSettings } = await supabaseAdmin
    .from('guest_hub_settings')
    .select('hub_status, subscription_status, branding')
    .eq('property_id', matchedStaff.property_id)
    .maybeSingle()

  if (hubSettings?.hub_status === 'paused' || hubSettings?.hub_status === 'removed') {
    return { error: 'This hotel Guest Hub is currently paused by the platform owner.' }
  }

  const sessionPayload: StaffSessionPayload = {
    staffId: matchedStaff.id,
    propertyId: matchedStaff.property_id,
    hotelName:
      hubSettings?.branding?.hotelName ||
      (matchedStaff.properties as any)?.name ||
      'Hotel',
    name: matchedStaff.name,
    loginId: matchedStaff.login_id,
    role: matchedStaff.role,
    departments:
      matchedStaff.role === 'admin' || matchedStaff.role === 'manager'
        ? ['front_desk', 'restaurant', 'housekeeping', 'emergency']
        : matchedStaff.departments || [],
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  }

  const cookieStore = await cookies()
  cookieStore.set(STAFF_COOKIE_NAME, signPayload(sessionPayload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  await logHubEvent({
    propertyId: matchedStaff.property_id,
    eventType: 'staff_login',
    description: `${matchedStaff.name} (${matchedStaff.role}) logged into Staff Screen`,
    actorName: matchedStaff.name,
    actorRole: matchedStaff.role,
  })

  return {
    success: true,
    session: sessionPayload,
  }
}

export async function logoutHubStaffAction() {
  const cookieStore = await cookies()
  cookieStore.delete(STAFF_COOKIE_NAME)
  return { success: true }
}

// ============================================================================
// STAYS & CHECK-IN ACTIONS (RECEPTION & OWNER GUEST RECORDS SYNC)
// ============================================================================

export async function createStayCheckinAction(params: {
  propertyId: string
  roomId: string
  guestName: string
  guestPhone?: string
  checkinAt?: string
  accessEndsAt?: string
  foodOrderingAllowed?: boolean
  guestCheckinId?: string
}) {
  const actor = await getAuthorizedHubActor(params.propertyId)
  if (
    !actor.authorized ||
    (actor.actorRole !== 'admin' &&
      actor.actorRole !== 'manager' &&
      actor.actorRole !== 'platform_owner' &&
      !actor.departments.includes('front_desk'))
  ) {
    return { error: 'Reception or Manager permission required to check guests in.' }
  }

  const cleanName = params.guestName.trim()
  if (!cleanName) return { error: 'Guest name is required.' }

  const supabaseAdmin = createAdminClient()

  // End any currently active stay on this room first
  const nowIso = new Date().toISOString()
  await supabaseAdmin
    .from('hub_stays')
    .update({ ended_at: nowIso, ended_by: actor.actorName })
    .eq('room_id', params.roomId)
    .is('ended_at', null)

  const checkinDate = params.checkinAt ? new Date(params.checkinAt) : new Date()
  const accessEndsDate = params.accessEndsAt
    ? new Date(params.accessEndsAt)
    : new Date(checkinDate.getTime() + 24 * 60 * 60 * 1000) // default +24 hours

  const pinCode = generate4DigitPin()

  const { data: stay, error } = await supabaseAdmin
    .from('hub_stays')
    .insert({
      property_id: params.propertyId,
      room_id: params.roomId,
      guest_checkin_id: params.guestCheckinId || null,
      guest_name: cleanName,
      guest_phone: params.guestPhone?.trim() || null,
      pin_code: pinCode,
      checkin_at: checkinDate.toISOString(),
      access_ends_at: accessEndsDate.toISOString(),
      food_ordering_allowed: params.foodOrderingAllowed ?? true,
      created_by: actor.actorName,
    })
    .select('*')
    .single()

  if (error || !stay) {
    return { error: error?.message || 'Failed to create stay.' }
  }

  await logHubEvent({
    propertyId: params.propertyId,
    eventType: 'checkin',
    description: `Checked in ${cleanName} (PIN: ${pinCode})`,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    metadata: { stayId: stay.id, roomId: params.roomId },
  })

  revalidatePath('/staff')
  revalidatePath('/dashboard/owner')
  return { success: true, stay }
}

export async function extendStayAction(params: {
  propertyId: string
  stayId: string
  newAccessEndsAt?: string
  additionalHours?: number
}) {
  const actor = await getAuthorizedHubActor(params.propertyId)
  if (!actor.authorized) return { error: 'Unauthorized.' }

  const supabaseAdmin = createAdminClient()
  const { data: stay } = await supabaseAdmin
    .from('hub_stays')
    .select('*')
    .eq('id', params.stayId)
    .eq('property_id', params.propertyId)
    .maybeSingle()

  if (!stay) return { error: 'Stay not found.' }

  const baseTime =
    new Date(stay.access_ends_at) > new Date()
      ? new Date(stay.access_ends_at)
      : new Date()

  const updatedAccessEnds = params.newAccessEndsAt
    ? new Date(params.newAccessEndsAt).toISOString()
    : new Date(
        baseTime.getTime() + (params.additionalHours || 24) * 60 * 60 * 1000
      ).toISOString()

  const { data: updatedStay, error } = await supabaseAdmin
    .from('hub_stays')
    .update({
      access_ends_at: updatedAccessEnds,
      ended_at: null,
    })
    .eq('id', params.stayId)
    .select('*')
    .single()

  if (error) return { error: error.message }

  await logHubEvent({
    propertyId: params.propertyId,
    eventType: 'stay_extended',
    description: `Extended stay for ${stay.guest_name} until ${new Date(updatedAccessEnds).toLocaleString()}`,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    metadata: { stayId: stay.id },
  })

  revalidatePath('/staff')
  revalidatePath('/dashboard/owner')
  return { success: true, stay: updatedStay }
}

export async function endStayAction(propertyId: string, stayId: string) {
  const actor = await getAuthorizedHubActor(propertyId)
  if (!actor.authorized) return { error: 'Unauthorized.' }

  const supabaseAdmin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: stay, error } = await supabaseAdmin
    .from('hub_stays')
    .update({
      ended_at: nowIso,
      ended_by: actor.actorName,
    })
    .eq('id', stayId)
    .eq('property_id', propertyId)
    .select('*')
    .single()

  if (error) return { error: error.message }

  await logHubEvent({
    propertyId,
    eventType: 'checkout',
    description: `Ended stay for ${stay?.guest_name || 'Guest'}`,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    metadata: { stayId },
  })

  revalidatePath('/staff')
  revalidatePath('/dashboard/owner')
  return { success: true, stay }
}

// ============================================================================
// STAFF REQUEST STATUS ACTIONS
// ============================================================================

export async function updateHubRequestStatusAction(params: {
  propertyId: string
  requestId: string
  status: 'seen' | 'accepted' | 'completed' | 'declined'
  declineReason?: string
}) {
  const actor = await getAuthorizedHubActor(params.propertyId)
  if (!actor.authorized) return { error: 'Unauthorized.' }

  if (params.status === 'declined' && !params.declineReason?.trim()) {
    return { error: 'Please enter a reason when declining a request.' }
  }

  const supabaseAdmin = createAdminClient()
  const { data: existing } = await supabaseAdmin
    .from('hub_requests')
    .select('*')
    .eq('id', params.requestId)
    .eq('property_id', params.propertyId)
    .maybeSingle()

  if (!existing) return { error: 'Request not found.' }

  // Don't downgrade status if marking 'seen' on an already accepted/completed request
  if (
    params.status === 'seen' &&
    existing.status !== 'received'
  ) {
    return { success: true, request: existing }
  }

  const nowIso = new Date().toISOString()
  const history = Array.isArray(existing.status_history)
    ? [...existing.status_history]
    : []

  history.push({
    status: params.status,
    at: nowIso,
    by_name: actor.actorName,
    by_role: actor.actorRole,
  })

  const updateFields: Record<string, any> = {
    status: params.status,
    status_history: history,
    updated_at: nowIso,
  }

  if (params.status === 'seen') {
    updateFields.seen_at = existing.seen_at || nowIso
    updateFields.seen_by = existing.seen_by || actor.actorName
  } else if (params.status === 'accepted') {
    if (!existing.seen_at) {
      updateFields.seen_at = nowIso
      updateFields.seen_by = actor.actorName
    }
    updateFields.accepted_at = nowIso
    updateFields.accepted_by = actor.actorName
  } else if (params.status === 'completed') {
    if (!existing.seen_at) {
      updateFields.seen_at = nowIso
      updateFields.seen_by = actor.actorName
    }
    if (!existing.accepted_at) {
      updateFields.accepted_at = nowIso
      updateFields.accepted_by = actor.actorName
    }
    updateFields.completed_at = nowIso
    updateFields.completed_by = actor.actorName
  } else if (params.status === 'declined') {
    updateFields.declined_at = nowIso
    updateFields.declined_by = actor.actorName
    updateFields.decline_reason = params.declineReason?.trim() || ''
  }

  const { data: updated, error } = await supabaseAdmin
    .from('hub_requests')
    .update(updateFields)
    .eq('id', params.requestId)
    .select('*')
    .single()

  if (error) return { error: error.message }

  await logHubEvent({
    propertyId: params.propertyId,
    eventType: 'request_status',
    description: `Marked request (${existing.service} - Room ${existing.room_number}) as ${params.status}`,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    metadata: { requestId: params.requestId, status: params.status },
  })

  return { success: true, request: updated }
}

// ============================================================================
// GUEST PORTAL ACTIONS (/g/[token]) — ZERO BACKEND EXPOSURE, NO WHATSAPP
// ============================================================================

export async function getGuestPortalDataByToken(qrToken: string) {
  const cleanToken = qrToken?.trim()
  if (!cleanToken) return { state: 'invalid' as const }

  const supabaseAdmin = createAdminClient()

  // 1. Find room by permanent qr_token
  const { data: room } = await supabaseAdmin
    .from('property_rooms')
    .select('id, property_id, room_number, is_active')
    .eq('qr_token', cleanToken)
    .maybeSingle()

  if (!room || room.is_active === false) {
    return { state: 'invalid' as const }
  }

  // 2. Fetch hotel settings & property name
  const [{ data: hubSettings }, { data: property }, { data: platformSettings }] =
    await Promise.all([
      supabaseAdmin
        .from('guest_hub_settings')
        .select('*')
        .eq('property_id', room.property_id)
        .maybeSingle(),
      supabaseAdmin
        .from('properties')
        .select('id, name, city_area, city')
        .eq('id', room.property_id)
        .maybeSingle(),
      supabaseAdmin
        .from('guest_hub_platform_settings')
        .select('product_name')
        .eq('id', 'default')
        .maybeSingle(),
    ])

  const hotelName =
    hubSettings?.branding?.hotelName || property?.name || 'Hotel'
  const primaryColor = hubSettings?.branding?.primaryColor || '#2563eb'
  const monogram = hubSettings?.branding?.monogram || 'GH'
  const logoUrl = hubSettings?.branding?.logoUrl || ''
  const productName = platformSettings?.product_name || 'Guest Hub'

  // 3. Check if hotel is paused or subscription inactive
  if (
    !hubSettings ||
    hubSettings.hub_status === 'paused' ||
    hubSettings.hub_status === 'removed' ||
    hubSettings.subscription_status !== 'active'
  ) {
    return {
      state: 'paused' as const,
      hotelName,
      primaryColor,
      monogram,
      logoUrl,
      productName,
    }
  }

  // 4. Find active stay for this room (ended_at IS NULL and access_ends_at > now)
  const nowIso = new Date().toISOString()
  const { data: activeStay } = await supabaseAdmin
    .from('hub_stays')
    .select('*')
    .eq('room_id', room.id)
    .is('ended_at', null)
    .gt('access_ends_at', nowIso)
    .order('checkin_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!activeStay) {
    // "Not active: Shown when the room has no active stay: the hotel name and 'Please contact reception'. No Wi-Fi password or other details."
    return {
      state: 'not_active' as const,
      hotelName,
      primaryColor,
      monogram,
      logoUrl,
      productName,
      roomNumber: room.room_number,
    }
  }

  // 5. Check if this phone has already entered the 4-digit PIN for this stay
  const cookieStore = await cookies()
  const stayCookieName = `gh_stay_${cleanToken}`
  const rawStayCookie = cookieStore.get(stayCookieName)?.value
  const verifiedStayToken = verifySignedPayload<{
    stayId: string
    roomId: string
    exp: number
  }>(rawStayCookie)

  const isPinVerified =
    verifiedStayToken &&
    verifiedStayToken.stayId === activeStay.id &&
    verifiedStayToken.roomId === room.id &&
    verifiedStayToken.exp > Date.now()

  if (!isPinVerified) {
    const isLocked =
      activeStay.pin_locked_until &&
      new Date(activeStay.pin_locked_until) > new Date()

    return {
      state: 'pin_required' as const,
      hotelName,
      primaryColor,
      monogram,
      logoUrl,
      productName,
      roomNumber: room.room_number,
      isLocked: Boolean(isLocked),
      lockedUntil: activeStay.pin_locked_until || null,
    }
  }

  // 6. Fetch all requests for this active stay
  const { data: stayRequests } = await supabaseAdmin
    .from('hub_requests')
    .select(
      'id, service, department, items, details, note, total, status, status_history, decline_reason, created_at, updated_at, seen_at, accepted_at, completed_at, declined_at'
    )
    .eq('stay_id', activeStay.id)
    .order('created_at', { ascending: false })

  return {
    state: 'active' as const,
    hotelName,
    primaryColor,
    monogram,
    logoUrl,
    productName,
    propertyId: room.property_id,
    roomId: room.id,
    roomNumber: room.room_number,
    stay: {
      id: activeStay.id,
      guestName: activeStay.guest_name,
      checkinAt: activeStay.checkin_at,
      accessEndsAt: activeStay.access_ends_at,
      foodOrderingAllowed: activeStay.food_ordering_allowed,
    },
    hotel: {
      countryCode: hubSettings.country_code || '91',
      timezone: hubSettings.timezone || 'Asia/Kolkata',
      branding: hubSettings.branding,
      departments: hubSettings.departments,
      houseInfo: hubSettings.house_info,
      policies: hubSettings.policies,
      services: hubSettings.services,
      menu: hubSettings.menu,
      requestItems: hubSettings.request_items,
      localGuide: hubSettings.local_guide,
      emergencyContacts: hubSettings.emergency_contacts,
    },
    requests: stayRequests || [],
  }
}

export async function verifyGuestStayPinAction(qrToken: string, pinInput: string) {
  const cleanToken = qrToken?.trim()
  const cleanPin = pinInput?.replace(/\D/g, '').trim()

  if (!cleanToken || cleanPin.length !== 4) {
    return { error: 'Please enter the 4-digit PIN given at check-in.' }
  }

  const supabaseAdmin = createAdminClient()

  const { data: room } = await supabaseAdmin
    .from('property_rooms')
    .select('id, property_id, room_number')
    .eq('qr_token', cleanToken)
    .maybeSingle()

  if (!room) return { error: 'Invalid room QR.' }

  const now = new Date()
  const { data: activeStay } = await supabaseAdmin
    .from('hub_stays')
    .select('*')
    .eq('room_id', room.id)
    .is('ended_at', null)
    .gt('access_ends_at', now.toISOString())
    .order('checkin_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!activeStay) {
    return { error: 'No active stay found for this room. Please contact reception.' }
  }

  // Check brute-force lock
  if (activeStay.pin_locked_until && new Date(activeStay.pin_locked_until) > now) {
    const minsLeft = Math.ceil(
      (new Date(activeStay.pin_locked_until).getTime() - now.getTime()) / 60000
    )
    return {
      error: `Too many wrong PIN attempts. Please wait ${minsLeft} minute(s) or contact reception.`,
    }
  }

  if (activeStay.pin_code !== cleanPin) {
    const attempts = (activeStay.failed_pin_attempts || 0) + 1
    const lockUntil =
      attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null

    await supabaseAdmin
      .from('hub_stays')
      .update({
        failed_pin_attempts: attempts,
        pin_locked_until: lockUntil,
      })
      .eq('id', activeStay.id)

    if (lockUntil) {
      return {
        error: 'Too many wrong attempts. PIN entry is temporarily blocked for 15 minutes.',
      }
    }
    return {
      error: `Incorrect PIN. ${5 - attempts} attempt(s) remaining.`,
    }
  }

  // PIN matched! Reset failed attempts and set persistent cookie until access_ends_at
  await supabaseAdmin
    .from('hub_stays')
    .update({ failed_pin_attempts: 0, pin_locked_until: null })
    .eq('id', activeStay.id)

  const expMs = new Date(activeStay.access_ends_at).getTime()
  const maxAgeSecs = Math.max(60, Math.floor((expMs - now.getTime()) / 1000))

  const cookieStore = await cookies()
  cookieStore.set(
    `gh_stay_${cleanToken}`,
    signPayload({
      stayId: activeStay.id,
      roomId: room.id,
      exp: expMs,
    }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: maxAgeSecs,
    }
  )

  return { success: true }
}

export async function submitGuestHubRequestAction(params: {
  qrToken: string
  service: ServiceId
  items: { name: string; qty: number; price?: number; category?: string; details?: string }[]
  details?: Record<string, any>
  note?: string
}) {
  const cleanToken = params.qrToken?.trim()
  if (!cleanToken) return { error: 'Invalid room token.' }

  const supabaseAdmin = createAdminClient()

  const { data: room } = await supabaseAdmin
    .from('property_rooms')
    .select('id, property_id, room_number')
    .eq('qr_token', cleanToken)
    .maybeSingle()

  if (!room) return { error: 'Invalid room.' }

  const now = new Date()
  const { data: activeStay } = await supabaseAdmin
    .from('hub_stays')
    .select('*')
    .eq('room_id', room.id)
    .is('ended_at', null)
    .gt('access_ends_at', now.toISOString())
    .order('checkin_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!activeStay) {
    return { error: 'Your stay access has ended. Please contact reception.' }
  }

  // Verify PIN cookie
  const cookieStore = await cookies()
  const rawStayCookie = cookieStore.get(`gh_stay_${cleanToken}`)?.value
  const verifiedStayToken = verifySignedPayload<{ stayId: string; roomId: string; exp: number }>(
    rawStayCookie
  )

  if (!verifiedStayToken || verifiedStayToken.stayId !== activeStay.id) {
    return { error: 'Session expired. Please re-enter your 4-digit room PIN.' }
  }

  // Rate limit check: max 6 requests in the last 2 minutes for this stay
  const twoMinsAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString()
  const { count: recentCount } = await supabaseAdmin
    .from('hub_requests')
    .select('id', { count: 'exact', head: true })
    .eq('stay_id', activeStay.id)
    .gte('created_at', twoMinsAgo)

  if ((recentCount || 0) >= 6) {
    return { error: 'You are sending requests too quickly. Please wait a moment and try again.' }
  }

  // Fetch hotel settings to verify service routing and restaurant hours
  const { data: hubSettings } = await supabaseAdmin
    .from('guest_hub_settings')
    .select('*')
    .eq('property_id', room.property_id)
    .maybeSingle()

  if (!hubSettings || hubSettings.hub_status !== 'active') {
    return { error: 'This page is currently paused. Please contact reception.' }
  }

  const serviceConfig = hubSettings.services?.[params.service]
  if (!serviceConfig || !serviceConfig.enabled) {
    return { error: 'This service is currently unavailable.' }
  }

  if (params.service === 'restaurant') {
    if (!activeStay.food_ordering_allowed) {
      return { error: 'Food ordering is not enabled for this stay. Please contact reception.' }
    }
    const open = isRestaurantOpen(
      hubSettings.house_info?.restaurantOpen,
      hubSettings.house_info?.restaurantClose,
      hubSettings.timezone || 'Asia/Kolkata',
      now
    )
    if (!open) {
      return {
        error: `Restaurant is currently closed (${hubSettings.house_info?.restaurantOpen} – ${hubSettings.house_info?.restaurantClose}).`,
      }
    }
  }

  const validItems = (params.items || []).filter((it) => it.name && it.qty > 0)
  const totalAmount = validItems.reduce(
    (sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1),
    0
  )

  const department = serviceConfig.department || 'front_desk'
  const nowIso = now.toISOString()

  const { data: createdRequest, error } = await supabaseAdmin
    .from('hub_requests')
    .insert({
      property_id: room.property_id,
      stay_id: activeStay.id,
      room_id: room.id,
      room_number: room.room_number,
      guest_name: activeStay.guest_name,
      department,
      service: params.service,
      items: validItems,
      details: params.details || {},
      note: params.note?.trim() || null,
      total: totalAmount,
      status: 'received',
      status_history: [
        {
          status: 'received',
          at: nowIso,
          by_name: activeStay.guest_name,
          by_role: 'guest',
        },
      ],
    })
    .select('*')
    .single()

  if (error || !createdRequest) {
    return { error: error?.message || 'Failed to send request.' }
  }

  await logHubEvent({
    propertyId: room.property_id,
    eventType: 'request_created',
    description: `Room ${room.room_number} (${activeStay.guest_name}) sent a ${params.service} request`,
    actorName: activeStay.guest_name,
    actorRole: 'guest',
    metadata: { requestId: createdRequest.id, service: params.service, department },
  })

  return { success: true, request: createdRequest }
}
