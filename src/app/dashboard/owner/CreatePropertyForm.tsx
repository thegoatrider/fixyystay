'use client'

import { useState } from 'react'
import NextImage from 'next/image'
import Script from 'next/script'
import { Capacitor } from '@capacitor/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProperty } from './actions'
import { uploadPropertyImage } from '@/app/actions/property'
import { createPropertySubscriptionOrder, verifyPropertyPayment } from '@/app/pricing/business/actions'
import { calculateMonthlyFee } from '@/lib/pricing'
import { useRouter } from 'next/navigation'
import { CollapsibleTile } from '@/components/CollapsibleTile'
import { PlusCircle, MapPin, Loader2, CheckCircle2, ShieldCheck, CreditCard, AlertTriangle, ArrowRight } from 'lucide-react'
import { INDIAN_STATES_AND_CITIES } from '@/lib/india-locations'
import { SearchableCitySelect } from '@/components/SearchableCitySelect'

export default function CreatePropertyForm({ initialPhone }: { initialPhone?: string } = {}) {
  const [propertyType, setPropertyType] = useState('villa')
  const [isLoading, setIsLoading] = useState(false)
  const [roomCount, setRoomCount] = useState<number>(5)
  const [selectedMonths, setSelectedMonths] = useState<number>(1)
  const [unpaidDraft, setUnpaidDraft] = useState<{ id: string; name: string; amount: number; months: number } | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [city, setCity] = useState('Alibag')
  const [pincode, setPincode] = useState('')
  const [isDetectingPin, setIsDetectingPin] = useState(false)
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)
  const [availableAreas, setAvailableAreas] = useState<string[]>([])
  const [selectedArea, setSelectedArea] = useState('')
  const router = useRouter()

  const DURATION_OPTIONS = [
    { months: 1, label: '1 Month' },
    { months: 3, label: '3 Months' },
    { months: 6, label: '6 Months' },
    { months: 12, label: '12 Months (1 Year)' },
  ]

  const safeRooms = Math.min(100, Math.max(1, roomCount || 1))
  const feeRes = calculateMonthlyFee({
    roomCount: safeRooms,
    city,
    pincode,
  })
  const monthlyFee = feeRes.monthlyFee ?? 100
  const totalAmount = monthlyFee * selectedMonths

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPincode(val)

    if (val.length === 6) {
      setIsDetectingPin(true)
      try {
        const res = await fetch(`/api/pincode/${val}`)
        const data = await res.json()
        if (data.success) {
          setDetectedLocation(`${data.city}, ${data.state}`)

          const rawCity = (data.city || '').toLowerCase()
          let matchedCity = data.city || ''

          for (const [_, cities] of Object.entries(INDIAN_STATES_AND_CITIES)) {
            const found = cities.find(c =>
              c.toLowerCase() === rawCity ||
              rawCity.includes(c.toLowerCase()) ||
              c.toLowerCase().includes(rawCity)
            )
            if (found) {
              matchedCity = found
              break
            }
          }

          setCity(matchedCity)

          if (Array.isArray(data.areas) && data.areas.length > 0) {
            setAvailableAreas(data.areas)
            setSelectedArea(data.areas[0])
          }
        }
      } catch (err) {
        console.error('Failed to lookup pincode:', err)
      } finally {
        setIsDetectingPin(false)
      }
    } else {
      setDetectedLocation(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formEl = e.currentTarget
    setIsLoading(true)
    
    if (selectedFiles.length > 15) {
      alert('only 15 pictures of property are permitted.')
      setIsLoading(false)
      return
    }
    
    const formData = new FormData(formEl)
    const phoneVal = ((formData.get('helpdeskNumber') as string) || '').replace(/\D/g, '')
    if (phoneVal.length < 10) {
      alert('A valid phone number with at least 10 digits is mandatory.')
      setIsLoading(false)
      return
    }
    
    if (!coverImage && selectedFiles.length === 0) {
      alert('Please upload a cover image or at least one property image.')
      setIsLoading(false)
      return
    }

    // Clear raw file inputs so uncompressed files never bloat the Server Action payload
    formData.delete('image')
    formData.delete('coverImage')
    formData.delete('coverImageInput')
    
    // Compress images before sending to prevent 413 Payload Too Large
    const compressImage = (file: File): Promise<File> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(file);
            
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
              if (!blob) return resolve(file);
              const safeBaseName = (file.name || 'photo').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo';
              const newFile = new File([blob], `${safeBaseName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile);
            }, 'image/jpeg', 0.75);
          };
          img.onerror = () => resolve(file);
          img.src = event.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      });
    };

    try {
      const uploadSingleFile = async (file: File, prefix: string): Promise<string> => {
        const singleFd = new FormData()
        singleFd.append('file', file)
        singleFd.append('prefix', prefix)
        const upRes = await uploadPropertyImage(singleFd)
        if (upRes.error || !upRes.url) {
          throw new Error(upRes.error || 'Failed to upload image')
        }
        return upRes.url
      }

      if (coverImage) {
        const compressedCover = await compressImage(coverImage)
        const coverUrl = await uploadSingleFile(compressedCover, 'prop-cover')
        formData.append('uploadedCoverUrl', coverUrl)
      }

      if (selectedFiles.length > 0) {
        const compressedFiles = await Promise.all(selectedFiles.map(compressImage))
        const uploadedGalleryUrls: string[] = []
        const BATCH_SIZE = 3
        for (let i = 0; i < compressedFiles.length; i += BATCH_SIZE) {
          const batch = compressedFiles.slice(i, i + BATCH_SIZE)
          const batchUrls = await Promise.all(
            batch.map(f => uploadSingleFile(f, 'prop'))
          )
          uploadedGalleryUrls.push(...batchUrls)
        }
        formData.append('uploadedGalleryUrls', JSON.stringify(uploadedGalleryUrls))
      }

      formData.set('roomCount', String(safeRooms))
      setPaymentError(null)

      const result = await createProperty(formData)
      if (result?.error) {
        alert(result.error)
        setIsLoading(false)
        return
      }

      if (result?.success && result.id) {
        // Native app mode: no web payment gateway inside native wrapper
        if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
          alert('Property draft created successfully! In-app purchases are managed through our web portal. Please visit www.fixystays.com/renew in your mobile browser to activate your subscription.')
          router.push('/dashboard/owner')
          setIsLoading(false)
          return
        }

        // Web mode: initiate pay-first subscription checkout
        try {
          const orderRes = await createPropertySubscriptionOrder(result.id, selectedMonths)
          if (orderRes.error || !orderRes.orderId || !orderRes.key) {
            setPaymentError(orderRes.error || 'Failed to initialize payment gateway')
            setUnpaidDraft({
              id: result.id,
              name: result.propertyName || 'New Property',
              amount: totalAmount,
              months: selectedMonths,
            })
            setIsLoading(false)
            return
          }

          const options = {
            key: orderRes.key,
            amount: orderRes.amount,
            currency: 'INR',
            name: 'FixyStays Property Subscription',
            description: `${result.propertyName || 'Property'} - ${selectedMonths} Month Subscription`,
            order_id: orderRes.orderId,
            prefill: {
              contact: phoneVal,
              email: orderRes.userEmail || '',
            },
            theme: { color: '#4F46E5' },
            handler: async function (response: any) {
              setIsLoading(true)
              const verifyRes = await verifyPropertyPayment({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              })

              if (verifyRes.success) {
                window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
              } else {
                alert(`Payment recorded. Redirecting: ${verifyRes.error || 'Done'}`)
                window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
              }
            },
            modal: {
              ondismiss: function () {
                setIsLoading(false)
                setUnpaidDraft({
                  id: result.id,
                  name: result.propertyName || 'New Property',
                  amount: orderRes.totalAmount || totalAmount,
                  months: selectedMonths,
                })
              },
            },
          }

          const rzp = new (window as any).Razorpay(options)
          rzp.open()
        } catch (payErr: any) {
          console.error('Payment checkout error:', payErr)
          setPaymentError(payErr.message || 'Payment initiation failed')
          setUnpaidDraft({
            id: result.id,
            name: result.propertyName || 'New Property',
            amount: totalAmount,
            months: selectedMonths,
          })
          setIsLoading(false)
        }
      }
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handlePayDraftProperty = async () => {
    if (!unpaidDraft) return
    setIsLoading(true)
    setPaymentError(null)

    try {
      const orderRes = await createPropertySubscriptionOrder(unpaidDraft.id, unpaidDraft.months)
      if (orderRes.error || !orderRes.orderId || !orderRes.key) {
        setPaymentError(orderRes.error || 'Failed to initialize payment gateway')
        setIsLoading(false)
        return
      }

      const options = {
        key: orderRes.key,
        amount: orderRes.amount,
        currency: 'INR',
        name: 'FixyStays Property Subscription',
        description: `${unpaidDraft.name} - ${unpaidDraft.months} Month Subscription`,
        order_id: orderRes.orderId,
        theme: { color: '#4F46E5' },
        handler: async function (response: any) {
          setIsLoading(true)
          const verifyRes = await verifyPropertyPayment({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
          if (verifyRes.success) {
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          } else {
            alert(`Payment recorded. Redirecting: ${verifyRes.error || 'Done'}`)
            window.location.href = `/onboarding/success?session_id=${response.razorpay_order_id}`
          }
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      setPaymentError(err.message || 'Payment initiation failed')
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    if (selectedFiles.length + newFiles.length > 15) {
      alert('only 15 pictures of property are permitted.')
      e.target.value = ''
      return
    }

    const newPreviews = newFiles.map(file => URL.createObjectURL(file))
    
    setSelectedFiles(prev => [...prev, ...newFiles])
    setPreviews(prev => [...prev, ...newPreviews])
    
    // Reset the input so the same file can be selected again if removed
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setPreviews(prev => prev.filter((_, i) => i !== index))
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverImage(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  return (
    <CollapsibleTile title="Add New Property" icon={PlusCircle}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-12 text-left">
      <div className="space-y-2">
        <Label htmlFor="name">Property Name</Label>
        <Input id="name" name="name" required placeholder="e.g. Beachfront Villa" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="type">Property Type</Label>
        <select 
          id="type"
          name="type" 
          className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" 
          required
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
        >
          <option value="villa">Villa</option>
          <option value="multi-room property">Multi-room Property</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea 
          id="description"
          name="description" 
          required 
          rows={3}
          placeholder="Describe the property..."
          className="flex w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="houseRules">House Rules</Label>
        <textarea 
          id="houseRules"
          name="houseRules" 
          rows={3}
          placeholder="List any property rules here..."
          className="flex w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
        />
      </div>

      <div className="space-y-3">
        <Label>Amenities</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
          {[
            'WiFi', 'Pool', 'AC', 'Parking', 'Kitchen', 'TV', 
            'Power Backup', 'Geyser', 'Caretaker', 'Music System',
            'Bonfire', 'BBQ', 'Pet Friendly', 'First Aid', 'Security'
          ].map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                id={`amenity-${amenity.toLowerCase().replace(/\s+/g, '-')}`}
                name="amenities" 
                value={amenity}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{amenity}</span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Label htmlFor="otherAmenities" className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">Other Amenities (Custom)</Label>
          <Input 
            id="otherAmenities"
            name="otherAmenities" 
            placeholder="e.g. Infinity Pool, Movie Room, Chef on call" 
            className="bg-gray-50/50 border-dashed focus:border-solid transition-all"
          />
          <p className="text-[10px] text-gray-400 mt-1 italic">Separate multiple entries with commas</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priceBucket">Maximum Price Cap / Category</Label>
        <select id="priceBucket" name="priceBucket" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" required>
          <option value="" disabled selected>Select max price bucket...</option>
          {propertyType === 'villa' ? (
            <>
              <option value="₹4999">₹4999</option>
              <option value="₹6999">₹6999</option>
              <option value="₹7999">₹7999</option>
              <option value="₹9999">₹9999</option>
              <option value="₹12999">₹12999</option>
              <option value="₹14999">₹14999</option>
              <option value="₹17999">₹17999</option>
              <option value="₹19999">₹19999</option>
              <option value="₹24999">₹24999</option>
              <option value="₹29999">₹29999</option>
              <option value="₹34999">₹34999</option>
              <option value="₹39999">₹39999</option>
              <option value="₹44999">₹44999</option>
              <option value="₹49999">₹49999</option>
            </>
          ) : (
            <>
              <option value="₹799">₹799</option>
              <option value="₹999">₹999</option>
              <option value="₹1299">₹1299</option>
              <option value="₹1499">₹1499</option>
              <option value="₹1999">₹1999</option>
              <option value="₹2499">₹2499</option>
              <option value="₹2999">₹2999</option>
              <option value="₹3499">₹3499</option>
              <option value="₹3999">₹3999</option>
              <option value="₹4499">₹4499</option>
              <option value="₹4999">₹4999</option>
              <option value="₹5499">₹5499</option>
              <option value="₹6999">₹6999</option>
            </>
          )}
        </select>
      </div>

      {/* Guest Pricing Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        <div className="space-y-2">
          <Label htmlFor="max_guests">Base Guests (included in price)</Label>
          <select
            id="max_guests"
            name="max_guests"
            defaultValue="2"
            className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm"
            required
          >
            {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400">Guests the base price covers</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_capacity">Maximum Capacity</Label>
          <Input
            id="max_capacity"
            name="max_capacity"
            type="number"
            min="1"
            step="1"
            defaultValue="10"
            placeholder="e.g. 15"
            required
          />
          <p className="text-[11px] text-gray-400">Absolute max guests allowed — dropdown stops here</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="extra_per_pax">Extra Cost Per Additional Guest (₹)</Label>
          <Input
            id="extra_per_pax"
            name="extra_per_pax"
            type="number"
            min="0"
            step="1"
            defaultValue="0"
            placeholder="e.g. 2999"
          />
          <p className="text-[11px] text-gray-400">₹0 = no extra charge beyond base guests</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="pincode">Area Pincode</Label>
          {isDetectingPin && (
            <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Detecting location...
            </span>
          )}
          {detectedLocation && (
            <span className="text-[11px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
              <CheckCircle2 className="w-3 h-3 text-green-600" /> {detectedLocation}
            </span>
          )}
        </div>
        <Input
          id="pincode"
          name="pincode"
          type="text"
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
          required
          value={pincode}
          onChange={handlePincodeChange}
          placeholder="e.g. 402201, 403516, 560001, 110001"
          className="tracking-widest font-mono"
        />
        <p className="text-[10px] text-gray-400">
          Entering a 6-digit pincode auto-detects City & Area across India.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City / Destination</Label>
        <SearchableCitySelect
          id="city"
          name="city"
          required
          value={city}
          onChange={(c) => setCity(c)}
          className="h-9 rounded-md"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cityArea">Area / Sub-locality</Label>
        {availableAreas.length > 0 ? (
          <select
            id="cityArea"
            name="cityArea"
            required
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="" disabled>Select area...</option>
            {availableAreas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
            <option value="Other">Other Area</option>
          </select>
        ) : (
          <Input
            id="cityArea"
            name="cityArea"
            required
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            placeholder="e.g. Kihim, Calangute, Indiranagar"
            className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="helpdeskNumber" className="font-bold text-gray-900">Owner Contact / WhatsApp Phone Number</Label>
          <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">Mandatory</span>
        </div>
        <Input 
          id="helpdeskNumber" 
          name="helpdeskNumber" 
          type="tel"
          required 
          minLength={10}
          maxLength={15}
          defaultValue={initialPhone || ""}
          placeholder="e.g. 9876543210 or +91 98765 43210" 
          className="font-medium"
        />
        <p className="text-[11px] text-gray-500">
          Direct phone and WhatsApp number for this property to receive guest enquiries and booking updates.
        </p>
      </div>

      <div className="space-y-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <Label htmlFor="coverImageInput" className="font-bold text-gray-900">Cover Image (Main Display)</Label>
        <p className="text-[11px] text-gray-500 mb-2">This will be the primary image shown to guests.</p>
        <Input 
          id="coverImageInput"
          name="coverImageInput" 
          type="file" 
          accept="image/*" 
          onChange={handleCoverChange}
          className="cursor-pointer bg-white"
        />
        {coverPreview && (
          <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border-2 border-blue-200 shadow-md mt-4 group">
            <span className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-md">Main Cover</span>
            <NextImage src={coverPreview} alt="Cover Preview" fill unoptimized className="object-cover" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Label htmlFor="image" className="font-bold text-gray-900 flex items-center gap-2">
          Property Images (Gallery)
          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest">Mandatory</span>
        </Label>
        <Input 
          id="image"
          name="image" 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={handleFileChange} 
          className="cursor-pointer file:bg-blue-600 file:text-white file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-blue-700 transition-all"
        />
        
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4 max-h-[500px] overflow-y-auto p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 shadow-inner">
            {previews.map((url, index) => (
              <div key={index} className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 bg-white group shadow-sm ring-1 ring-black/5">
                <NextImage src={url} alt={`Preview ${index}`} fill unoptimized sizes="112px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg z-10"
                  title="Remove image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-[10px] font-black text-white px-2 py-0.5 rounded backdrop-blur-md border border-white/20">
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
        {previews.length > 5 && (
          <p className="text-[10px] text-gray-400 italic text-center font-medium">Scroll down to see all {previews.length} selected images</p>
        )}
      </div>

      {/* Subscription Plan & Rentable Room Count */}
      <div className="space-y-4 p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
        <div className="flex items-center justify-between">
          <Label htmlFor="roomCount" className="font-bold text-gray-900 text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Rentable Rooms & Subscription Plan
          </Label>
          <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
            Pay-First Model
          </span>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          FixyStays subscriptions are strictly priced by declared rentable room count. Adding an additional property requires an active subscription before admin approval.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="roomCountInput" className="text-xs font-semibold text-gray-700">
              Total Rentable Rooms (1–100)
            </Label>
            <Input
              id="roomCountInput"
              name="roomCountInput"
              type="number"
              min={1}
              max={100}
              value={roomCount}
              onChange={(e) => setRoomCount(parseInt(e.target.value, 10) || 1)}
              required
              className="bg-white font-bold text-lg"
            />
            <p className="text-[11px] text-gray-400">Total rentable room keys in this property</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 block">
              Subscription Duration
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = selectedMonths === opt.months
                return (
                  <button
                    key={opt.months}
                    type="button"
                    onClick={() => setSelectedMonths(opt.months)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700 text-xs font-medium'
                    }`}
                  >
                    <div>{opt.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Live Tier Fee Preview */}
        <div className="mt-3 p-4 bg-white rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div>
            <div className="text-xs text-gray-500 font-medium">
              Rate for <span className="font-bold text-gray-800">{safeRooms} Rooms</span>:
            </div>
            <div className="text-sm font-semibold text-indigo-700">
              ₹{monthlyFee} / month <span className="text-[11px] text-gray-400 font-normal">(Inclusive of GST)</span>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-xs text-gray-400">Total Subscription Fee ({selectedMonths} mo)</div>
            <div className="text-2xl font-black text-gray-900">
              ₹{totalAmount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Unpaid Draft Prompt if payment was cancelled / failed */}
      {unpaidDraft && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-bold text-amber-900">
                Listing Drafted: {unpaidDraft.name}
              </div>
              <div className="text-xs text-amber-800 mt-0.5">
                Payment of ₹{unpaidDraft.amount} is pending. FixyStays requires subscription activation before submitting to admin.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={handlePayDraftProperty}
              disabled={isLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow"
            >
              Pay ₹{unpaidDraft.amount} Now
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="text-xs h-10 px-3 rounded-xl border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              <a href="/renew">View Renewals</a>
            </Button>
          </div>
        </div>
      )}

      {/* Payment Error banner */}
      {paymentError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{paymentError}</span>
        </div>
      )}

      <div className="mt-8 pb-12 border-t pt-8">
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        <Button 
          type="submit" 
          className="w-full h-16 text-xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98] rounded-2xl" 
          disabled={isLoading}
        >
          {isLoading ? (
             <div className="flex items-center gap-3">
               <span className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
               Processing...
             </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <CreditCard className="w-6 h-6" />
              Pay ₹{totalAmount.toLocaleString('en-IN')} & Submit Property
            </div>
          )}
        </Button>
        <p className="text-center text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest italic">
          * Your property subscription will activate immediately upon payment, and submit for admin approval
        </p>
      </div>
    </form>
    </CollapsibleTile>
  )
}
