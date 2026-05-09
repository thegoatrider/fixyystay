import { MetadataRoute } from 'next'
import { getTopLocations, getTopPropertyTypes, getTopProperties } from '@/lib/seo-fetchers'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.fixystays.com'
  
  // Base static routes
  const routes = [
    '',
    '/guest',
    '/login',
    '/pricing/starter'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  try {
    // Fetch data for dynamic routes
    const [locations, propertyTypes, properties] = await Promise.all([
      getTopLocations(),
      getTopPropertyTypes(),
      getTopProperties()
    ])

    // Generate /stays-in-[city] routes
    const cityRoutes = locations.map((loc) => ({
      url: `${baseUrl}/stays-in-${loc.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    // Generate /[propertyType]-in-[city] routes
    const categoryRoutes = []
    for (const loc of locations) {
      for (const pt of propertyTypes) {
        categoryRoutes.push({
          url: `${baseUrl}/${pt.slug}-in-${loc.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        })
      }
    }

    // Generate /property/[slug] routes
    const propertyRoutes = properties.map((prop) => ({
      url: `${baseUrl}/property/${prop.slug || prop.id}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))

    return [...routes, ...cityRoutes, ...categoryRoutes, ...propertyRoutes]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return base routes if fetching fails
    return routes
  }
}
