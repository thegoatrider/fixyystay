import Link from 'next/link';
import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SignupDropdown } from '@/components/SignupDropdown';
import { LayoutDashboard, LogOut } from 'lucide-react';

// New Home Components
import { HeroSection } from '@/components/home/HeroSection';
import { SearchCard } from '@/components/home/SearchCard';
import { DestinationChips } from '@/components/home/DestinationChips';
import { TrendingCategories } from '@/components/home/TrendingCategories';
import { FeaturedDestinations } from '@/components/home/FeaturedDestinations';
import { FeaturedProperties } from '@/components/home/FeaturedProperties';
import { TrustSection } from '@/components/home/TrustSection';
import { ExperienceSection } from '@/components/home/ExperienceSection';
import { HostAndInfluencerSection } from '@/components/home/HostAndInfluencerSection';
import { AppDownloadSection } from '@/components/home/AppDownloadSection';
import { Footer } from '@/components/home/Footer';

export const metadata: Metadata = {
  title: 'FixyStays | Book Premium Stays & Unique Experiences',
  description: 'Discover the best luxury villas, premium cottages, hotels, and vacation rentals. Book your perfect getaway with FixyStays today.',
};

export default async function Index() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex-1 w-full flex flex-col bg-white">
      
      {/* Navigation (Floating/Sticky) */}
      <nav className="w-full flex justify-center pt-[env(safe-area-inset-top)] min-h-16 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm">
        <div className="w-full max-w-7xl flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 text-sm">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-extrabold text-xl sm:text-2xl text-blue-600 hover:text-blue-700 transition">
              FixyStays
            </Link>
          </div>
          
          <div className="flex items-center gap-1.5 xs:gap-3 sm:gap-6">
            <LanguageSwitcher />
            {user ? (
              <>
                <div className="hidden lg:block text-gray-500 font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                  Hey, {(user.user_metadata?.name || user.email || 'Admin').split('@')[0]}!
                </div>
                
                <Link 
                  href={`/dashboard/${user.email === 'superadmin@fixstay.com' ? 'admin' : (user.user_metadata?.role || 'guest')}`}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-blue-600 bg-blue-50 font-bold hover:bg-blue-100 transition-all text-sm shadow-sm whitespace-nowrap"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden xs:inline">Dashboard</span>
                </Link>

                <form action="/auth/signout" method="post">
                  <button 
                    type="submit" 
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-4">
                <Link href="/login" className="px-2 sm:px-4 py-2 text-gray-600 hover:text-blue-600 font-bold text-sm transition-colors whitespace-nowrap">
                  Log in
                </Link>
                <SignupDropdown />
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Sections */}
      <main className="flex flex-col w-full">
        
        <HeroSection>
          <SearchCard />
        </HeroSection>

        <DestinationChips />
        
        <div className="h-12"></div> {/* Spacer */}

        <TrendingCategories />

        <div className="h-12"></div> {/* Spacer */}

        <FeaturedDestinations />
        
        <FeaturedProperties />
        
        <TrustSection />
        
        <ExperienceSection />
        
        <HostAndInfluencerSection />
        
        <AppDownloadSection />

      </main>

      <Footer />
    </div>
  );
}
