import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CapacitorBackButton } from '@/components/CapacitorBackButton'
import { BottomNav } from '@/components/BottomNav'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FixyStays",
  description: "Premium Stays and Luxury Villas in Alibag",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-900 bg-gray-50 flex flex-col min-h-screen pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0 overflow-x-hidden`}
      >
        <CapacitorBackButton />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
