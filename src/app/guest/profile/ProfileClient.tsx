'use client'

import { useState, useRef } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Image as ImageIcon, 
  Edit3, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  History, 
  X,
  CreditCard,
  Building2,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { updateUserProfile, uploadAvatar } from './actions'
import { cn } from '@/lib/utils'

interface ProfileClientProps {
  initialProfile: any
  initialBookings: {
    upcoming: any[]
    past: any[]
  }
}

export default function ProfileClient({ initialProfile, initialBookings }: ProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)
    
    const result = await updateUserProfile(formData)
    if (result.success) {
      setProfile({
        ...profile,
        full_name: formData.get('fullName'),
        phone: formData.get('phone'),
        email: formData.get('email')
      })
      setIsEditModalOpen(false)
    } else {
      alert(result.error)
    }
    setIsUpdating(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('avatar', file)

    const result = await uploadAvatar(formData)
    if (result.success && result.url) {
      setProfile({ ...profile, avatar_url: result.url })
    } else {
      alert(result.error)
    }
    setIsUploading(false)
  }

  const bookings = activeTab === 'upcoming' ? initialBookings.upcoming : initialBookings.past

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      
      {/* Left Column: Profile Card */}
      <div className="lg:col-span-4">
        <div className="bg-white border rounded-3xl p-8 shadow-xl shadow-blue-900/5 sticky top-24">
          <div className="flex flex-col items-center text-center">
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-blue-50 flex items-center justify-center">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-blue-200" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-700 transition-colors border-2 border-white disabled:bg-gray-400 group-hover:scale-110 duration-200"
              >
                {isUploading ? (
                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                   <ImageIcon className="w-5 h-5" />
                )}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-1">{profile.full_name}</h2>
            <p className="text-sm text-gray-400 font-medium mb-6">Guest Member since {format(new Date(profile.created_at), 'MMMM yyyy')}</p>

            <div className="w-full space-y-4 mb-8">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</p>
                  <p className="text-sm font-bold text-gray-700 truncate max-w-[180px]">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</p>
                  <p className="text-sm font-bold text-gray-700">{profile.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <Button 
               onClick={() => setIsEditModalOpen(true)} 
               variant="outline" 
               className="w-full py-6 rounded-2xl font-black border-2 hover:bg-blue-50 transition-all group"
            >
              <Edit3 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" /> Edit Profile Details
            </Button>
          </div>
        </div>
      </div>

      {/* Right Column: Booking History */}
      <div className="lg:col-span-8">
        <div className="bg-white border rounded-3xl overflow-hidden shadow-xl shadow-blue-900/5">
          <div className="flex border-b">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={cn(
                "flex-1 py-6 font-black text-xs uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                activeTab === 'upcoming' ? "text-blue-600 border-b-4 border-blue-600 bg-blue-50/30" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Clock className="w-4 h-4" /> Upcoming Stays
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={cn(
                "flex-1 py-6 font-black text-xs uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                activeTab === 'past' ? "text-blue-600 border-b-4 border-blue-600 bg-blue-50/30" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <History className="w-4 h-4" /> Past Trips
            </button>
          </div>

          <div className="p-8">
            <div className="space-y-6">
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    onClick={() => setSelectedBooking(booking)}
                    className="p-5 border-2 border-gray-50 bg-gray-50/30 rounded-3xl hover:border-blue-100 hover:bg-white transition-all cursor-pointer group flex flex-col md:flex-row gap-6 items-center"
                  >
                    <div className="w-full md:w-32 h-24 rounded-2xl overflow-hidden bg-blue-100 flex-shrink-0">
                      {booking.properties?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={booking.properties.image_url} alt={booking.properties.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-300">
                          <Building2 className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                        <h3 className="text-lg font-black text-gray-900 leading-tight">{booking.properties?.name}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider w-fit mx-auto md:mx-0",
                          booking.status === 'confirmed' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        )}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-bold flex items-center justify-center md:justify-start gap-1 mb-3 uppercase tracking-tighter">
                        <MapPin className="w-3 h-3" /> {booking.properties?.city_area || 'Alibag Region'}
                      </p>
                      
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          {format(new Date(booking.checkin_date), 'MMM d')} — {format(new Date(booking.checkout_date), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          ₹{booking.amount.toLocaleString()} Total
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-full border border-gray-100 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-gray-50/50 rounded-[40px] border-4 border-dashed border-gray-100">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mx-auto mb-6">
                    {activeTab === 'upcoming' ? <SparklesIcon className="w-10 h-10 text-blue-200" /> : <History className="w-10 h-10 text-gray-200" />}
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">
                    {activeTab === 'upcoming' ? 'No upcoming trips' : 'No past bookings found'}
                  </h3>
                  <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto mb-8">
                    {activeTab === 'upcoming' ? 'Time to start planning your next getaway with FixStay!' : 'Your booking history will appear here once you complete your stays.'}
                  </p>
                  {activeTab === 'upcoming' && (
                    <Button asChild className="rounded-2xl px-8 h-12 font-black shadow-xl shadow-blue-100">
                      <a href="/guest">Browse Properties</a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Edit Your Details</h3>
                <p className="text-sm text-gray-400 font-medium">Keep your account information updated</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2.5 rounded-full hover:bg-gray-50 transition-colors"
                title="Close"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 pl-1">Full Name</Label>
                <Input name="fullName" defaultValue={profile.full_name} required className="h-14 rounded-2xl border-2 focus:ring-4 focus:ring-blue-100 font-bold" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 pl-1">Email Address</Label>
                <Input name="email" type="email" defaultValue={profile.email} required className="h-14 rounded-2xl border-2 focus:ring-4 focus:ring-blue-100 font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 pl-1">Phone Number</Label>
                <Input name="phone" defaultValue={profile.phone} placeholder="+91 99999 99999" className="h-14 rounded-2xl border-2 focus:ring-4 focus:ring-blue-100 font-bold transition-all" />
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                   type="button" 
                   variant="outline" 
                   onClick={() => setIsEditModalOpen(false)} 
                   className="flex-1 py-7 rounded-2xl font-black border-2"
                >
                  Cancel
                </Button>
                <Button 
                   type="submit" 
                   disabled={isUpdating} 
                   className="flex-1 py-7 rounded-2xl font-black shadow-xl shadow-blue-100"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-400">
            
            <div className="relative h-56 w-full">
               {selectedBooking.properties?.image_url ? (
                 // eslint-disable-next-line @next/next/no-img-element
                 <img src={selectedBooking.properties.image_url} alt={selectedBooking.properties.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white">
                   <Building2 className="w-20 h-20 opacity-20" />
                 </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
               <button 
                  onClick={() => setSelectedBooking(null)}
                  className="absolute top-6 right-6 p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors shadow-lg"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="absolute bottom-8 left-10 right-10">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">Booking Detail</span>
                     <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest">{selectedBooking.status}</span>
                   </div>
                   <h3 className="text-3xl font-black text-white leading-none">{selectedBooking.properties?.name}</h3>
                </div>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Check-in / Check-out</p>
                      <p className="text-sm font-bold text-gray-800 leading-none">
                        {format(new Date(selectedBooking.checkin_date), 'EEE, MMM d')} — {format(new Date(selectedBooking.checkout_date), 'EEE, MMM d')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Location Details</p>
                      <p className="text-sm font-bold text-gray-800 leading-none">{selectedBooking.properties?.city_area || 'Raigad Region'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                      <Layers className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Accommodation</p>
                      <p className="text-sm font-bold text-gray-800 leading-none">{selectedBooking.rooms?.category || 'Standard'} Category</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                      <Hash className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Booking ID</p>
                      <p className="text-xs font-mono font-bold text-gray-500 uppercase">{selectedBooking.id.split('-')[0]}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 border-dashed">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Price Breakdown</h4>
                   <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-wider">
                     <CheckCircle2 className="w-3 h-3" /> Paid & Confirmed
                   </span>
                </div>
                <div className="space-y-2 border-b border-gray-200 pb-4 mb-4">
                   <div className="flex justify-between text-sm text-gray-600 font-medium">
                     <span>Base Accommodation Rate</span>
                     <span>₹{selectedBooking.amount.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-sm text-gray-400 italic">
                     <span>Service Charges & Taxes</span>
                     <span>Included</span>
                   </div>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-lg font-black text-gray-900 uppercase tracking-tight">Total Paid</span>
                   <span className="text-2xl font-black text-blue-600 tracking-tighter">₹{selectedBooking.amount.toLocaleString()}</span>
                </div>
              </div>

              {activeTab === 'upcoming' && (
                <div className="flex gap-3 items-center p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-[11px] font-bold text-blue-900 leading-snug">
                    Need assistance or want to reschedule? Contact our helpdesk at <span className="underline">+91 98765 43210</span>
                  </p>
                </div>
              )}
            </div>

            <div className="p-8 pt-4">
               <Button onClick={() => setSelectedBooking(null)} className="w-full py-7 rounded-2xl font-black text-lg bg-gray-900 hover:bg-black transition-colors">
                 Close View
               </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4M4 19h4m9-14v4m-2-2h4m1 14v4m-2-2h4M9.5 7.5L14.5 12.5M14.5 7.5L9.5 12.5" />
    </svg>
  )
}

function Layers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function Hash({ className }: { className?: string }) {
  return (
     <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
     </svg>
  )
}
