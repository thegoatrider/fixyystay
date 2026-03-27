import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

async function geocodeAddress(address: string) {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    )
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      const { lat, lng } = result.geometry.location
      
      let area_name = ''
      let city = ''
      let state = ''
      
      result.address_components.forEach((comp: any) => {
        if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
          area_name = comp.long_name
        }
        if (comp.types.includes('locality')) {
          city = comp.long_name
        }
        if (comp.types.includes('administrative_area_level_1')) {
          state = comp.long_name
        }
      })

      return { lat, lng, area_name, city, state }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
  }
  return null
}

export async function GET() {
  const supabaseAdmin = createAdminClient()
  
  // 1. Fetch properties missing coordinates
  const { data: properties, error: fetchError } = await supabaseAdmin
    .from('properties')
    .select('id, name, city_area, city, pincode')
    .or('latitude.is.null,longitude.is.null')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!properties || properties.length === 0) {
    return NextResponse.json({ message: 'No properties found missing coordinates.' })
  }

  const results = []
  
  // 2. Process each property
  for (const prop of properties) {
    const searchQuery = `${prop.city_area || ''}, ${prop.city || ''}, ${prop.pincode || ''}, India`
    const geoData = await geocodeAddress(searchQuery)

    if (geoData) {
      const { error: updateError } = await supabaseAdmin
        .from('properties')
        .update({
          latitude: geoData.lat,
          longitude: geoData.lng,
          area_name: geoData.area_name || prop.city_area,
          city: geoData.city || prop.city,
          state: geoData.state,
        })
        .eq('id', prop.id)

      results.push({
        id: prop.id,
        name: prop.name,
        success: !updateError,
        error: updateError?.message || null,
        data: geoData
      })
    } else {
      results.push({
        id: prop.id,
        name: prop.name,
        success: false,
        error: 'Geocoding failed to return results'
      })
    }
    
    // Small delay to avoid aggressive rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return NextResponse.json({
    total: properties.length,
    processed: results.length,
    results
  })
}
