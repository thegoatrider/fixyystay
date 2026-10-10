'use client'

import { useState, useEffect } from 'react'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProperty } from '@/app/actions/property'
import { X, Upload, Save, CheckCircle, Image as ImageIcon, Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { addPropertyRoom, deletePropertyRoom } from '@/app/dashboard/owner/actions'

import { useRouter } from 'next/navigation'
import { INDIAN_STATES_AND_CITIES } from '@/lib/india-locations'
import { SearchableCitySelect } from '@/components/SearchableCitySelect'

export default function EditPropertyForm({ property, initialRooms = [] }: { property: any, initialRooms?: any[] }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const parseImageUrls = (val: any): string[] => {
    if (!val) return []
    if (Array.isArray(val)) return val.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val)
        if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      } catch {
        if (val.startsWith('{') && val.endsWith('}')) {
          return val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
        }
      }
    }
    return []
  }

  // Track existing photos that user decides to KEEP
  const [existingPhotos, setExistingPhotos] = useState<string[]>(() => parseImageUrls(property.image_urls))

  const [rooms, setRooms] = useState<any[]>([])
  const [newRoomNumber, setNewRoomNumber] = useState('')
  const [isAddingRoom, setIsAddingRoom] = useState(false)
  const [propertyType, setPropertyType] = useState(property.type || 'multi-room property')
  const [city, setCity] = useState(property.city === 'Pending' ? 'Alibag' : (property.city || 'Alibag'))
  const [cityArea, setCityArea] = useState(property.city_area || '')
  const [pincode, setPincode] = useState(property.pincode || '')
  const [availableAreas, setAvailableAreas] = useState<string[]>([])
  const [isDetectingPin, setIsDetectingPin] = useState(false)
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)

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
            setCityArea(data.areas[0])
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

  const fetchRooms = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('property_rooms')
      .select('id, property_id, room_number, room_type, status, floor_number')
      .eq('property_id', property.id)
      .order('room_number', { ascending: true })
    if (data) setRooms(data)
  }

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms()
  }, [property.id])

  const handleAddRoom = async () => {
    const cleanRoomNum = newRoomNumber.trim()
    if (!cleanRoomNum) return

    // Check duplicate
    const exists = rooms.some(r => r.room_number.toLowerCase() === cleanRoomNum.toLowerCase())
    if (exists) {
      alert(`Room number ${cleanRoomNum} already exists.`)
      return
    }

    setIsAddingRoom(true)
    const res = await addPropertyRoom(property.id, cleanRoomNum)
    setIsAddingRoom(false)
    if (res.success) {
      setNewRoomNumber('')
      fetchRooms() // Refresh the list
    } else {
      alert(res.error || 'Failed to add room')
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room number?')) return
    const res = await deletePropertyRoom(roomId)
    if (!res.success) {
      alert(res.error || 'Failed to delete room')
    } else {
      fetchRooms() // Refresh the list
    }
  }
  
  // Track newly selected photos
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  
  // Track Cover Image
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(property.image_url || null)

  const ALL_AMENITIES = [
    'WiFi', 'Pool', 'AC', 'Parking', 'Kitchen', 'TV', 
    'Power Backup', 'Geyser', 'Caretaker', 'Music System',
    'Bonfire', 'BBQ', 'Pet Friendly', 'First Aid', 'Security'
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const selectedFiles = Array.from(files)
    if (existingPhotos.length + newFiles.length + selectedFiles.length > 15) {
      alert('only 15 pictures of property are permitted.')
      e.target.value = ''
      return
    }

    const previews = selectedFiles.map(f => URL.createObjectURL(f))
    
    setNewFiles(prev => [...prev, ...selectedFiles])
    setNewPreviews(prev => [...prev, ...previews])
    e.target.value = ''
  }

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewPhoto = (index: number) => {
    URL.revokeObjectURL(newPreviews[index])
    setNewPreviews(prev => prev.filter((_, i) => i !== index))
    setNewFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCoverImageFile(file)
    setCoverImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)
    
    if (existingPhotos.length + newFiles.length > 15) {
      setError('only 15 pictures of property are permitted.')
      setIsLoading(false)
      return
    }
    
    const formData = new FormData(e.currentTarget)
    
    // Add arrays to formData
    formData.append('existingPhotos', JSON.stringify(existingPhotos))
    
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

    const compressedFiles = await Promise.all(newFiles.map(compressImage));
    
    formData.delete('newImages')
    compressedFiles.forEach(file => {
      formData.append('newImages', file)
    })
    
    if (coverImageFile) {
      const compressedCover = await compressImage(coverImageFile)
      formData.append('coverImage', compressedCover)
    }

    try {
      const result = await updateProperty(property.id, formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setNewFiles([])
        setNewPreviews([])
        setCoverImageFile(null)

        if (result.image_urls) {
          setExistingPhotos(parseImageUrls(result.image_urls))
        } else {
          // Refetch the updated image_urls from DB as fallback
          const supabase = createClient()
          const { data: updatedProp } = await supabase
            .from('properties')
            .select('image_urls, image_url')
            .eq('id', property.id)
            .single()
          if (updatedProp?.image_urls) {
            setExistingPhotos(parseImageUrls(updatedProp.image_urls))
          }
          if (updatedProp?.image_url) {
            setCoverImagePreview(updatedProp.image_url)
          }
        }

        if (result.image_url) {
          setCoverImagePreview(result.image_url)
        }

        router.refresh()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while saving.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 pb-24">

      <div className="space-y-2">
        <Label htmlFor="name" className="text-gray-700 font-bold">Property Name</Label>
        <Input id="name" name="name" defaultValue={property.name} required className="font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type" className="text-gray-700 font-bold">Property Type</Label>
        <select 
          id="type"
          name="type" 
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm"
          required
        >
          <option value="multi-room property">Multi-room Property</option>
          <option value="villa">Villa</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-gray-700 font-bold">Description</Label>
        <textarea 
          id="description"
          name="description" 
          defaultValue={property.description || ''} 
          rows={3}
          className="flex w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="max_guests" className="text-gray-700 font-bold">Standard Guests (Base Capacity)</Label>
          <Input type="number" id="max_guests" name="max_guests" defaultValue={property.max_guests || 2} required min={1} />
          <p className="text-[10px] text-gray-400 font-medium">Guests included in the base price.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_capacity" className="text-gray-700 font-bold">Total Max Capacity</Label>
          <Input type="number" id="max_capacity" name="max_capacity" defaultValue={property.max_capacity || 20} required min={1} />
          <p className="text-[10px] text-gray-400 font-medium">Maximum guests allowed in this property.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="houseRules" className="text-gray-700 font-bold">House Rules</Label>
        <textarea 
          id="houseRules"
          name="houseRules" 
          defaultValue={property.house_rules || ''} 
          rows={3}
          placeholder="List any property rules here..."
          className="flex w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-gray-700 font-bold">Amenities</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
          {ALL_AMENITIES.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                id={`amenity-${amenity.toLowerCase().replace(/\s+/g, '-')}`}
                name="amenities" 
                value={amenity}
                defaultChecked={property.amenities?.includes(amenity)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{amenity}</span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Label htmlFor="otherAmenities" className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5 block">Other Amenities (Custom)</Label>
          <Input 
            id="otherAmenities"
            name="otherAmenities" 
            defaultValue={property.amenities?.filter((a: string) => !ALL_AMENITIES.includes(a)).join(', ')}
            placeholder="e.g. Infinity Pool, Movie Room, Chef on call" 
            className="bg-gray-50/50 border-dashed focus:border-solid transition-all"
          />
          <p className="text-[10px] text-gray-400 mt-1 italic">Separate multiple entries with commas</p>
        </div>
      </div>

      {(initialRooms.length === 0 || propertyType === 'villa') && (
        <div className="space-y-2">
          <Label htmlFor="priceBucket" className="text-gray-700 font-bold">Maximum Price Cap / Category</Label>
          <select id="priceBucket" name="priceBucket" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" defaultValue={initialRooms[0]?.price_bucket || ""} required>
            <option value="" disabled>Select max price bucket...</option>
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
      )}

      <div className="space-y-2">
        <Label htmlFor="extra_per_pax" className="text-gray-700 font-bold">Extra Cost Per Additional Guest (₹)</Label>
        <Input
          id="extra_per_pax"
          name="extra_per_pax"
          type="number"
          min="0"
          step="1"
          defaultValue={property.extra_per_pax || 0}
          placeholder="e.g. 2999"
        />
        <p className="text-[10px] text-gray-400 font-medium">₹0 = no extra charge beyond base guests</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="pincode" className="text-gray-700 font-bold">Area Pincode</Label>
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
          placeholder="e.g. 402201, 403516, 560001"
          className="tracking-widest font-mono"
        />
        <p className="text-[10px] text-gray-400 font-medium">Entering a 6-digit pincode auto-detects City & Area across India.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city" className="text-gray-700 font-bold">City / Destination</Label>
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
        <Label htmlFor="cityArea" className="text-gray-700 font-bold">Area / Sub-locality</Label>
        <Input
          id="cityArea"
          name="cityArea"
          required
          value={cityArea}
          onChange={(e) => setCityArea(e.target.value)}
          placeholder="e.g. Kihim, Calangute, Indiranagar, Bandra"
          list="popular-areas"
          className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm"
        />
        <datalist id="popular-areas">
          {availableAreas.map((a) => (
            <option key={a} value={a} />
          ))}
          <option value="Kihim" />
          <option value="Nagaon" />
          <option value="Alibag" />
          <option value="Mandwa" />
          <option value="Varsoli" />
          <option value="Akshi" />
          <option value="Awas" />
          <option value="Sasawane" />
          <option value="Kashid" />
          <option value="Murud" />
          <option value="Calangute" />
          <option value="Candolim" />
          <option value="Baga" />
          <option value="Anjuna" />
          <option value="Vagator" />
          <option value="Old Manali" />
          <option value="Tapovan" />
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="helpdeskNumber" className="text-gray-700 font-bold">Helpdesk Number</Label>
        <Input id="helpdeskNumber" name="helpdeskNumber" required defaultValue={property.helpdesk_number || ""} placeholder="e.g. +91 98765 43210" />
      </div>

      <div className="space-y-4 bg-gray-50 border border-gray-100 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col gap-1 mb-2">
          <Label htmlFor="coverImage" className="text-gray-900 font-bold text-base">Cover Image (Main Display)</Label>
          <p className="text-xs text-gray-500">This image represents the property in listings.</p>
        </div>
        
        <div className="relative w-full sm:w-72 h-48 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-white group hover:border-blue-400 transition-colors">
          {coverImagePreview ? (
            <>
              <NextImage src={coverImagePreview} alt="Cover Preview" fill unoptimized className="object-cover" />
              {coverImageFile && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md z-10">
                  NEW COVER
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
              <ImageIcon className="w-8 h-8 opacity-20" />
              <span className="text-xs font-semibold">No cover image</span>
            </div>
          )}
          <Input 
            id="coverImage"
            name="coverImage" 
            type="file" 
            accept="image/*" 
            onChange={handleCoverChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            title="Change Cover Image"
          />
          <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 transition-opacity ${coverImagePreview ? 'opacity-0 group-hover:opacity-100' : ''}`}>
            <p className="text-white text-xs font-bold text-center drop-shadow-md flex items-center justify-center gap-1">
              <Upload className="w-3 h-3" /> Click to upload new
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="galleryImages" className="text-gray-700 font-bold">Photos Gallery ({existingPhotos.length + newFiles.length})</Label>
          <div className="relative">
            <input 
              id="galleryImages"
              name="galleryImages" 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button type="button" variant="outline" size="sm" className="gap-2 pointer-events-none">
              <Upload className="w-4 h-4" /> Add Photos
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {existingPhotos.filter(Boolean).map((url, i) => (
            <div key={`exist-${i}`} className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-200">
              <NextImage src={url} alt="Property existing" fill unoptimized sizes="120px" className="object-cover" />
              <button 
                type="button" 
                onClick={() => removeExistingPhoto(i)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {newPreviews.map((url, i) => (
            <div key={`new-${i}`} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-dashed border-blue-400">
              <NextImage src={url} alt="Property new" fill unoptimized sizes="120px" className="object-cover opacity-80" />
              <div className="absolute inset-0 bg-blue-900/10 flex items-center justify-center pointer-events-none">
                <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md">NEW</span>
              </div>
              <button 
                type="button" 
                onClick={() => removeNewPhoto(i)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {existingPhotos.length === 0 && newFiles.length === 0 && (
            <div className="col-span-full aspect-[4/1] bg-gray-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-2">
              <ImageIcon className="w-8 h-8 opacity-20" />
              <p className="text-xs font-semibold">No photos found. Add some to attract guests!</p>
            </div>
          )}
        </div>
      </div>

      {/* Room Registry Section */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-gray-900 font-bold text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-pulse" />
            Room Registry
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Add or remove individual room numbers (e.g. 101, 302) for stay assignments.
          </p>
        </div>

        <div className="flex items-center gap-2 max-w-sm">
          <Input
            id="roomNumberRegistry"
            name="roomNumberRegistry"
            placeholder="Room Number (e.g. 101)"
            value={newRoomNumber}
            onChange={e => setNewRoomNumber(e.target.value)}
            className="h-10 rounded-xl bg-white"
            onKeyDown={async e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                await handleAddRoom()
              }
            }}
          />
          <Button
            type="button"
            onClick={handleAddRoom}
            disabled={isAddingRoom || !newRoomNumber.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4 rounded-xl shadow-sm flex items-center gap-1.5 shrink-0"
          >
            {isAddingRoom ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add Room
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {rooms.length === 0 ? (
            <p className="text-xs text-gray-400 italic font-medium py-1">No rooms added to this property yet.</p>
          ) : (
            rooms.map((r: any) => (
              <div
                key={r.id}
                className="bg-white border border-gray-200 rounded-xl pl-3 pr-2 py-1.5 flex items-center gap-2 text-sm font-bold text-gray-700 hover:border-red-200 hover:bg-red-50/20 transition-all shadow-sm"
              >
                <span>Room {r.room_number}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(r.id)}
                  className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove Room"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6 border-t mt-4 pb-20 sm:pb-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-semibold">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Changes saved successfully!</div>}
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl h-14 text-lg">
            {isLoading ? 'Processing Images & Saving...' : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
          </Button>
        </div>
      </div>
    </form>
  )
}
