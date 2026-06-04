import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CapacitorBackButton } from '@/components/CapacitorBackButton'
import { BottomNav } from '@/components/BottomNav'
import { PullToRefresh } from '@/components/PullToRefresh'
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.fixystays.com'),
  title: {
    template: '%s | Fixy Stays',
    default: 'Fixy Stays | Premium Stays, Luxury Villas & Hotels in Alibag',
  },
  description: 'Book the best luxury villas, premium stays, cottages, and hotels in Alibag. Enjoy top-rated accommodations for your next vacation or getaway with Fixy Stays.',
  keywords: ['Alibag stays', 'luxury villas in Alibag', 'premium cottages Alibag', 'hotels in Alibag', 'book villa Alibag', 'Alibag resorts', 'vacation rentals Alibag', 'best hotels Alibag', 'weekend getaway Alibag', 'Fixy Stays'],
  authors: [{ name: 'Fixy Stays' }],
  creator: 'Fixy Stays',
  publisher: 'Fixy Stays',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://www.fixystays.com',
    siteName: 'Fixy Stays',
    title: 'Fixy Stays | Premium Stays, Luxury Villas & Hotels in Alibag',
    description: 'Book the best luxury villas, premium stays, cottages, and hotels in Alibag. Enjoy top-rated accommodations for your next vacation or getaway with Fixy Stays.',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'Fixy Stays Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fixy Stays | Premium Stays, Luxury Villas & Hotels in Alibag',
    description: 'Book the best luxury villas, premium stays, cottages, and hotels in Alibag.',
    images: ['/logo.png'],
  },
  alternates: {
    canonical: 'https://www.fixystays.com',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-900 bg-gray-50 flex flex-col min-h-screen pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0 overflow-x-hidden overscroll-y-none`}
      >
        <Providers>
          <PullToRefresh />
          <CapacitorBackButton />
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
