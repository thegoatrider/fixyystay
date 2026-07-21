'use client';

import { motion } from 'framer-motion';
import { Sparkles, Umbrella, Mountain, Dog, Home, Tent, Briefcase, Palmtree } from 'lucide-react';

import Link from 'next/link';

const CATEGORIES = [
  { name: 'Pool', param: 'Pool', icon: Umbrella },
  { name: 'Pet Friendly', param: 'Pet Friendly', icon: Dog },
  { name: 'Bonfire', param: 'Bonfire', icon: Sparkles },
  { name: 'BBQ', param: 'BBQ', icon: Home },
  { name: 'Beach view', param: 'Beach view', icon: Palmtree },
  { name: 'AC', param: 'AC', icon: Mountain },
  { name: 'WiFi', param: 'WiFi', icon: Briefcase },
  { name: 'Villas', param: 'type-villa', icon: Tent }, // special case for type
];

export function TrendingCategories() {
  return (
    <section className="w-full py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-8">
          Explore by Category
        </h2>
        
        {/* Horizontal scroll container */}
        <div className="flex overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 md:gap-6 snap-x hide-scrollbar">
          {CATEGORIES.map((category, index) => {
            const Icon = category.icon;
            const href = category.param === 'type-villa' 
              ? '/guest?bucket=villa-See All Villas' 
              : `/guest?amenities=${encodeURIComponent(category.param)}`;
              
            return (
              <Link href={href} key={category.name} className="snap-start shrink-0 cursor-pointer group block">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ rotate: [-1, 1, 0], scale: 1.05 }}
                >
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 flex flex-col items-center justify-center gap-3 transition-all duration-300">
                    <div className="bg-gray-50 group-hover:bg-blue-50 p-3 rounded-full transition-colors duration-300">
                      <Icon className="w-6 h-6 md:w-8 md:h-8 text-gray-600 group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700 transition-colors">
                      {category.name}
                    </span>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
