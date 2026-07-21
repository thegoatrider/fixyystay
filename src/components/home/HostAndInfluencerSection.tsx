'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, TrendingUp, Calendar as CalendarIcon, CreditCard } from 'lucide-react';
import Link from 'next/link';

export function HostAndInfluencerSection() {
  return (
    <section className="w-full py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Host Split Section */}
        <div className="bg-gray-900 rounded-[3rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl relative">
          {/* Left Text */}
          <div className="w-full lg:w-1/2 p-12 lg:p-20 flex flex-col justify-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
                Turn your property into <span className="text-blue-400">income.</span>
              </h2>
              <p className="text-gray-400 text-lg md:text-xl font-medium mb-10 max-w-md leading-relaxed">
                Join thousands of hosts earning on FixyStays. We handle the marketing, you welcome the guests.
              </p>

              <div className="flex flex-col gap-4 mb-10">
                {[
                  { icon: TrendingUp, text: 'More bookings, less hassle' },
                  { icon: CalendarIcon, text: 'Advanced calendar sync' },
                  { icon: CreditCard, text: 'Instant secure payouts' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0" />
                    <span className="text-white font-medium text-lg">{item.text}</span>
                  </div>
                ))}
              </div>

              <Link href="/onboarding">
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-colors inline-flex items-center gap-2">
                  Become a Partner <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </motion.div>
          </div>

          {/* Right Dashboard Mockup */}
          <div className="w-full lg:w-1/2 bg-gray-800 p-8 lg:p-12 relative flex items-center justify-center overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]"></div>
            
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 z-10"
            >
              {/* Mockup Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">This Month</div>
                  <div className="text-3xl font-extrabold text-gray-900">₹1,45,000</div>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> +24%
                </div>
              </div>
              
              {/* Mockup Chart Area */}
              <div className="h-32 w-full flex items-end gap-2 mb-6">
                {[40, 60, 45, 80, 50, 90, 75].map((h, i) => (
                  <div key={i} className="flex-1 bg-blue-100 rounded-t-sm relative group cursor-pointer transition-all hover:bg-blue-200" style={{ height: `${h}%` }}>
                    <div className="absolute inset-0 bg-blue-600 rounded-t-sm origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
                  </div>
                ))}
              </div>

              {/* Mockup List */}
              <div className="space-y-4">
                <div className="text-sm font-bold text-gray-900">Recent Bookings</div>
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl">
                    <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-16"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Influencer Program Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[3rem] p-12 lg:p-16 border border-blue-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 mt-8"
        >
          <div className="max-w-xl">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 bg-blue-100 inline-block px-3 py-1 rounded-full">For Creators</div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Travel. Share. Earn.</h3>
            <p className="text-gray-600 text-lg font-medium leading-relaxed mb-8">
              Join our exclusive influencer program. Recommend your favorite FixyStays properties to your audience and earn a commission on every booking.
            </p>
            <Link href="/login?role=influencer">
              <button className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3.5 rounded-2xl font-bold text-lg transition-colors shadow-sm inline-flex items-center gap-2">
                Join Creator Program
              </button>
            </Link>
          </div>
          
          <div className="relative w-full md:w-auto flex-1 flex justify-center md:justify-end">
            <div className="w-64 h-64 bg-white rounded-full shadow-2xl p-6 flex flex-col items-center justify-center border-4 border-blue-50 relative z-10 rotate-3 hover:rotate-0 transition-transform duration-500">
               <div className="text-5xl mb-4">📸</div>
               <div className="text-2xl font-extrabold text-gray-900 text-center">Creator<br/>Rewards</div>
            </div>
            {/* Decorative floaters */}
            <div className="absolute top-0 right-10 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-xl shadow-sm animate-bounce z-20">💖</div>
            <div className="absolute bottom-10 left-10 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-2xl shadow-sm z-0">✨</div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
