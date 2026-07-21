'use client';

import { motion } from 'framer-motion';
import { Smartphone, QrCode } from 'lucide-react';

export function AppDownloadSection() {
  return (
    <section className="w-full py-24 px-4 bg-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 lg:gap-24 relative z-10">
        
        {/* Phone Mockup Area */}
        <div className="w-full md:w-1/2 flex justify-center md:justify-end relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-50 rounded-full blur-[80px] -z-10"></div>
          
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="relative w-72 h-[600px] bg-gray-900 rounded-[3rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Screen Content Mockup */}
            <div className="bg-white flex-1 overflow-hidden relative">
               {/* Notches */}
               <div className="absolute top-0 inset-x-0 h-7 bg-gray-900 rounded-b-2xl w-40 mx-auto z-20"></div>
               
               {/* App UI Fake */}
               <div className="h-full w-full bg-gray-50 flex flex-col pt-12">
                  <div className="px-4 pb-4">
                    <div className="h-10 bg-gray-200 rounded-full w-full mb-6 flex items-center px-4 gap-2">
                       <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                       <div className="h-2 w-24 bg-gray-400 rounded"></div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 mb-4">Explore</div>
                    <div className="h-40 bg-gray-200 rounded-2xl w-full mb-4"></div>
                    <div className="h-40 bg-gray-200 rounded-2xl w-full"></div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>

        {/* Text and Actions */}
        <div className="w-full md:w-1/2 text-center md:text-left">
          <motion.div
             initial={{ opacity: 0, x: 50 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-bold text-sm mb-6">
              <Smartphone className="w-4 h-4" /> Available now
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-[1.1]">
              The best stays, <br/> right in your pocket.
            </h2>
            
            <p className="text-gray-500 text-lg md:text-xl font-medium mb-10 max-w-lg leading-relaxed mx-auto md:mx-0">
              Download the FixyStays app for exclusive mobile-only deals, instant notifications, and a seamless booking experience.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center md:justify-start">
              {/* QR Code */}
              <div className="hidden lg:flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-800" strokeWidth={1.5} />
                </div>
                <span className="text-xs font-bold text-gray-500">Scan to download</span>
              </div>

              {/* Store Buttons (Fake for now) */}
              <div className="flex flex-col gap-3">
                <button className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl flex items-center gap-3 transition-colors min-w-[200px]">
                   <div className="text-2xl">🍎</div>
                   <div className="text-left flex flex-col">
                     <span className="text-[10px] font-medium leading-tight">Download on the</span>
                     <span className="text-lg font-bold leading-tight">App Store</span>
                   </div>
                </button>
                <button className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl flex items-center gap-3 transition-colors min-w-[200px]">
                   <div className="text-2xl">▶️</div>
                   <div className="text-left flex flex-col">
                     <span className="text-[10px] font-medium leading-tight">GET IT ON</span>
                     <span className="text-lg font-bold leading-tight">Google Play</span>
                   </div>
                </button>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
