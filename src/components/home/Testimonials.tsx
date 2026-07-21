'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Sarah Jenkins',
    photo: 'https://i.pravatar.cc/150?u=sarah',
    rating: 5,
    review: 'The glasshouse in Nagaon was absolutely stunning. Waking up to the sea breeze was an unforgettable experience. FixyStays made the booking seamless.',
    destination: 'Visited Nagaon',
    yOffset: 0
  },
  {
    name: 'Rahul Sharma',
    photo: 'https://i.pravatar.cc/150?u=rahul',
    rating: 5,
    review: 'Found a hidden gem in Kashid far from the crowded beaches. The host was incredible and the property exceeded our expectations.',
    destination: 'Visited Kashid',
    yOffset: 40
  },
  {
    name: 'Emily Chen',
    photo: 'https://i.pravatar.cc/150?u=emily',
    rating: 5,
    review: 'Our team workation in Kihim was perfect. Fast internet, beautiful lush surroundings, and great local food. Will definitely book through FixyStays again.',
    destination: 'Visited Kihim',
    yOffset: 20
  }
];

export function Testimonials() {
  return (
    <section className="w-full py-24 px-4 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Don't just take our word for it
          </h2>
          <p className="text-gray-500 mt-3 text-lg">
            Hear from travelers who found their perfect stay.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pb-12">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              animate={{ 
                y: [0, -10, 0],
              }}
              // Add a subtle floating animation that repeats
              style={{
                marginTop: `${t.yOffset}px`
              }}
              className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-shadow duration-300 relative border border-gray-100"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-blue-50 opacity-50" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-gray-700 text-lg font-medium leading-relaxed mb-8 relative z-10">
                "{t.review}"
              </p>

              <div className="flex items-center gap-4 mt-auto">
                <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                <div>
                  <h4 className="font-bold text-gray-900">{t.name}</h4>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">{t.destination}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
