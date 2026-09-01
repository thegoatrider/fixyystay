import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Use a static client for SEO fetchers since they run at build time (generateStaticParams)
// where cookies() are not available.
const createStaticClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn("WARNING: Supabase URL or Anon Key is missing. Returning a mock Supabase client.")
    return {
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({ data: [] }),
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null }),
            limit: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    } as any
  }
  return createSupabaseClient(url, key)
}

// Fetch top locations for generateStaticParams
export async function getTopLocations() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('seo_locations').select('slug').limit(50)
  return data || []
}

// Fetch top property types for generateStaticParams
export async function getTopPropertyTypes() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('seo_property_types').select('slug').limit(20)
  return data || []
}

// Fetch properties for a specific city and optional type
export async function getPropertiesForSEO(citySlug: string, propertyTypeSlug?: string) {
  const supabase = createStaticClient()
  
  let query = supabase.from('properties').select('id, name, slug, type, image_url, amenities, base_price, city_area, approved').eq('approved', true)
  
  if (citySlug) {
    // In a real app, you might map citySlug to the exact city string in DB or use a relational link.
    // Assuming citySlug matches the city column (e.g. 'alibag' matches 'Alibag')
    query = query.ilike('city', citySlug)
  }
  
  if (propertyTypeSlug) {
    // Basic mapping: 'villas' -> 'villa'
    const typeMap: Record<string, string> = {
      'villas': 'villa',
      'resorts': 'resort',
      'beach-stays': 'beach stay',
      'homestays': 'homestay',
      'hotels': 'hotel'
    }
    const mappedType = typeMap[propertyTypeSlug] || propertyTypeSlug
    query = query.ilike('type', mappedType)
  }
  
  const { data } = await query.limit(100)
  return data || []
}

export async function getLocationDetails(slug: string) {
  const supabase = createStaticClient()
  const { data } = await supabase.from('seo_locations').select('id, name, slug, state, intro_text, created_at').eq('slug', slug).maybeSingle()
  return data
}

export async function getPropertyBySlug(slugOrId: string) {
  const supabase = createStaticClient()
  // Try finding by slug first, fallback to ID if it looks like a UUID
  let query = supabase.from('properties').select(`
    id, name, type, description, amenities, highlights, address, city, city_area, state, pincode, contact_number, helpdesk_number, image_url, images, base_price, location, slug,
    rooms (id, name, category, base_price, max_guests, price_bucket, image_url),
    owners (name, email)
  `)
  
  // Basic UUID check
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)
  
  if (isUUID) {
    query = query.eq('id', slugOrId)
  } else {
    query = query.eq('slug', slugOrId)
  }
  
  const { data } = await query.maybeSingle()
  return data
}

export async function getTopProperties() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('properties').select('id, slug').eq('approved', true).limit(500)
  return data || []
}
