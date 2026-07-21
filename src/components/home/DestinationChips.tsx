'use client';

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

const POPULAR_DESTINATIONS = [
  'Nagaon Beach', 'Kashid', 'Mandwa', 'Varsoli', 'Kihim', 'Awas', 'Murud'
];

export function DestinationChips() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-12 flex flex-col items-center">
      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Trending Searches</p>
      <div className="flex flex-wrap justify-center gap-3">
        {POPULAR_DESTINATIONS.map((dest, index) => (
          <motion.button
            key={dest}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
            whileHover={{ y: -2 }}
            className="group flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-sm hover:shadow-md hover:border-blue-100 hover:bg-blue-50 transition-all duration-200"
          >
            <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-700 transition-colors">
              {dest}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
