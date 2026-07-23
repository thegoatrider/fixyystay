'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Tag, Headset, Lock, RefreshCcw } from 'lucide-react';
import { useState, useEffect } from 'react';

const BENEFITS = [
  { icon: ShieldCheck, title: 'Verified stays', desc: 'Every property is handpicked and verified.' },
  { icon: Zap, title: 'Instant booking', desc: 'No waiting. Book instantly and pack your bags.' },
  { icon: Tag, title: 'Best price guarantee', desc: 'Found it cheaper? We will match the price.' },
  { icon: Headset, title: 'Direct owner support', desc: 'Communicate directly with the property owner.' },
  { icon: Lock, title: 'Secure payments', desc: '100% secure payments with buyer protection.' },
  { icon: RefreshCcw, title: 'Easy cancellation', desc: 'Flexible cancellation policies for peace of mind.' },
];

export function TrustSection() {
  return (
    <section className="w-full py-24 px-4 bg-white relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-50 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Benefits Grid */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Why Choose FixyStays
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {BENEFITS.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-gray-50/50 hover:bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                <div className="bg-white group-hover:bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:shadow-blue-500/30 transition-colors duration-300">
                  <Icon className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  {benefit.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
