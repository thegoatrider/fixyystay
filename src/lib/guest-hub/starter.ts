export interface ShiftWindow {
  id: string
  label: string
  start: string // "HH:mm" e.g. "08:00"
  end: string   // "HH:mm" e.g. "20:00" or "06:00" (crosses midnight)
  phone: string
}

export interface DepartmentConfig {
  id: 'front_desk' | 'restaurant' | 'housekeeping' | 'emergency' | string
  name: string
  extension: string
  routingMode: 'fixed' | 'shift'
  fixedPhone: string
  fallbackPhone: string
  shifts: ShiftWindow[]
}

export interface BrandingConfig {
  hotelName: string
  city: string
  address: string
  logoUrl: string
  monogram: string
  primaryColor: string
  welcomeMessage: string
}

export interface ExtraTiming {
  id: string
  label: string
  value: string
}

export interface HouseInfoConfig {
  wifiName: string
  wifiPassword: string
  checkinTime: string
  checkoutTime: string
  breakfastStart: string
  breakfastEnd: string
  restaurantOpen: string
  restaurantClose: string
  restaurantAlwaysOpen?: boolean
  extraTimings: ExtraTiming[]
}

export interface ServiceKeyConfig {
  enabled: boolean
  department: string // e.g. 'front_desk', 'restaurant', 'housekeeping'
  label: string
  description: string
}

export type ServiceId =
  | 'restaurant'
  | 'housekeeping'
  | 'minibar'
  | 'spa'
  | 'laundry'
  | 'taxi'
  | 'special_occasions'

export type ServicesMap = Record<ServiceId, ServiceKeyConfig>

export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  isVeg: boolean
  available: boolean
}

export interface MenuCategory {
  id: string
  name: string
  items: MenuItem[]
}

export interface HousekeepingGroup {
  id: string
  name: string
  items: { id: string; name: string; maxQty?: number }[]
}

export interface PricedRequestItem {
  id: string
  name: string
  price: number
  category?: string
}

export interface SpaTreatmentItem {
  id: string
  name: string
  duration: string
  price: number
}

export interface RequestItemsCatalog {
  housekeeping: HousekeepingGroup[]
  minibar: PricedRequestItem[]
  laundry: PricedRequestItem[]
  spa: SpaTreatmentItem[]
}

export interface LocalGuidePlace {
  id: string
  category: 'Food & Cafes' | 'Sights & Beaches' | 'Shopping & Markets' | 'ATMs & Pharmacy'
  name: string
  description: string
}

export interface EmergencyContactItem {
  id: string
  label: string
  phone: string
  isPublicHelpline?: boolean
}

export interface StarterHotelPayload {
  slug: string
  country_code: string
  timezone: string
  branding: BrandingConfig
  departments: Record<string, DepartmentConfig>
  house_info: HouseInfoConfig
  policies: string[]
  services: ServicesMap
  menu: MenuCategory[]
  request_items: RequestItemsCatalog
  local_guide: LocalGuidePlace[]
  emergency_contacts: EmergencyContactItem[]
}

export function slugifyHotelName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `hotel-${Date.now()}`
  )
}

export function generateMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'GH'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Generates the complete starter() configuration for any newly onboarded or activated hotel.
 */
export function starter(opts: {
  hotelName: string
  city?: string
  address?: string
  countryCode?: string
  primaryColor?: string
  enabledServices?: Partial<Record<ServiceId, boolean>>
  helpdeskPhone?: string
}): StarterHotelPayload {
  const hotelName = opts.hotelName?.trim() || 'Madhureela Holiday Home'
  const city = opts.city?.trim() || 'Alibag'
  const address = opts.address?.trim() || `${hotelName}, ${city}`
  const countryCode = (opts.countryCode || '91').replace(/\D/g, '') || '91'
  const primaryColor = opts.primaryColor || '#2563eb'
  const defaultPhone = opts.helpdeskPhone || ''

  const enabled = {
    restaurant: opts.enabledServices?.restaurant ?? true,
    housekeeping: opts.enabledServices?.housekeeping ?? true,
    minibar: opts.enabledServices?.minibar ?? true,
    spa: opts.enabledServices?.spa ?? true,
    laundry: opts.enabledServices?.laundry ?? true,
    taxi: opts.enabledServices?.taxi ?? true,
    special_occasions: opts.enabledServices?.special_occasions ?? true,
  }

  return {
    slug: slugifyHotelName(hotelName),
    country_code: countryCode,
    timezone: 'Asia/Kolkata',
    branding: {
      hotelName,
      city,
      address,
      logoUrl: '',
      monogram: generateMonogram(hotelName),
      primaryColor,
      welcomeMessage: `Welcome to ${hotelName}! Everything you need for a comfortable stay is right here—no app downloads or phone numbers needed.`,
    },
    departments: {
      front_desk: {
        id: 'front_desk',
        name: 'Front Desk',
        extension: '9',
        routingMode: 'fixed',
        fixedPhone: defaultPhone,
        fallbackPhone: defaultPhone,
        shifts: [
          { id: 's1', label: 'Day Shift', start: '08:00', end: '20:00', phone: defaultPhone },
          { id: 's2', label: 'Night Shift', start: '20:00', end: '08:00', phone: defaultPhone },
        ],
      },
      restaurant: {
        id: 'restaurant',
        name: 'Restaurant',
        extension: '2',
        routingMode: 'fixed',
        fixedPhone: defaultPhone,
        fallbackPhone: defaultPhone,
        shifts: [],
      },
      housekeeping: {
        id: 'housekeeping',
        name: 'Housekeeping',
        extension: '3',
        routingMode: 'fixed',
        fixedPhone: defaultPhone,
        fallbackPhone: defaultPhone,
        shifts: [],
      },
      emergency: {
        id: 'emergency',
        name: 'Emergency',
        extension: '0',
        routingMode: 'fixed',
        fixedPhone: defaultPhone,
        fallbackPhone: defaultPhone,
        shifts: [],
      },
    },
    house_info: {
      wifiName: `${hotelName.split(' ')[0]}_Guest_WiFi`,
      wifiPassword: 'welcome123',
      checkinTime: '12:00 PM',
      checkoutTime: '11:00 AM',
      breakfastStart: '08:00 AM',
      breakfastEnd: '10:30 AM',
      restaurantOpen: '07:30',
      restaurantClose: '22:30',
      restaurantAlwaysOpen: true,
      extraTimings: [
        { id: 'et1', label: 'Swimming Pool', value: '07:00 AM – 07:00 PM' },
        { id: 'et2', label: 'Quiet Hours', value: '10:30 PM – 07:00 AM' },
      ],
    },
    policies: [
      'Valid government photo ID is mandatory for all guests at check-in.',
      'Standard check-in is 12:00 PM and check-out is 11:00 AM. Late check-out is subject to availability.',
      'Smoking inside the rooms is strictly prohibited; please use designated outdoor areas.',
      'Outside visitors are permitted in the lobby area only between 9:00 AM and 8:00 PM.',
      'Please keep noise levels low after 10:30 PM out of respect for fellow guests.',
      'Valuables should be kept safely; management is not responsible for unattended items.',
    ],
    services: {
      restaurant: {
        enabled: enabled.restaurant,
        department: 'restaurant',
        label: 'Restaurant & In-Room Dining',
        description: 'Freshly prepared dishes & beverages delivered to your room',
      },
      housekeeping: {
        enabled: enabled.housekeeping,
        department: 'housekeeping',
        label: 'Housekeeping',
        description: 'Towels, toiletries, room cleaning & extra bedding',
      },
      minibar: {
        enabled: enabled.minibar,
        department: 'housekeeping',
        label: 'Mini Bar',
        description: 'Chilled drinks, snacks & refreshments',
      },
      spa: {
        enabled: enabled.spa,
        department: 'front_desk',
        label: 'Spa & Wellness',
        description: 'Relaxing massages & wellness treatments',
      },
      laundry: {
        enabled: enabled.laundry,
        department: 'housekeeping',
        label: 'Laundry & Pressing',
        description: 'Wash, fold & steam iron services',
      },
      taxi: {
        enabled: enabled.taxi,
        department: 'front_desk',
        label: 'Taxi & Transfers',
        description: 'Local sightseeing, ferry/station drops & cab bookings',
      },
      special_occasions: {
        enabled: enabled.special_occasions,
        department: 'front_desk',
        label: 'Special Occasions',
        description: 'Cakes, floral arrangements & celebration setups',
      },
    },
    menu: [
      {
        id: 'cat_breakfast',
        name: 'Breakfast',
        items: [
          { id: 'm1', name: 'Poha with Sev & Lemon', description: 'Traditional Maharashtrian flattened rice', price: 120, isVeg: true, available: true },
          { id: 'm2', name: 'Aloo Paratha (2 pcs)', description: 'Served with curd and pickle', price: 160, isVeg: true, available: true },
          { id: 'm3', name: 'Masala Omelette with Toast', description: '2-egg spicy omelette with buttered toast', price: 150, isVeg: false, available: true },
          { id: 'm4', name: 'Idli Sambar & Chutney', description: 'Steamed rice cakes with hot sambar', price: 130, isVeg: true, available: true },
        ],
      },
      {
        id: 'cat_mains',
        name: 'All-Day Mains',
        items: [
          { id: 'm5', name: 'Paneer Tikka Masala', description: 'Rich tomato & cashew gravy', price: 280, isVeg: true, available: true },
          { id: 'm6', name: 'Dal Tadka & Jeera Rice Bowl', description: 'Comforting yellow dal with tempered spices', price: 220, isVeg: true, available: true },
          { id: 'm7', name: 'Konkani Chicken Curry', description: 'Authentic coastal spice curry', price: 340, isVeg: false, available: true },
          { id: 'm8', name: 'Butter Garlic Naan / Chapati (2 pcs)', description: 'Freshly baked Indian bread', price: 80, isVeg: true, available: true },
        ],
      },
      {
        id: 'cat_beverages',
        name: 'Beverages & Refreshments',
        items: [
          { id: 'm9', name: 'Masala Chai', description: 'Spiced Indian milk tea', price: 50, isVeg: true, available: true },
          { id: 'm10', name: 'Fresh Lime Soda (Sweet / Salted)', description: 'Refreshing citrus cooler', price: 80, isVeg: true, available: true },
          { id: 'm11', name: 'Filter Coffee', description: 'Hot South Indian style brew', price: 70, isVeg: true, available: true },
          { id: 'm12', name: 'Sol Kadhi', description: 'Coastal kokum & coconut milk digestive', price: 90, isVeg: true, available: true },
        ],
      },
    ],
    request_items: {
      housekeeping: [
        {
          id: 'hk_towels',
          name: 'Towels & Linen',
          items: [
            { id: 'hk1', name: 'Bath Towel', maxQty: 4 },
            { id: 'hk2', name: 'Hand Towel', maxQty: 4 },
            { id: 'hk3', name: 'Bath Mat', maxQty: 2 },
            { id: 'hk4', name: 'Extra Pillow', maxQty: 4 },
            { id: 'hk5', name: 'Extra Blanket / Duvets', maxQty: 2 },
          ],
        },
        {
          id: 'hk_toiletries',
          name: 'Toiletries & Essentials',
          items: [
            { id: 'hk6', name: 'Dental Kit (Brush & Paste)', maxQty: 4 },
            { id: 'hk7', name: 'Soap / Body Wash', maxQty: 4 },
            { id: 'hk8', name: 'Shampoo & Conditioner', maxQty: 4 },
            { id: 'hk9', name: 'Toilet Roll', maxQty: 4 },
            { id: 'hk10', name: 'Drinking Water Bottle (1L)', maxQty: 6 },
          ],
        },
        {
          id: 'hk_cleaning',
          name: 'Room Care',
          items: [
            { id: 'hk11', name: 'Make Up / Clean My Room', maxQty: 1 },
            { id: 'hk12', name: 'Clear Room Trash Bin', maxQty: 1 },
            { id: 'hk13', name: 'Mosquito Repellent Refill', maxQty: 2 },
          ],
        },
      ],
      minibar: [
        { id: 'mb1', name: 'Mineral Water (1L)', price: 30 },
        { id: 'mb2', name: 'Coca-Cola / Thums Up (Can)', price: 60 },
        { id: 'mb3', name: 'Red Bull Energy Drink', price: 150 },
        { id: 'mb4', name: 'Roasted Cashews (Salted)', price: 120 },
        { id: 'mb5', name: 'Potato Chips / Nachos', price: 60 },
        { id: 'mb6', name: 'Dairy Milk Silk Chocolate', price: 110 },
      ],
      laundry: [
        { id: 'ld1', name: 'Shirt / T-Shirt (Wash & Iron)', price: 60 },
        { id: 'ld2', name: 'Trousers / Jeans (Wash & Iron)', price: 80 },
        { id: 'ld3', name: 'Kurta / Dress (Wash & Iron)', price: 90 },
        { id: 'ld4', name: 'Shirt / Top (Steam Iron Only)', price: 35 },
        { id: 'ld5', name: 'Trousers (Steam Iron Only)', price: 40 },
      ],
      spa: [
        { id: 'sp1', name: 'Swedish Relaxing Full Body Massage', duration: '60 mins', price: 1800 },
        { id: 'sp2', name: 'Deep Tissue Back & Shoulder Relief', duration: '45 mins', price: 1400 },
        { id: 'sp3', name: 'Traditional Head, Neck & Foot Massage', duration: '30 mins', price: 900 },
        { id: 'sp4', name: 'Aromatherapy Rejuvenation', duration: '60 mins', price: 2100 },
      ],
    },
    local_guide: [
      {
        id: 'lg1',
        category: 'Sights & Beaches',
        name: `${city} Main Beach & Promenade`,
        description: 'Sunset views, water sports, and coastal walks',
      },
      {
        id: 'lg2',
        category: 'Sights & Beaches',
        name: 'Kolaba Historic Sea Fort',
        description: 'Ancient sea fort accessible during low tide',
      },
      {
        id: 'lg3',
        category: 'Food & Cafes',
        name: 'Sanman Coastal Seafood',
        description: 'Famous for authentic local thalis and sol kadhi',
      },
      {
        id: 'lg4',
        category: 'Food & Cafes',
        name: 'Boardwalk Cafe & Bakery',
        description: 'Artisanal coffee, wood-fired pizza, and desserts',
      },
      {
        id: 'lg5',
        category: 'Shopping & Markets',
        name: `${city} Main Town Market`,
        description: 'Local spices, cashews, kokum, and handicrafts',
      },
      {
        id: 'lg6',
        category: 'ATMs & Pharmacy',
        name: '24x7 Medical Store & SBI ATM',
        description: 'Located near the main market circle',
      },
    ],
    emergency_contacts: [
      { id: 'em1', label: 'National Emergency Response', phone: '112', isPublicHelpline: true },
      { id: 'em2', label: 'Police Control Room', phone: '100', isPublicHelpline: true },
      { id: 'em3', label: 'Ambulance & Medical Emergency', phone: '108', isPublicHelpline: true },
      { id: 'em4', label: 'Fire Brigade', phone: '101', isPublicHelpline: true },
      { id: 'em5', label: 'Tourist Helpline', phone: '1363', isPublicHelpline: true },
    ],
  }
}

/**
 * Formats a phone number according to Guest Hub rules:
 * - Strip everything except digits.
 * - An 11-digit number starting with 0 drops the 0 first.
 * - A 10-digit number gets the hotel's country code in front.
 */
export function formatHubPhoneNumber(rawPhone: string, countryCode: string = '91'): string {
  if (!rawPhone) return ''
  let digits = rawPhone.replace(/\D/g, '')
  if (!digits) return ''

  // Short emergency numbers (e.g. 100, 101, 108, 112, 1363) stay as-is
  if (digits.length <= 5) {
    return digits
  }

  const cleanCc = countryCode.replace(/\D/g, '') || '91'

  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  if (digits.length === 10) {
    return `+${cleanCc}${digits}`
  }

  return `+${digits}`
}

/**
 * Shift routing logic (deptNumber()):
 * - For a number set by shift, use the shift whose time window contains the current time in the hotel's time zone.
 * - Windows can cross midnight (e.g., 20:00 to 08:00).
 * - If no shift matches, use the fallback number.
 */
export function deptNumber(
  dept: DepartmentConfig | undefined,
  countryCode: string = '91',
  timezone: string = 'Asia/Kolkata',
  now: Date = new Date()
): string {
  if (!dept) return ''

  if (dept.routingMode !== 'shift' || !dept.shifts || dept.shifts.length === 0) {
    return formatHubPhoneNumber(dept.fixedPhone || dept.fallbackPhone, countryCode)
  }

  const currentMinutes = getMinutesSinceMidnightInTz(now, timezone)

  for (const shift of dept.shifts) {
    if (!shift.phone || !shift.start || !shift.end) continue
    const startMins = parseTimeStrToMinutes(shift.start)
    const endMins = parseTimeStrToMinutes(shift.end)
    if (startMins === null || endMins === null) continue

    let matches = false
    if (startMins <= endMins) {
      // Normal daytime shift (e.g., 08:00 to 20:00)
      matches = currentMinutes >= startMins && currentMinutes < endMins
    } else {
      // Shift crosses midnight (e.g., 20:00 to 08:00)
      matches = currentMinutes >= startMins || currentMinutes < endMins
    }

    if (matches) {
      return formatHubPhoneNumber(shift.phone, countryCode)
    }
  }

  return formatHubPhoneNumber(dept.fallbackPhone || dept.fixedPhone, countryCode)
}

function parseTimeStrToMinutes(timeStr: string): number | null {
  const clean = timeStr.trim()
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10)
  }
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let h = parseInt(match12[1], 10)
    const m = parseInt(match12[2], 10)
    const period = match12[3].toUpperCase()
    if (period === 'PM' && h < 12) h += 12
    if (period === 'AM' && h === 12) h = 0
    return h * 60 + m
  }
  return null
}

function getMinutesSinceMidnightInTz(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(date)
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10) % 24
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)
    return hour * 60 + minute
  } catch {
    return date.getHours() * 60 + date.getMinutes()
  }
}

/**
 * Checks whether the restaurant is currently open based on opening/closing times in the hotel's timezone.
 */
export function isRestaurantOpen(
  openStr?: string,
  closeStr?: string,
  timezone: string = 'Asia/Kolkata',
  now: Date = new Date(),
  alwaysOpen?: boolean
): boolean {
  if (alwaysOpen !== false) return true
  if (!openStr || !closeStr) return true
  if (openStr === '00:00' && (closeStr === '23:59' || closeStr === '24:00')) return true

  const openMins = parseTimeStrToMinutes(openStr)
  const closeMins = parseTimeStrToMinutes(closeStr)
  if (openMins === null || closeMins === null) return true

  const currentMins = getMinutesSinceMidnightInTz(now, timezone)
  if (openMins <= closeMins) {
    return currentMins >= openMins && currentMins <= closeMins
  } else {
    return currentMins >= openMins || currentMins <= closeMins
  }
}
