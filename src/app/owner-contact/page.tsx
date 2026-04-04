'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, CheckCircle2, MessageSquare, MapPin, Phone, User, Building2, ExternalLink } from 'lucide-react'
import { submitOwnerLead } from './actions'

export default function OwnerContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await submitOwnerLead(formData)

    if (result.success) {
      setIsSuccess(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setError(result.error || 'Something went wrong.')
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8 animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Lead Received!</h1>
        <p className="text-xl text-gray-600 max-w-lg mb-12 leading-relaxed">
          Thank you for choosing Fixy Stays. Our property acquisition team will get in touch with you within 24-48 hours to discuss your listing.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 h-16 rounded-2xl text-lg font-black shadow-xl hover:scale-105 transition-all">
            <Link href="/">
              Back to Home
            </Link>
          </Button>
          <a 
            href="https://wa.me/917506288907?text=Hi%2C%20I%20just%20submitted%20my%20property%20details%20on%20Fixy%20Stays!"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-16 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black text-lg shadow-lg shadow-green-100 hover:scale-105 transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contact via WhatsApp
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white selection:bg-blue-100">
      {/* Header */}
      <nav className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-bold text-sm">Back</span>
        </Link>
        <Link href="/" className="font-black text-xl text-blue-600">Fixy Stays</Link>
        <div className="w-10" /> {/* Spacer */}
      </nav>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 px-6 py-12 md:py-24">
        {/* Left Side: Copy */}
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest mb-6 w-fit">
            <Building2 className="w-3.5 h-3.5" /> For Property Owners
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-[1.1] mb-8 tracking-tight">
            List your <span className="text-blue-600">property</span> with the best in India.
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-xl font-medium">
            Join the fastest-growing property management network in India. We handle the bookings, marketing, and influencers—you enjoy the revenue.
          </p>

          <div className="space-y-6">
            <FeatureItem 
              icon={<MessageSquare className="w-5 h-5" />} 
              title="Quick Consultation" 
              desc="We'll call you to understand your property and targets."
            />
            <FeatureItem 
              icon={<ExternalLink className="w-5 h-5" />} 
              title="Massive Exposure" 
              desc="Get featured by top influencers and rank #1 in local search."
            />
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full -rotate-12 translate-x-10 translate-y-10" />
          <div className="relative bg-white border border-gray-100 rounded-[40px] shadow-2xl p-8 md:p-12 overflow-hidden">
            <div className="mb-10">
              <h2 className="text-2xl font-black text-gray-900 mb-2">Apply to List</h2>
              <p className="text-gray-500 font-medium">Please fill in your details, we will get in touch soon.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-gray-400">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                    <Input id="name" name="name" placeholder="John Wick" className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-blue-500" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-gray-400">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                    <Input id="phone" name="phone" placeholder="+91 00000 00000" className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-blue-500" required />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs font-black uppercase tracking-widest text-gray-400">City</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                    <Input id="city" name="city" placeholder="e.g. Alibag" className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-blue-500" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area" className="text-xs font-black uppercase tracking-widest text-gray-400">Area</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-300" />
                    <Input id="area" name="area" placeholder="e.g. Nagaon" className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-blue-500" required />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="google_link" className="text-xs font-black uppercase tracking-widest text-gray-400">Property Google Maps Link</Label>
                <Input id="google_link" name="google_link" placeholder="Paste the Google Maps link / URL of your property" className="h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-blue-500" required />
              </div>

              {error && (
                <p className="text-sm font-bold text-red-500 bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-black shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Send Details'}
              </Button>

              <div className="pt-6 border-t text-center">
                <p className="text-sm text-gray-500 font-medium">
                  Already have a verified account?{" "}
                  <Link href="/login?role=owner" className="text-blue-600 font-black hover:underline underline-offset-4">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-black text-gray-900 leading-tight mb-1">{title}</h4>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
