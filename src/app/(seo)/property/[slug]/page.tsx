import { notFound } from 'next/navigation'
import { getPropertyBySlug, getTopProperties, getPropertiesForSEO } from '@/lib/seo-fetchers'
import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, CheckCircle, Wifi, Car, Coffee, Wind, Building } from 'lucide-react'

// Revalidate every hour
export const revalidate = 3600

// Generate the most popular property pages at build time
export async function generateStaticParams() {
  const properties = await getTopProperties()
  return properties.map((prop) => ({
    slug: prop.slug || prop.id, // Fallback to ID if slug is not yet generated
  }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const property = await getPropertyBySlug(params.slug)
  if (!property) return {}
  
  const title = `${property.name} | ${property.type} in ${property.city_area || property.city || 'India'} | FixyStays`
  const description = `Book ${property.name}, a premium ${property.type.toLowerCase()} in ${property.city_area || property.city}. Starting from ₹${property.base_price}. Amenities: ${(property.amenities || []).slice(0, 3).join(', ')}. Book now on FixyStays!`
  
  return {
    title,
    description,
    alternates: {
      canonical: `https://www.fixystays.com/property/${params.slug}`,
    }
  }
}

export default async function PropertyListingPage({ params }: { params: { slug: string } }) {
  const property = await getPropertyBySlug(params.slug)
  if (!property) notFound()

  // Fetch similar properties in the same city
  const similarProperties = await getPropertiesForSEO(property.city, property.type)
  const relatedStays = similarProperties.filter((p: any) => p.id !== property.id).slice(0, 3)

  // Quick icon mapper for amenities
  const getAmenityIcon = (name: string) => {
    const l = name.toLowerCase()
    if (l.includes('wifi') || l.includes('internet')) return <Wifi className="w-5 h-5" />
    if (l.includes('park') || l.includes('car')) return <Car className="w-5 h-5" />
    if (l.includes('kitchen') || l.includes('breakfast')) return <Coffee className="w-5 h-5" />
    if (l.includes('ac') || l.includes('air')) return <Wind className="w-5 h-5" />
    return <CheckCircle className="w-5 h-5 text-blue-500" />
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-100 py-3 px-4">
         <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <span>/</span>
            {property.city && (
              <>
                <Link href={`/stays-in-${property.city.toLowerCase()}`} className="hover:text-blue-600 transition">{property.city}</Link>
                <span>/</span>
                <Link href={`/${property.type.toLowerCase()}s-in-${property.city.toLowerCase()}`} className="hover:text-blue-600 transition">{property.type}s</Link>
                <span>/</span>
              </>
            )}
            <span className="text-gray-900 truncate max-w-[200px] sm:max-w-xs">{property.name}</span>
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            <div>
               <div className="flex items-center gap-2 mb-3">
                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{property.type}</span>
               </div>
               <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">{property.name}</h1>
               <div className="flex items-center gap-2 text-gray-500 font-medium">
                  <MapPin className="w-4 h-4" />
                  <span>{property.city_area}{property.city_area && property.city ? ', ' : ''}{property.city}</span>
               </div>
            </div>

            {/* Main Image */}
            <div className="w-full h-64 sm:h-96 rounded-3xl overflow-hidden border-4 border-white shadow-xl relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={property.image_url || '/placeholder.jpg'} alt={property.name} className="w-full h-full object-cover" />
            </div>

            {/* Description */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
               <h2 className="text-xl font-black text-gray-900 mb-4">About this {property.type}</h2>
               <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{property.description || `Welcome to ${property.name}, a beautiful ${property.type} located in ${property.city || 'a prime location'}. Experience comfort and luxury in a serene environment.`}</p>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
                 <h2 className="text-xl font-black text-gray-900 mb-6">Popular Amenities</h2>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {property.amenities.map((amenity: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-gray-700 font-medium">
                         <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                           {getAmenityIcon(amenity)}
                         </div>
                         <span className="capitalize">{amenity}</span>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>

          {/* Sticky Sidebar / Booking Box */}
          <div className="relative">
             <div className="sticky top-24 bg-white p-6 rounded-3xl border border-blue-100 shadow-xl shadow-blue-900/5 flex flex-col gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Starting from</p>
                  <div className="flex items-end gap-2">
                     <span className="text-4xl font-black text-gray-900">₹{property.base_price || 0}</span>
                     <span className="text-sm font-medium text-gray-500 pb-1">/ night</span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl flex items-start gap-3 border border-blue-100">
                   <Building className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                   <div>
                     <p className="text-sm font-bold text-blue-900">{property.type} Bookings</p>
                     <p className="text-xs text-blue-700 mt-1">To book this property or check detailed availability, please connect with our reservations team.</p>
                   </div>
                </div>

                <Link href={`https://wa.me/${property.helpdesk_number?.replace(/\D/g, '') || '917506288907'}?text=Hi, I am interested in booking ${property.name} in ${property.city}.`} target="_blank">
                  <button className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 hover:shadow-lg transition active:scale-95 shadow-blue-200">
                     Check Availability via WhatsApp
                  </button>
                </Link>

                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Secure Booking • Best Price Guarantee
                </p>
             </div>
          </div>

        </div>
      </div>

      {/* Similar Stays Grid */}
      {relatedStays.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 py-12 mt-8 border-t border-gray-200">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Similar {property.type}s in {property.city}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {relatedStays.map((prop: any) => (
              <div key={prop.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={prop.image_url || '/placeholder.jpg'} alt={prop.name} className="w-full h-48 object-cover" />
                 <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{prop.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{prop.city_area || property.city}</p>
                    <div className="flex items-center justify-between">
                       <span className="font-black text-blue-600">From ₹{prop.base_price || 0}</span>
                       <Link href={`/property/${prop.slug || prop.id}`}>
                          <button className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg text-sm hover:bg-blue-600 hover:text-white transition">View</button>
                       </Link>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Hotel",
            "name": property.name,
            "description": property.description,
            "image": property.image_url,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": property.city,
              "addressRegion": property.state || "Maharashtra",
              "addressCountry": "IN"
            },
            "priceRange": `₹${property.base_price}+`,
            "telephone": property.helpdesk_number || "+91-7506288907"
          })
        }}
      />
    </main>
  )
}
