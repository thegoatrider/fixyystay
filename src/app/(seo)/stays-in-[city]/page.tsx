import { notFound } from 'next/navigation'
import { getTopLocations, getLocationDetails, getPropertiesForSEO } from '@/lib/seo-fetchers'
import { PropertyCard } from '@/components/PropertyCard'
import { generateSEOContent } from '@/lib/seo-utils'
import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Star, Building } from 'lucide-react'

// Revalidate every hour
export const revalidate = 3600

// Generate Top 50 City Pages at Build Time
export async function generateStaticParams() {
  const locations = await getTopLocations()
  return locations.map((loc) => ({
    city: loc.slug,
  }))
}

// Generate Dynamic SEO Metadata
export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const location = await getLocationDetails(params.city)
  if (!location) return {}
  
  const seo = generateSEOContent(location.name)
  const url = `https://www.fixystays.com/stays-in-${params.city}`
  
  return {
    title: seo.title,
    description: seo.metaDescription,
    keywords: [`stays in ${location.name}`, `hotels in ${location.name}`, `villas in ${location.name}`, `resorts in ${location.name}`, 'Alibag stays', 'Fixy Stays'],
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

export default async function CityPage({ params }: { params: { city: string } }) {
  const location = await getLocationDetails(params.city)
  if (!location) notFound()

  const properties = await getPropertiesForSEO(location.name)
  const seo = generateSEOContent(location.name)

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-blue-200 text-sm font-bold uppercase tracking-widest mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span>{location.state}</span>
            <span>/</span>
            <span className="text-white">{location.name}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">{seo.h1}</h1>
          <p className="text-blue-100 max-w-2xl text-lg">{seo.metaDescription}</p>
        </div>
      </div>

      {/* Intro Text */}
      {location.intro_text && (
        <div className="bg-white border-b border-gray-100 py-8 px-4">
          <div className="max-w-5xl mx-auto text-gray-600">
            {location.intro_text}
          </div>
        </div>
      )}

      {/* Property Types Grid (Internal Linking) */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">Explore by Property Type</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {[
             { title: 'Villas', slug: 'villas', icon: Building },
             { title: 'Resorts', slug: 'resorts', icon: Star },
             { title: 'Beach Stays', slug: 'beach-stays', icon: MapPin },
             { title: 'Homestays', slug: 'homestays', icon: Building }
           ].map(type => (
             <Link 
                key={type.slug} 
                href={`/${type.slug}-in-${params.city}`}
                className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-center group"
             >
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                   <type.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900">{type.title} in {location.name}</h3>
             </Link>
           ))}
        </div>
      </div>

      {/* Property List */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-2xl font-black text-gray-900">Top Rated Stays in {location.name}</h2>
           <span className="text-sm font-bold text-gray-500">{properties.length} Properties</span>
        </div>
        
        {properties.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(prop => (
              // Note: PropertyCard from dashboard might need to be adapted or a new public one used.
              // For SEO we want it to link to /property/[slug]
              <div key={prop.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={prop.image_url || '/placeholder.jpg'} alt={prop.name} className="w-full h-48 object-cover" />
                 <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{prop.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{prop.city_area || location.name}</p>
                    <div className="flex items-center justify-between">
                       <span className="font-black text-blue-600">From ₹{prop.base_price || 0}</span>
                       <Link href={`/property/${prop.slug || prop.id}`}>
                          <button className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg text-sm hover:bg-blue-600 hover:text-white transition">View Deal</button>
                       </Link>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-3xl border border-gray-200">
             <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-gray-900">More properties coming soon!</h3>
             <p className="text-gray-500 mt-2">We are currently adding top stays in {location.name}.</p>
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
            "itemListElement": properties.map((prop, index) => ({
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
