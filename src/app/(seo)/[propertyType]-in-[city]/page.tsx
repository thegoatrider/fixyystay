import { notFound } from 'next/navigation'
import { getTopLocations, getTopPropertyTypes, getLocationDetails, getPropertiesForSEO } from '@/lib/seo-fetchers'
import { generateSEOContent } from '@/lib/seo-utils'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin } from 'lucide-react'

// Revalidate every hour
export const revalidate = 3600

// Generate combinations of top cities and property types at Build Time
export async function generateStaticParams() {
  const locations = await getTopLocations()
  const propertyTypes = await getTopPropertyTypes()
  
  const params: { propertyType: string, city: string }[] = []
  
  // Create combinations (e.g., 50 cities * 5 types = 250 pages pre-rendered)
  for (const loc of locations) {
    for (const pt of propertyTypes) {
      params.push({
        propertyType: pt.slug,
        city: loc.slug
      })
    }
  }
  
  return params
}

export async function generateMetadata(props: { params: Promise<{ propertyType: string, city: string }> }): Promise<Metadata> {
  const params = await props.params
  const location = await getLocationDetails(params.city)
  if (!location) return {}
  
  const seo = generateSEOContent(location.name, params.propertyType)
  const url = `https://www.fixystays.com/${params.propertyType}-in-${params.city}`
  const humanReadableType = params.propertyType.replace('-', ' ')
  
  return {
    title: seo.title,
    description: seo.metaDescription,
    keywords: [`${humanReadableType} in ${location.name}`, `best ${humanReadableType} ${location.name}`, `book ${humanReadableType} Alibag`, 'Alibag stays', 'Fixy Stays'],
    openGraph: {
      title: seo.title,
      description: seo.metaDescription,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.metaDescription,
    },
    alternates: {
      canonical: url,
    }
  }
}

export default async function PropertyTypeCityPage(props: { params: Promise<{ propertyType: string, city: string }> }) {
  const params = await props.params
  const location = await getLocationDetails(params.city)
  if (!location) notFound()

  const properties = await getPropertiesForSEO(location.name, params.propertyType)
  const seo = generateSEOContent(location.name, params.propertyType)

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-900 to-blue-800 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-indigo-200 text-sm font-bold uppercase tracking-widest mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href={`/stays-in-${params.city}`} className="hover:text-white">{location.name}</Link>
            <span>/</span>
            <span className="text-white capitalize">{params.propertyType.replace('-', ' ')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">{seo.h1}</h1>
          <p className="text-indigo-100 max-w-2xl text-lg">{seo.metaDescription}</p>
        </div>
      </div>

      {/* Property List */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-2xl font-black text-gray-900 capitalize">Available {params.propertyType.replace('-', ' ')} in {location.name}</h2>
           <span className="text-sm font-bold text-gray-500">{properties.length} Properties</span>
        </div>
        
        {properties.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop: any) => (
              <div key={prop.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition duration-300">
                 <div className="relative w-full h-56">
                   <Image 
                     src={prop.image_url || '/placeholder.jpg'} 
                     alt={prop.name} 
                     fill 
                     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                     className="object-cover" 
                   />
                 </div>
                 <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{prop.type}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{prop.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{prop.city_area || location.name}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                       <div>
                         <p className="text-[10px] uppercase font-bold text-gray-400">Starting from</p>
                         <span className="font-black text-xl text-gray-900">₹{prop.base_price || 0}</span>
                         <span className="text-xs text-gray-500"> / night</span>
                       </div>
                       <Link href={`/property/${prop.slug || prop.id}`}>
                          <button className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition">Book Now</button>
                       </Link>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center bg-white rounded-3xl border border-gray-200">
             <MapPin className="w-16 h-16 text-gray-200 mx-auto mb-4" />
             <h3 className="text-2xl font-black text-gray-900 mb-2">No {params.propertyType.replace('-', ' ')} found</h3>
             <p className="text-gray-500 max-w-sm mx-auto mb-6">We currently don't have any matching properties in {location.name}. Try exploring other stays in this area.</p>
             <Link href={`/stays-in-${params.city}`}>
                <button className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition">
                  View All Stays in {location.name}
                </button>
             </Link>
          </div>
        )}
      </div>
      
      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": seo.h1,
            "description": seo.metaDescription,
            "itemListElement": properties.map((prop: any, index: number) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "LodgingBusiness",
                "name": prop.name,
                "url": `https://www.fixystays.com/property/${prop.slug || prop.id}`
              }
            }))
          })
        }}
      />
    </main>
  )
}
