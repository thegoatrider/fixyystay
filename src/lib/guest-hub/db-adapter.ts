import crypto from 'crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import { starter } from '@/lib/guest-hub/starter'

const BUCKET_NAME = 'guest-hub-state'
const STORE_FILE = 'hub-store-v1.json'

export interface HubFallbackStore {
  platformSettings: {
    id: string
    product_name: string
    price_per_room_monthly: number
    updated_at: string
  }
  hubSettings: Record<string, any> // keyed by property_id
  roomTokens: Record<string, string> // room_id -> qr_token
  staffUsers: Record<string, any[]> // property_id -> staff array
  stays: Record<string, any[]> // property_id -> stays array
  requests: Record<string, any[]> // property_id -> requests array
  eventLogs: Record<string, any[]> // property_id -> logs array
  payments: any[]
  madhurleelaSeeded?: boolean
}

const DEFAULT_STORE: HubFallbackStore = {
  platformSettings: {
    id: 'default',
    product_name: 'Guest Hub',
    price_per_room_monthly: 20,
    updated_at: new Date().toISOString(),
  },
  hubSettings: {},
  roomTokens: {},
  staffUsers: {},
  stays: {},
  requests: {},
  eventLogs: {},
  payments: [],
  madhurleelaSeeded: false,
}

let memoryStoreCache: { data: HubFallbackStore; ts: number } | null = null

export function hashPasswordSync(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function deterministicRoomToken(roomId: string, roomNumber: string, isMadhurleela = false): string {
  const cleanNum = String(roomNumber || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  if (isMadhurleela && cleanNum) {
    return `madhurleela-${cleanNum}`
  }
  const cleanId = String(roomId || '').replace(/[^a-z0-9]/gi, '').slice(0, 10).toLowerCase()
  return `rm-${cleanNum || 'room'}-${cleanId}`
}

async function ensureStorageBucket(supabaseAdmin: ReturnType<typeof createAdminClient>) {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const exists = buckets?.some((b) => b.name === BUCKET_NAME)
    if (!exists) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: false,
      })
    }
  } catch {
    // Ignore bucket check errors
  }
}

export async function readHubStore(): Promise<HubFallbackStore> {
  if (memoryStoreCache && Date.now() - memoryStoreCache.ts < 1500) {
    return memoryStoreCache.data
  }
  const supabaseAdmin = createAdminClient()
  await ensureStorageBucket(supabaseAdmin)

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(`${STORE_FILE}?t=${Date.now()}`)

    if (!error && data) {
      const text = await data.text()
      const parsed = JSON.parse(text) as Partial<HubFallbackStore>
      const merged: HubFallbackStore = {
        ...DEFAULT_STORE,
        ...parsed,
        hubSettings: parsed.hubSettings || {},
        roomTokens: parsed.roomTokens || {},
        staffUsers: parsed.staffUsers || {},
        stays: parsed.stays || {},
        requests: parsed.requests || {},
        eventLogs: parsed.eventLogs || {},
        payments: parsed.payments || [],
      }
      memoryStoreCache = { data: merged, ts: Date.now() }
      return merged
    }
  } catch {
    // Fallback to default store if file doesn't exist yet
  }

  const fresh = structuredClone(DEFAULT_STORE)
  memoryStoreCache = { data: fresh, ts: Date.now() }
  return fresh
}

export async function writeHubStore(store: HubFallbackStore): Promise<void> {
  memoryStoreCache = { data: store, ts: Date.now() }
  const supabaseAdmin = createAdminClient()
  await ensureStorageBucket(supabaseAdmin)

  const payload = Buffer.from(JSON.stringify(store, null, 2), 'utf-8')
  await supabaseAdmin.storage.from(BUCKET_NAME).upload(STORE_FILE, payload, {
    upsert: true,
    contentType: 'application/json',
    cacheControl: '0',
  })
}

export function isMadhurleelaProperty(prop: { name?: string | null; slug?: string | null } | null | undefined): boolean {
  if (!prop) return false
  const haystack = `${prop.name || ''} ${prop.slug || ''}`.toLowerCase()
  return haystack.includes('madhurleela') || haystack.includes('madhureela')
}

/**
 * Ensures Madhurleela Holiday Home is 100% activated in both Postgres (if tables exist)
 * and the Storage store, with rooms 101-106, staff logins, and a demo active stay on Room 101.
 */
export async function ensureMadhurleelaActivated(): Promise<{
  activated: boolean
  propertyId?: string
  propertyName?: string
  rooms?: { id: string; room_number: string; qr_token: string }[]
  staffLogins?: { loginId: string; password: string; role: string }[]
  demoStay?: { roomNumber: string; qrToken: string; guestName: string; pinCode: string }
}> {
  const supabaseAdmin = createAdminClient()

  // Find Madhurleela Holiday Home in properties
  const { data: allProps } = await supabaseAdmin
    .from('properties')
    .select('*')
    .ilike('name', '%madhur%')
    .limit(5)

  let madhurProp = allProps?.[0] || null

  if (!madhurProp) {
    // Broad fallback search in case ilike filter missed
    const { data: propsList } = await supabaseAdmin.from('properties').select('*').limit(100)
    madhurProp = (propsList || []).find((p) => isMadhurleelaProperty(p)) || null
  }

  if (!madhurProp) {
    return { activated: false }
  }

  const propertyId: string = madhurProp.id
  const propertyName: string = madhurProp.name || 'Madhurleela Holiday Home'

  // 1. Ensure rooms exist in property_rooms for Madhurleela Holiday Home
  const { data: existingRooms } = await supabaseAdmin
    .from('property_rooms')
    .select('*')
    .eq('property_id', propertyId)
    .order('room_number', { ascending: true })

  let roomsList = existingRooms || []
  if (roomsList.length === 0) {
    const defaultRoomNumbers = ['101', '102', '103', '104', '105', '106']
    for (const rn of defaultRoomNumbers) {
      await supabaseAdmin.from('property_rooms').insert({
        property_id: propertyId,
        room_number: rn,
      })
    }
    const { data: refetchedRooms } = await supabaseAdmin
      .from('property_rooms')
      .select('*')
      .eq('property_id', propertyId)
      .order('room_number', { ascending: true })
    roomsList = refetchedRooms || []
  }

  const store = await readHubStore()
  let storeChanged = false

  // Assign deterministic madhurleela-<roomNumber> tokens
  const enrichedRooms: { id: string; property_id: string; room_number: string; qr_token: string }[] = []
  for (const r of roomsList) {
    const desiredToken = r.qr_token || store.roomTokens[r.id] || deterministicRoomToken(r.id, r.room_number, true)
    if (store.roomTokens[r.id] !== desiredToken) {
      store.roomTokens[r.id] = desiredToken
      storeChanged = true
    }
    // Also try updating qr_token in Postgres if the column exists
    if (!r.qr_token) {
      await supabaseAdmin
        .from('property_rooms')
        .update({ qr_token: desiredToken })
        .eq('id', r.id)
    }
    enrichedRooms.push({
      id: r.id,
      property_id: propertyId,
      room_number: r.room_number,
      qr_token: desiredToken,
    })
  }

  // 2. Ensure Guest Hub Settings for Madhurleela Holiday Home are active
  const now = new Date()
  const tenYearsOut = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString()

  const starterData = starter({
    hotelName: propertyName,
    city: madhurProp.city_area || madhurProp.city || 'Alibag',
    address: madhurProp.address || `${propertyName}, Alibag, Maharashtra`,
    countryCode: '91',
    primaryColor: '#2457a7',
    helpdeskPhone: madhurProp.helpdesk_number || '9876543210',
  })

  // Customize Wi-Fi for Madhurleela Holiday Home
  starterData.house_info.wifiName = 'Madhurleela_Guest_WiFi'
  starterData.house_info.wifiPassword = 'Welcome@Madhurleela'

  const settingsRecord = {
    id: store.hubSettings[propertyId]?.id || crypto.randomUUID(),
    property_id: propertyId,
    slug: 'madhurleela-holiday-home',
    hub_status: 'active',
    country_code: '91',
    timezone: 'Asia/Kolkata',
    subscription_status: 'active',
    paid_rooms_limit: Math.max(25, enrichedRooms.length),
    subscription_start_date: store.hubSettings[propertyId]?.subscription_start_date || now.toISOString(),
    subscription_end_date: tenYearsOut,
    plan_features: { phase1: true, phase2: true, phase3: true },
    branding: store.hubSettings[propertyId]?.branding || starterData.branding,
    departments: store.hubSettings[propertyId]?.departments || starterData.departments,
    house_info: store.hubSettings[propertyId]?.house_info || starterData.house_info,
    policies:
      store.hubSettings[propertyId]?.policies ||
      (madhurProp.house_rules ? madhurProp.house_rules.split('\n').filter(Boolean) : starterData.policies),
    services: store.hubSettings[propertyId]?.services || starterData.services,
    menu: store.hubSettings[propertyId]?.menu || starterData.menu,
    request_items: store.hubSettings[propertyId]?.request_items || starterData.request_items,
    local_guide: store.hubSettings[propertyId]?.local_guide || starterData.local_guide,
    emergency_contacts: store.hubSettings[propertyId]?.emergency_contacts || starterData.emergency_contacts,
    created_at: store.hubSettings[propertyId]?.created_at || now.toISOString(),
    updated_at: now.toISOString(),
  }

  if (
    !store.hubSettings[propertyId] ||
    store.hubSettings[propertyId].subscription_status !== 'active' ||
    store.hubSettings[propertyId].hub_status !== 'active'
  ) {
    store.hubSettings[propertyId] = settingsRecord
    storeChanged = true
  }

  // Also upsert in Postgres guest_hub_settings if table exists
  const { data: pgSettings } = await supabaseAdmin
    .from('guest_hub_settings')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()

  if (!pgSettings) {
    await supabaseAdmin.from('guest_hub_settings').insert({
      property_id: propertyId,
      slug: settingsRecord.slug,
      hub_status: 'active',
      country_code: '91',
      timezone: 'Asia/Kolkata',
      subscription_status: 'active',
      paid_rooms_limit: settingsRecord.paid_rooms_limit,
      subscription_start_date: settingsRecord.subscription_start_date,
      subscription_end_date: settingsRecord.subscription_end_date,
      branding: settingsRecord.branding,
      departments: settingsRecord.departments,
      house_info: settingsRecord.house_info,
      policies: settingsRecord.policies,
      services: settingsRecord.services,
      menu: settingsRecord.menu,
      request_items: settingsRecord.request_items,
      local_guide: settingsRecord.local_guide,
      emergency_contacts: settingsRecord.emergency_contacts,
    })
  } else if (pgSettings.subscription_status !== 'active' || pgSettings.hub_status !== 'active') {
    await supabaseAdmin
      .from('guest_hub_settings')
      .update({
        hub_status: 'active',
        subscription_status: 'active',
        paid_rooms_limit: Math.max(pgSettings.paid_rooms_limit || 0, 25),
        subscription_end_date: tenYearsOut,
      })
      .eq('property_id', propertyId)
  }

  // 3. Ensure Default Staff Users for Madhurleela Holiday Home
  const defaultStaffSpecs = [
    {
      name: 'Madhurleela Admin',
      login_id: 'madhurleela',
      rawPassword: 'admin123',
      role: 'admin',
      departments: ['front_desk', 'restaurant', 'housekeeping', 'emergency'],
    },
    {
      name: 'Front Desk Reception',
      login_id: 'reception',
      rawPassword: 'reception123',
      role: 'manager',
      departments: ['front_desk', 'restaurant', 'housekeeping', 'emergency'],
    },
    {
      name: 'Housekeeping Team',
      login_id: 'housekeeping',
      rawPassword: 'house123',
      role: 'staff',
      departments: ['housekeeping'],
    },
    {
      name: 'Kitchen & Restaurant',
      login_id: 'kitchen',
      rawPassword: 'kitchen123',
      role: 'kitchen',
      departments: ['restaurant'],
    },
  ]

  if (!store.staffUsers[propertyId] || store.staffUsers[propertyId].length === 0) {
    store.staffUsers[propertyId] = defaultStaffSpecs.map((s) => ({
      id: crypto.randomUUID(),
      property_id: propertyId,
      name: s.name,
      login_id: s.login_id,
      password_hash: hashPasswordSync(s.rawPassword),
      role: s.role,
      departments: s.departments,
      is_active: true,
      created_at: now.toISOString(),
    }))
    storeChanged = true
  }

  // Also ensure in Postgres hub_staff_users if table exists
  const { data: pgStaff, error: pgStaffErr } = await supabaseAdmin
    .from('hub_staff_users')
    .select('id, login_id')
    .eq('property_id', propertyId)

  if (!pgStaffErr && (!pgStaff || pgStaff.length === 0)) {
    for (const s of store.staffUsers[propertyId]) {
      await supabaseAdmin.from('hub_staff_users').insert({
        property_id: propertyId,
        name: s.name,
        login_id: s.login_id,
        password_hash: s.password_hash,
        role: s.role,
        departments: s.departments,
        is_active: true,
      })
    }
  }

  // 4. Ensure an active demo stay on Room 101 so QR testing works out-of-the-box
  const firstRoom = enrichedRooms[0]
  let demoStayInfo: { roomNumber: string; qrToken: string; guestName: string; pinCode: string } | undefined

  if (firstRoom) {
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const existingPropStays = store.stays[propertyId] || []

    if (existingPropStays.length === 0 && !store.madhurleelaSeeded) {
      const demoStayRecord = {
        id: crypto.randomUUID(),
        property_id: propertyId,
        room_id: firstRoom.id,
        guest_checkin_id: null,
        guest_name: 'Test Guest (Madhurleela)',
        guest_phone: null,
        pin_code: '1234',
        checkin_at: now.toISOString(),
        access_ends_at: sevenDaysOut,
        ended_at: null,
        ended_by: null,
        food_ordering_allowed: true,
        failed_pin_attempts: 0,
        pin_locked_until: null,
        created_by: 'System Auto-Setup',
        created_at: now.toISOString(),
      }
      store.stays[propertyId] = [demoStayRecord]
      store.madhurleelaSeeded = true
      storeChanged = true
    }

    // Also check Postgres hub_stays if table exists
    const { data: pgStays, error: pgStaysErr } = await supabaseAdmin
      .from('hub_stays')
      .select('*')
      .eq('property_id', propertyId)
      .limit(5)

    if (!pgStaysErr && (!pgStays || pgStays.length === 0)) {
      await supabaseAdmin.from('hub_stays').insert({
        property_id: propertyId,
        room_id: firstRoom.id,
        guest_name: 'Test Guest (Madhurleela)',
        pin_code: '1234',
        checkin_at: now.toISOString(),
        access_ends_at: sevenDaysOut,
        food_ordering_allowed: true,
        created_by: 'System Auto-Setup',
      })
    }

    const activeStayOnFirst =
      (store.stays[propertyId] || []).find((s) => s.room_id === firstRoom.id && !s.ended_at) || {
        guest_name: 'Test Guest (Madhurleela)',
        pin_code: '1234',
      }

    demoStayInfo = {
      roomNumber: firstRoom.room_number,
      qrToken: firstRoom.qr_token,
      guestName: activeStayOnFirst.guest_name,
      pinCode: activeStayOnFirst.pin_code,
    }
  }

  if (storeChanged) {
    await writeHubStore(store)
  }

  return {
    activated: true,
    propertyId,
    propertyName,
    rooms: enrichedRooms.map((r) => ({
      id: r.id,
      room_number: r.room_number,
      qr_token: r.qr_token,
    })),
    staffLogins: defaultStaffSpecs.map((s) => ({
      loginId: s.login_id,
      password: s.rawPassword,
      role: s.role,
    })),
    demoStay: demoStayInfo,
  }
}

/**
 * Resolves a room by its QR token across Postgres `property_rooms.qr_token`,
 * the Storage `roomTokens` map, or deterministic `madhurleela-<num>` / `rm-<num>-<id>` tokens.
 */
export async function resolveRoomByQrToken(qrToken: string): Promise<{
  id: string
  property_id: string
  room_number: string
  qr_token: string
  is_active: boolean
} | null> {
  const cleanToken = qrToken?.trim()
  if (!cleanToken) return null

  const supabaseAdmin = createAdminClient()

  // If token starts with madhurleela-, ensure Madhurleela is activated first
  if (cleanToken.toLowerCase().startsWith('madhurleela-')) {
    await ensureMadhurleelaActivated()
  }

  // 1. Try direct query on property_rooms.qr_token (works if SQL migration was applied)
  const { data: directRoom, error: directErr } = await supabaseAdmin
    .from('property_rooms')
    .select('*')
    .eq('qr_token', cleanToken)
    .maybeSingle()

  if (!directErr && directRoom) {
    return {
      id: directRoom.id,
      property_id: directRoom.property_id,
      room_number: directRoom.room_number,
      qr_token: directRoom.qr_token || cleanToken,
      is_active: directRoom.is_active !== false,
    }
  }

  // 2. Check Storage roomTokens map or deterministic token match
  const store = await readHubStore()
  const matchedRoomId = Object.entries(store.roomTokens).find(
    ([, tok]) => tok.toLowerCase() === cleanToken.toLowerCase()
  )?.[0]

  if (matchedRoomId) {
    const { data: roomById } = await supabaseAdmin
      .from('property_rooms')
      .select('*')
      .eq('id', matchedRoomId)
      .maybeSingle()

    if (roomById) {
      return {
        id: roomById.id,
        property_id: roomById.property_id,
        room_number: roomById.room_number,
        qr_token: cleanToken,
        is_active: roomById.is_active !== false,
      }
    }
  }

  // 3. Fallback scan of property_rooms for deterministic match
  const { data: allRooms } = await supabaseAdmin
    .from('property_rooms')
    .select('*, properties(name)')
    .limit(500)

  if (allRooms) {
    for (const r of allRooms) {
      const isMadhur = isMadhurleelaProperty(r.properties as any)
      const detTok = deterministicRoomToken(r.id, r.room_number, isMadhur)
      if (detTok.toLowerCase() === cleanToken.toLowerCase()) {
        return {
          id: r.id,
          property_id: r.property_id,
          room_number: r.room_number,
          qr_token: detTok,
          is_active: r.is_active !== false,
        }
      }
    }
  }

  return null
}
