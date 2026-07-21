'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Linkedin, ArrowRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-100 pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          
          {/* Brand & Newsletter Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="font-extrabold text-2xl text-blue-600 mb-6 block">
              FixyStays
            </Link>
            <p className="text-gray-500 font-medium mb-8 max-w-sm leading-relaxed">
              Discover and book unique stays, boutique hotels, and luxury villas for your next memorable getaway.
            </p>
            
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-4">Subscribe to our newsletter</h4>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-l-xl px-4 py-3 w-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-r-xl transition-colors font-bold flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-bold text-gray-900 mb-6">Company</h4>
            <ul className="space-y-4">
              {['About us', 'Careers', 'Press', 'Blog', 'Contact'].map(link => (
                <li key={link}>
                  <Link href="#" className="text-gray-500 hover:text-blue-600 font-medium transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Hosting</h4>
            <ul className="space-y-4">
              {['List your property', 'Host resources', 'Community forum', 'Host guarantee'].map(link => (
                <li key={link}>
                  <Link href="#" className="text-gray-500 hover:text-blue-600 font-medium transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Support</h4>
            <ul className="space-y-4">
              {['Help center', 'Cancellation options', 'Safety information', 'Report a concern'].map(link => (
                <li key={link}>
                  <Link href="#" className="text-gray-500 hover:text-blue-600 font-medium transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm font-medium text-gray-500">
            <span>© 2026 FixyStays, Inc.</span>
            <div className="hidden md:block w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex gap-4">
              <Link href="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy</Link>
              <Link href="/terms-and-conditions" className="hover:text-blue-600 transition-colors">Terms</Link>
              <Link href="#" className="hover:text-blue-600 transition-colors">Sitemap</Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select className="bg-transparent text-sm font-medium text-gray-700 cursor-pointer outline-none border-none hover:text-blue-600 transition-colors">
              <option>English (IN)</option>
              <option>Hindi</option>
            </select>
            <div className="w-px h-4 bg-gray-300"></div>
            <span className="text-sm font-bold text-gray-700">₹ INR</span>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Linkedin className="w-5 h-5" /></a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
