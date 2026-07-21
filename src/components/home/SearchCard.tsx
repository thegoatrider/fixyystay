'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, Search } from 'lucide-react';

export function SearchCard() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="w-full max-w-4xl"
    >
      <div 
        className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 transition-all duration-300 hover:shadow-[0_8px_40px_rgb(37,99,235,0.15)] flex flex-col md:flex-row items-center gap-4 relative z-30"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Destination */}
        <div className="flex-1 w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/60 transition-colors group cursor-text">
          <div className="bg-blue-50 p-2 rounded-full group-hover:bg-blue-100 transition-colors">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Where</span>
            <input 
              type="text" 
              placeholder="Search destinations" 
              className="bg-transparent border-none outline-none text-gray-900 font-semibold placeholder:font-medium placeholder:text-gray-400 w-full focus:ring-0 p-0 text-base"
            />
          </div>
        </div>

        <div className="hidden md:block w-px h-12 bg-gray-200"></div>

        {/* Dates */}
        <div className="flex-1 w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/60 transition-colors group cursor-pointer">
          <div className="bg-blue-50 p-2 rounded-full group-hover:bg-blue-100 transition-colors">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">When</span>
            <span className="text-gray-400 font-medium">Add dates</span>
          </div>
        </div>

        <div className="hidden md:block w-px h-12 bg-gray-200"></div>

        {/* Guests */}
        <div className="flex-1 w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/60 transition-colors group cursor-pointer">
          <div className="bg-blue-50 p-2 rounded-full group-hover:bg-blue-100 transition-colors">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Who</span>
            <span className="text-gray-400 font-medium">Add guests</span>
          </div>
        </div>

        {/* Search Button */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full md:w-auto mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white p-4 md:px-8 rounded-2xl md:rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-colors"
        >
          <Search className="w-5 h-5" />
          <span className="md:hidden">Search</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
