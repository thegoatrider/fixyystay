/**
 * Centralized Property Subscription Pricing & City Tier Logic
 *
 * Rate Structure:
 * 1. Alibag / Raigad district & Non-Metro Cities:
 *    - 1–6 rooms:   ₹199 / month
 *    - 7–12 rooms:  ₹299 / month
 *    - 13–20 rooms: ₹399 / month
 *    - 21–30 rooms: ₹499 / month
 *    - 31–50 rooms: ₹599 / month
 *    - 51–75 rooms: ₹999 / month
 *    - 76–100 rooms: ₹1,399 / month
 *
 * 2. Metro Cities (Mumbai, Delhi/NCR, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad):
 *    - 1–6 rooms:   ₹299 / month
 *    - 7–12 rooms:  ₹399 / month
 *    - 13–20 rooms: ₹499 / month
 *    - 21–30 rooms: ₹599 / month
 *    - 31–50 rooms: ₹899 / month
 *    - 51–75 rooms: ₹1,299 / month
 *    - 76–100 rooms: ₹1,599 / month
 */

export interface PricingBracket {
  minRooms: number
  maxRooms: number
  nonMetroFee: number
  metroFee: number
  label: string
}

export const PRICING_BRACKETS: PricingBracket[] = [
  { minRooms: 1, maxRooms: 6, nonMetroFee: 100, metroFee: 100, label: '1–6 Rooms' },
  { minRooms: 7, maxRooms: 12, nonMetroFee: 150, metroFee: 150, label: '7–12 Rooms' },
  { minRooms: 13, maxRooms: 20, nonMetroFee: 250, metroFee: 250, label: '13–20 Rooms' },
  { minRooms: 21, maxRooms: 30, nonMetroFee: 350, metroFee: 350, label: '21–30 Rooms' },
  { minRooms: 31, maxRooms: 50, nonMetroFee: 500, metroFee: 500, label: '31–50 Rooms' },
  { minRooms: 51, maxRooms: 75, nonMetroFee: 750, metroFee: 750, label: '51–75 Rooms' },
  { minRooms: 76, maxRooms: 100, nonMetroFee: 1000, metroFee: 1000, label: '76–100 Rooms' },
]

// Recognized Metro City / District keywords
const METRO_KEYWORDS = [
  'mumbai',
  'bombay',
  'navi mumbai',
  'thane',
  'delhi',
  'new delhi',
  'ncr',
  'gurgaon',
  'gurugram',
  'noida',
  'greater noida',
  'ghaziabad',
  'faridabad',
  'bengaluru',
  'bangalore',
  'hyderabad',
  'secunderabad',
  'chennai',
  'madras',
  'kolkata',
  'calcutta',
  'pune',
  'ahmedabad',
]

// Alibag & Raigad district keywords (always explicitly non-metro)
const ALIBAG_RAIGAD_KEYWORDS = [
  'alibag',
  'alibaug',
  'raigad',
  'kihim',
  'nagaon',
  'varsoli',
  'awas',
  'mandwa',
  'revdanda',
  'chaul',
  'korlai',
  'kashid',
  'murud',
  'shrivardhan',
  'diveagar',
  'harihareshwar',
  'roha',
  'kolad',
  'mahad',
  'mangaon',
  'pen',
  'karjat',
  'matheran',
  'khopoli',
  'poynad',
  'chendhare',
  'zirad',
  'mapgaon',
]

/**
 * Determines whether a location is a Metro city or Non-Metro (Alibag/Raigad/tier 2/3).
 */
export function isMetroCity(
  city?: string | null,
  state?: string | null,
  pincode?: string | null
): boolean {
  const cleanPin = (pincode || '').replace(/\D/g, '').trim()
  const cleanCity = (city || '').toLowerCase().trim()
  const cleanState = (state || '').toLowerCase().trim()

  // 1. Alibag & Raigad district PIN codes (402xxx) are always Non-Metro
  if (cleanPin.startsWith('402')) {
    return false
  }

  // 2. Explicit Alibag / Raigad keyword match
  if (
    ALIBAG_RAIGAD_KEYWORDS.some((kw) => cleanCity.includes(kw) || cleanState.includes(kw))
  ) {
    return false
  }

  // 3. Metro PIN code prefixes
  // 400 = Mumbai, 110 = Delhi, 560 = Bengaluru, 500 = Hyderabad, 600 = Chennai, 700 = Kolkata, 411 = Pune, 380 = Ahmedabad
  if (
    cleanPin.startsWith('400') ||
    cleanPin.startsWith('110') ||
    cleanPin.startsWith('560') ||
    cleanPin.startsWith('500') ||
    cleanPin.startsWith('600') ||
    cleanPin.startsWith('700') ||
    cleanPin.startsWith('411') ||
    cleanPin.startsWith('380')
  ) {
    return true
  }

  // 4. Metro keyword match
  return METRO_KEYWORDS.some(
    (kw) => cleanCity.includes(kw) || cleanState.includes(kw)
  )
}

export interface CalculateFeeResult {
  monthlyFee: number | null
  isMetro: boolean
  tierName: string
  bracket: PricingBracket | null
  overLimit: boolean
  error?: string
}

/**
 * Computes monthly fee strictly based on effective room count & location.
 */
export function calculateMonthlyFee({
  roomCount,
  city,
  state,
  pincode,
}: {
  roomCount: number
  city?: string | null
  state?: string | null
  pincode?: string | null
}): CalculateFeeResult {
  const metro = isMetroCity(city, state, pincode)
  const tierName = metro ? 'Metro Tier' : 'Alibag & Non-Metro Tier'

  if (roomCount > 100) {
    return {
      monthlyFee: null,
      isMetro: metro,
      tierName,
      bracket: null,
      overLimit: true,
      error: 'Properties with over 100 rooms require manual onboarding. Please contact support.',
    }
  }

  const effective = Math.max(1, roomCount)
  const bracket =
    PRICING_BRACKETS.find(
      (b) => effective >= b.minRooms && effective <= b.maxRooms
    ) || PRICING_BRACKETS[0]

  const fee = metro ? bracket.metroFee : bracket.nonMetroFee

  return {
    monthlyFee: fee,
    isMetro: metro,
    tierName,
    bracket,
    overLimit: false,
  }
}
