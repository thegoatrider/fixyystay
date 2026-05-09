import { createClient } from '@/utils/supabase/server'

// Fetch top locations for generateStaticParams
export async function getTopLocations() {
  const supabase = await createClient()
  const { data } = await supabase.from('seo_locations').select('slug').limit(50)
  return data || []
}

// Fetch top property types for generateStaticParams
export async function getTopPropertyTypes() {
  const supabase = await createClient()
  const { data } = await supabase.from('seo_property_types').select('slug').limit(20)
  return data || []
}

// Fetch properties for a specific city and optional type
export async function getPropertiesForSEO(citySlug: string, propertyTypeSlug?: string) {
  const supabase = await createClient()
  
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
  const supabase = await createClient()
  const { data } = await supabase.from('seo_locations').select('*').eq('slug', slug).maybeSingle()
  return data
}
