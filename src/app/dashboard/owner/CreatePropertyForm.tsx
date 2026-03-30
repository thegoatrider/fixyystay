'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProperty } from './actions'
import { useRouter } from 'next/navigation'

export default function CreatePropertyForm() {
  const [propertyType, setPropertyType] = useState('villa')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    
    // Clear the original 'image' file inputs and manually append our state-managed files
    formData.delete('image')
    
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
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile);
            }, 'image/jpeg', 0.8);
          };
          img.onerror = () => resolve(file);
          img.src = event.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      });
    };

    const compressedFiles = await Promise.all(selectedFiles.map(compressImage));
    
    compressedFiles.forEach(file => {
      formData.append('image', file)
    })
    
    if (coverImage) {
      const compressedCover = await compressImage(coverImage)
      formData.append('coverImage', compressedCover)
    }

    try {
      const result = await createProperty(formData)
      if (result?.error) {
        alert(result.error)
        setIsLoading(false)
      } else if (result?.success) {
        router.push(`/dashboard/owner/property/${result.id}`)
      }
    } catch (err) {
      console.error(err)
      alert('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Property Name</Label>
        <Input name="name" required placeholder="e.g. Beachfront Villa" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="type">Property Type</Label>
        <select 
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
                name="amenities" 
                value={amenity}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{amenity}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priceBucket">Maximum Price Cap / Category</Label>
        <select name="priceBucket" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" required>
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
        <Label htmlFor="city">City</Label>
        <select
          name="city"
          required
          defaultValue="Alibag"
          className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="Alibag">Alibag</option>
          <option value="Lonavala" disabled>Lonavala (Coming Soon)</option>
          <option value="Khandala" disabled>Khandala (Coming Soon)</option>
          <option value="Matheran" disabled>Matheran (Coming Soon)</option>
          <option value="Mahableshwar" disabled>Mahableshwar (Coming Soon)</option>
          <option value="Mumbai" disabled>Mumbai (Coming Soon)</option>
          <option value="Goa" disabled>Goa (Coming Soon)</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cityArea">Area / Sub-locality</Label>
        <select
          name="cityArea"
          required
          defaultValue=""
          className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="" disabled>Select area...</option>
          <optgroup label="── Alibag Raigad ──">
            <option value="Rewas">Rewas</option>
            <option value="Bodni">Bodni</option>
            <option value="Karmale / Hashivare">Karmale / Hashivare</option>
            <option value="Saral">Saral</option>
            <option value="Chondhi">Chondhi</option>
            <option value="Awas">Awas</option>
            <option value="Sasawane">Sasawane</option>
            <option value="Mandwa">Mandwa</option>
            <option value="Kihim">Kihim</option>
            <option value="Zirad">Zirad</option>
            <option value="Thal">Thal</option>
            <option value="Alibag">Alibag</option>
            <option value="Varsoli">Varsoli</option>
            <option value="Akshi">Akshi</option>
            <option value="Nagaon">Nagaon</option>
            <option value="Chaul">Chaul</option>
            <option value="Revdanda">Revdanda</option>
            <option value="Salav">Salav</option>
            <option value="Korlai">Korlai</option>
            <option value="Kashid">Kashid</option>
            <option value="Nandgaon">Nandgaon</option>
            <option value="Murud">Murud</option>
            <option value="Rajpuri">Rajpuri</option>
          </optgroup>
          <optgroup label="── Shrivardhan Raigad ──">
            <option value="Agardanda">Agardanda</option>
            <option value="Dighi">Dighi</option>
            <option value="Diveagar">Diveagar</option>
            <option value="Borli Panchatan">Borli Panchatan</option>
            <option value="Bagmandala">Bagmandala</option>
            <option value="Shrivardhan">Shrivardhan</option>
            <option value="Harihareshwar">Harihareshwar</option>
            <option value="Velas">Velas</option>
            <option value="Bharadkhol">Bharadkhol</option>
            <option value="Shekhadi">Shekhadi</option>
            <option value="Sarve">Sarve</option>
          </optgroup>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pincode">Area Pincode</Label>
        <Input
          name="pincode"
          type="text"
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
          required
          placeholder="e.g. 402201"
          className="tracking-widest font-mono"
        />
        <p className="text-[10px] text-gray-400">
          Guests will see an approximate map of this pincode area. Precise location is never shown until after booking.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="helpdeskNumber">Helpdesk Number</Label>
        <Input name="helpdeskNumber" required placeholder="e.g. +91 98765 43210" />
      </div>

      <div className="space-y-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <Label htmlFor="coverImageInput" className="font-bold text-gray-900">Cover Image (Main Display)</Label>
        <p className="text-[11px] text-gray-500 mb-2">This will be the primary image shown to guests.</p>
        <Input 
          name="coverImageInput" 
          type="file" 
          accept="image/*" 
          onChange={handleCoverChange}
          className="cursor-pointer bg-white"
        />
        {coverPreview && (
          <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border-2 border-blue-200 shadow-md mt-4 group">
            <span className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-md">Main Cover</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image" className="font-bold text-gray-900">Property Images (Gallery)</Label>
        <Input 
          name="image" 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={handleFileChange}
          className="cursor-pointer"
        />
        
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-2 max-h-64 overflow-y-auto p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            {previews.map((url, index) => (
              <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 bg-white group shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                  title="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full mt-2" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Property'}
      </Button>
    </form>
  )
}
