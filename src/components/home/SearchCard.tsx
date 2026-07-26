'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar as CalendarIcon, Users, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';



export function SearchCard() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({ from: undefined, to: undefined });
  const [guests, setGuests] = useState('2');
  const [city, setCity] = useState('All Locations');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (range?.from) params.set('checkin', format(range.from, 'yyyy-MM-dd'));
    if (range?.to) params.set('checkout', format(range.to, 'yyyy-MM-dd'));
    if (guests) params.set('guests', guests);
    if (city && city !== 'All Locations') params.set('city', city);
    router.push(`/guest?${params.toString()}`);
  };

  const handleSelectRange = (newRange: DateRange | undefined) => {
    if (newRange?.from && newRange?.to && newRange.from.getTime() === newRange.to.getTime()) {
      // If from and to are the same, treat it as only selecting checkin (from)
      setRange({ from: newRange.from, to: undefined });
    } else {
      setRange(newRange);
      if (newRange?.from && newRange?.to) {
        setTimeout(() => setIsCalendarOpen(false), 300);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="w-full max-w-4xl relative"
      ref={containerRef}
    >
      <div 
        className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 transition-all duration-300 hover:shadow-[0_8px_40px_rgb(37,99,235,0.15)] flex flex-col md:flex-row items-center gap-4 relative z-30"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Destination */}
        <div className="flex-1 w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/60 transition-colors group relative cursor-pointer">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 font-bold"
            aria-label="Select location"
          >
            <option value="All Locations">All Locations</option>
            
            <optgroup label="Alibag Raigad">
              <option value="Alibag">Alibag</option>
              <option value="Akshi">Akshi</option>
              <option value="Awas">Awas</option>
              <option value="Bodni">Bodni</option>
              <option value="Chaul">Chaul</option>
              <option value="Chondhi">Chondhi</option>
              <option value="Karmale / Hashivare">Karmale / Hashivare</option>
              <option value="Kashid">Kashid</option>
              <option value="Kihim">Kihim</option>
              <option value="Korlai">Korlai</option>
              <option value="Mandwa">Mandwa</option>
              <option value="Murud">Murud</option>
              <option value="Nagaon">Nagaon</option>
              <option value="Nandgaon">Nandgaon</option>
              <option value="Rajpuri">Rajpuri</option>
              <option value="Revdanda">Revdanda</option>
              <option value="Rewas">Rewas</option>
              <option value="Salav">Salav</option>
              <option value="Saral">Saral</option>
              <option value="Sasawane">Sasawane</option>
              <option value="Thal">Thal</option>
              <option value="Varsoli">Varsoli</option>
              <option value="Zirad">Zirad</option>
            </optgroup>

            <optgroup label="Shrivardhan Raigad">
              <option value="Agardanda">Agardanda</option>
              <option value="Bagmandala">Bagmandala</option>
              <option value="Bharadkhol">Bharadkhol</option>
              <option value="Borli Panchatan">Borli Panchatan</option>
              <option value="Dighi">Dighi</option>
              <option value="Diveagar">Diveagar</option>
              <option value="Harihareshwar">Harihareshwar</option>
              <option value="Sarve">Sarve</option>
              <option value="Shekhadi">Shekhadi</option>
              <option value="Shrivardhan">Shrivardhan</option>
              <option value="Velas">Velas</option>
            </optgroup>

            <optgroup label="Extended Raigad Locations">
              <option value="Dadar Sagari">Dadar Sagari</option>
              <option value="Dighi Sagari">Dighi Sagari</option>
              <option value="Goregaon">Goregaon</option>
              <option value="Karjat">Karjat</option>
              <option value="Khalapur">Khalapur</option>
              <option value="Khopoli">Khopoli</option>
              <option value="Kolad">Kolad</option>
              <option value="Mahad City">Mahad City</option>
              <option value="Mahad MIDC">Mahad MIDC</option>
              <option value="Mahad Taluka">Mahad Taluka</option>
              <option value="Mangaon">Mangaon</option>
              <option value="Mandwa Sagari">Mandwa Sagari</option>
              <option value="Matheran">Matheran</option>
              <option value="Mhasla">Mhasla</option>
              <option value="Nagothane">Nagothane</option>
              <option value="Neral">Neral</option>
              <option value="Pali">Pali</option>
              <option value="Pen">Pen</option>
              <option value="Poladpur">Poladpur</option>
              <option value="Poynad">Poynad</option>
              <option value="Rasayani">Rasayani</option>
              <option value="Roha">Roha</option>
              <option value="Tala">Tala</option>
              <option value="Vadkhal">Vadkhal</option>
            </optgroup>
          </select>
          <div className="bg-blue-50 p-2 rounded-full group-hover:bg-blue-100 transition-colors relative z-0 pointer-events-none">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col flex-1 relative z-0 pointer-events-none">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Where</span>
            <span className="text-gray-900 font-semibold text-base truncate">{city}</span>
          </div>
        </div>

        <div className="hidden md:block w-px h-12 bg-gray-200"></div>

        {/* Dates */}
        <div 
          className="flex-1 w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/60 transition-colors group cursor-pointer relative"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        >
          <div className="bg-blue-50 p-2 rounded-full group-hover:bg-blue-100 transition-colors">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">When</span>
            <span className={cn("text-base font-semibold", (range?.from || range?.to) ? "text-gray-900" : "text-gray-400")}>
              {range?.from ? format(range.from, 'MMM d') : 'Add'} - {range?.to ? format(range.to, 'MMM d') : 'Dates'}
            </span>
          </div>
        </div>

        <div className="hidden md:block w-px h-12 bg-gray-200"></div>

        {/* Guests */}
        <div className="flex-1 w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/60 transition-colors group relative cursor-pointer">
          <select
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            aria-label="Select number of guests"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
            ))}
            <option value="11+">11+ Guests</option>
          </select>
          <div className="bg-blue-50 p-2 rounded-full group-hover:bg-blue-100 transition-colors relative z-0 pointer-events-none">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col flex-1 relative z-0 pointer-events-none">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Who</span>
            <span className="text-gray-900 font-semibold text-base truncate">
              {guests} {guests === '1' ? 'Guest' : 'Guests'}
            </span>
          </div>
        </div>

        {/* Search Button */}
        <motion.button 
          onClick={handleSearch}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full md:w-auto mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white p-4 md:px-8 rounded-2xl md:rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-colors"
        >
          <Search className="w-5 h-5" />
          <span className="md:hidden">Search</span>
        </motion.button>
      </div>

      {/* Calendar Popover/Modal */}
      <AnimatePresence>
        {isCalendarOpen && (
          <>
            {/* Backdrop for mobile */}
            {isMobile && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setIsCalendarOpen(false)}
              />
            )}

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "z-50 bg-white border border-gray-100",
                "shadow-[0_10px_50px_rgba(0,0,0,0.2)] rounded-[2rem]",
                // Positioning Logic
                isMobile 
                  ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-w-[400px]" 
                  : "absolute left-1/2 -translate-x-1/2 top-[calc(100%+16px)] w-auto min-w-[600px] origin-top"
              )}
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 pt-5 pb-2 border-b border-gray-50">
                <h4 className="text-xs font-black uppercase tracking-widest text-blue-900">Select Dates</h4>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => setRange({ from: undefined, to: undefined })}
                    className="text-[11px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wider transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="text-gray-400 hover:text-gray-700 transition-colors bg-gray-50 p-1.5 rounded-full"
                    aria-label="Close calendar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
    
              {/* Calendar */}
              <div className="p-2 sm:p-4 overflow-x-auto flex justify-center">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={handleSelectRange}
                  numberOfMonths={isMobile ? 1 : 2}
                  disabled={{ before: new Date() }}
                  className="rounded-2xl border-none"
                />
              </div>
    
              {/* Action Footer */}
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-colors"
                >
                  {range?.from && range?.to ? 'Apply Dates' : 'Done'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
