'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Star, ShieldCheck, Zap } from 'lucide-react';

const PROPERTIES = [
  {
    id: '5056d71d-f835-4379-9ce4-470dd34faa80',
    name: 'Beach front Bliss Varsoli Beach',
    location: 'Varsoli, Alibag',
    image: 'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-cover-4c6ce4a5-8aac-4f44-8ada-b02f17eec77a-1776008290774-zv7r8.jpg',
    price: 999,
    rating: 4.88,
    reviews: 124,
    instantBook: true,
    ownerVerified: true,
    amenities: ['WiFi', 'BBQ', 'Pet Friendly'],
  },
  {
    id: 'bc817e14-c9bb-448e-837a-9b295ba5923f',
    name: 'Panchavati Beach Resort',
    location: 'Nagaon, Alibag',
    image: 'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-cover-58173aa1-8b36-4b43-ad5d-943f90499235-1776149133851-ktyre.jpg',
    price: 2999,
    rating: 4.95,
    reviews: 89,
    instantBook: false,
    ownerVerified: true,
    amenities: ['Pool', 'Beach view', 'Bonfire'],
  },
  {
    id: 'ce187836-af99-4c1d-a7e4-d82c8586b5a3',
    name: 'Tridev Costal villa',
    location: 'Varsoli, Alibag',
    image: 'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-cover-4be8802d-6daa-4e8e-b999-b54a0fba5a2f-1776431220281-k88ho.jpg',
    price: 14999,
    rating: 4.98,
    reviews: 210,
    instantBook: true,
    ownerVerified: true,
    amenities: ['Pool', 'AC', 'BBQ'],
  }
];

export function FeaturedProperties() {
  return (
    <section className="w-full py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Handpicked Stays
          </h2>
          <p className="text-gray-500 mt-3 text-lg">
            Premium properties verified for the best experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PROPERTIES.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Image Gallery area (simplified to 1 image for now, but styled for gallery) */}
              <div className="relative w-full aspect-[4/3] overflow-hidden">
                <img 
                  src={property.image} 
                  alt={property.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                
                {/* Top Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {property.instantBook && (
                    <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Zap className="w-3.5 h-3.5 text-blue-600" fill="currentColor" /> Instant Book
                    </span>
                  )}
                </div>

                {/* Heart Button */}
                <button className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-red-500 transition-colors shadow-sm">
                  <Heart className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-extrabold text-gray-900 text-xl truncate pr-4">
                    {property.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm font-bold bg-gray-50 px-2 py-1 rounded-lg shrink-0">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{property.rating}</span>
                  </div>
                </div>
                
                <p className="text-gray-500 font-medium text-sm mb-4">
                  {property.location}
                </p>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {property.amenities.map(amenity => (
                    <span key={amenity} className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                      {amenity}
                    </span>
                  ))}
                </div>

                {/* Bottom line */}
                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-gray-900 font-extrabold text-xl">
                      ₹{property.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-gray-500 text-xs font-medium">night</span>
                  </div>
                  
                  <Link href={`/guest/property/${property.id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 text-center flex items-center justify-center">
                    Book Now
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
