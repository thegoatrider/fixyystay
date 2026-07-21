'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRef } from 'react';

const EXPERIENCES = [
  {
    title: 'Weekend escapes',
    desc: 'Leave the city behind. Discover secluded properties in Alibag just a short ferry ride from Mumbai. Perfect for a quick recharge.',
    image: 'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-cover-update-73e99798-e234-404f-a889-cbfed67e00f8-1784283249006-ll52x.jpg',
    align: 'left'
  },
  {
    title: 'Coastal retreats',
    desc: 'Trade your home office for an ocean breeze. Our premium villas come with high-speed internet and inspiring coastal views.',
    image: 'https://emyawufsqwdpqxnygobe.supabase.co/storage/v1/object/public/property_images/prop-cover-ee2ba7a0-558c-4526-b467-7872b82c909b-1776264530077-oqe5d.jpg',
    align: 'right'
  }
];

function ExperienceBlock({ experience, index }: { experience: any, index: number }) {
  const isLeft = experience.align === 'left';
  const ref = useRef(null);
  
  // Parallax effect for image
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [-50, 50]);

  return (
    <div ref={ref} className={`flex flex-col ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-24 mb-32 last:mb-0`}>
      
      {/* Image Side */}
      <div className="w-full lg:w-1/2 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="relative rounded-[2rem] overflow-hidden aspect-[4/5] md:aspect-square shadow-2xl"
        >
          <motion.img 
            style={{ y, scale: 1.1 }}
            src={experience.image} 
            alt={experience.title} 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </motion.div>
        
        {/* Decorative element */}
        <div className={`absolute top-1/2 -translate-y-1/2 ${isLeft ? '-right-10' : '-left-10'} w-20 h-20 bg-blue-100 rounded-full blur-2xl -z-10`}></div>
      </div>

      {/* Text Side */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, x: isLeft ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight leading-[1.1]">
            {experience.title}
          </h2>
          <p className="text-lg md:text-xl text-gray-500 mb-8 leading-relaxed font-medium max-w-lg">
            {experience.desc}
          </p>
          <button className="group inline-flex items-center gap-2 text-blue-600 font-bold text-lg hover:text-blue-700 transition-colors">
            Explore now 
            <span className="bg-blue-50 group-hover:bg-blue-100 p-2 rounded-full transition-colors group-hover:translate-x-1">
              <ArrowRight className="w-5 h-5" />
            </span>
          </button>
        </motion.div>
      </div>

    </div>
  );
}

export function ExperienceSection() {
  return (
    <section className="w-full py-24 px-4 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {EXPERIENCES.map((exp, i) => (
          <ExperienceBlock key={exp.title} experience={exp} index={i} />
        ))}
      </div>
    </section>
  );
}
