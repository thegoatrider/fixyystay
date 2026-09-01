'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const DESTINATIONS = [
  {
    name: 'Nagaon',
    image: 'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-cover-update-53d8475a-a9e1-4e4e-9adf-7a927c9d2523-1784227473554-bjphm.jpg',
    rating: 4.9,
    price: 2000,
    count: 12,
    tagline: 'Water sports & golden sands',
    span: 'col-span-1 md:col-span-2 row-span-2',
  },
  {
    name: 'Varsoli',
    image: 'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-cover-4c6ce4a5-8aac-4f44-8ada-b02f17eec77a-1776008290774-zv7r8.jpg',
    rating: 4.8,
    price: 999,
    count: 8,
    tagline: 'Luxury stays near the beach',
    span: 'col-span-1 row-span-1',
  },
  {
    name: 'Kashid',
    image: 'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-cover-ee2ba7a0-558c-4526-b467-7872b82c909b-1776264530077-oqe5d.jpg',
    rating: 4.7,
    price: 3000,
    count: 5,
    tagline: 'White sand & peaceful stays',
    span: 'col-span-1 row-span-1',
  },
  {
    name: 'Revdanda',
    image: 'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-4c6ce4a5-8aac-4f44-8ada-b02f17eec77a-1774735674901-ut20e.jpg',
    rating: 4.9,
    price: 1499,
    count: 3,
    tagline: 'Nature retreats & woods',
    span: 'col-span-1 md:col-span-2 row-span-1',
  }
];

export function FeaturedDestinations() {
  return (
    <section className="w-full py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Featured Destinations
            </h2>
            <p className="text-gray-500 mt-3 text-lg">
              Discover places you'll never want to leave.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[250px] gap-6">
          {DESTINATIONS.map((dest, index) => (
            <Link href={`/guest?city=${encodeURIComponent(dest.name)}`} key={dest.name} className={`relative group rounded-[2rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-300 block ${dest.span}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="w-full h-full"
              >
                {/* Background Image */}
                <div className="absolute inset-0 w-full h-full">
                <Image 
                  src={dest.image} 
                  alt={dest.name} 
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                />
                {/* Gradient Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1 group-hover:translate-x-2 transition-transform duration-300">
                      {dest.name}
                    </h3>
                    <p className="text-gray-200 text-sm font-medium mb-2">
                      {dest.tagline}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {dest.count} stays
                      </span>
                      <span className="flex items-center gap-1 text-white text-sm font-bold">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {dest.rating}
                      </span>
                    </div>
                  </div>
                  
                  {/* Price animated on hover */}
                  <div className="bg-white text-gray-900 px-4 py-2 rounded-2xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                    <span className="text-xs text-gray-500 font-bold uppercase block">Starting</span>
                    <span className="font-extrabold">₹{dest.price}</span>
                  </div>
                </div>
              </div>
            </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
