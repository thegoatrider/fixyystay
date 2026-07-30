'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_IMAGES = [
  'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-d2f9341f-6f36-44d7-8af6-dd9efe054e93-1784269865939-fom1s.jpg',
  'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-4c6ce4a5-8aac-4f44-8ada-b02f17eec77a-1774737610548-ievvm.jpg',
  'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-update-5056d71d-f835-4379-9ce4-470dd34faa80-1776099327067-0xeuv.jpeg',
  'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-4c6ce4a5-8aac-4f44-8ada-b02f17eec77a-1774736146238-vc4oj.jpg',
  'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-d2f9341f-6f36-44d7-8af6-dd9efe054e93-1784269860007-2m566.jpg',
  'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-update-5056d71d-f835-4379-9ce4-470dd34faa80-1776099335990-zhgyq.jpeg'
];

export function HeroSection({ children }: { children?: React.ReactNode }) {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000); // 6 seconds crossfade

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[85vh] min-h-[600px] flex flex-col justify-center items-center rounded-[2rem] md:rounded-[3rem] mt-4 mb-16 mx-auto max-w-[98%] xl:max-w-7xl shadow-xl">
      {/* Background Images Carousel */}
      <div className="absolute inset-0 z-0 bg-gray-900 overflow-hidden rounded-[2rem] md:rounded-[3rem]">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={currentImage}
            src={HERO_IMAGES[currentImage]}
            alt="Beautiful travel destination"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        </AnimatePresence>
        {/* Soft overlay to ensure text remains readable */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl px-6 text-center mt-[-6vh] md:mt-[-10vh]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="flex flex-col items-center"
        >

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.15] drop-shadow-lg">
            Stay somewhere <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
              worth remembering.
            </span>
          </h1>
          
          <p className="mt-5 text-sm sm:text-lg md:text-2xl text-gray-200 font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            Discover handpicked luxury villas, beachside resorts, and boutique stays built for unforgettable escapes.
          </p>

          {/* Quick Info Tags to "fill it up more well" */}
          <div className="mt-8 flex flex-wrap justify-center gap-2.5 max-w-md sm:max-w-none">
            <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-inner text-[10px] sm:text-xs font-bold text-white">
              <span className="text-cyan-400">✓</span> 100% Verified
            </div>
            <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-inner text-[10px] sm:text-xs font-bold text-white">
              <span className="text-cyan-400">✓</span> Local Caretaker
            </div>
            <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-inner text-[10px] sm:text-xs font-bold text-white">
              <span className="text-cyan-400">✓</span> Best Price Guarantee
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search Bar Container - Passed as children to position over the hero bottom */}
      <div className="absolute bottom-0 translate-y-1/2 w-full px-4 flex justify-center z-20">
        {children}
      </div>
    </div>
  );
}
