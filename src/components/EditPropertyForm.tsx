'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProperty } from '@/app/actions/property'
import { X, Upload, Save, CheckCircle, Image as ImageIcon } from 'lucide-react'

export default function EditPropertyForm({ property }: { property: any }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Track existing photos that user decides to KEEP
  const [existingPhotos, setExistingPhotos] = useState<string[]>(property.image_urls || [])
  
  // Track newly selected photos
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  const ALL_AMENITIES = [
    'WiFi', 'Pool', 'AC', 'Parking', 'Kitchen', 'TV', 
    'Power Backup', 'Geyser', 'Caretaker', 'Music System',
    'Bonfire', 'BBQ', 'Pet Friendly', 'First Aid', 'Security'
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const selectedFiles = Array.from(files)
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)
    
    const formData = new FormData(e.currentTarget)
    
    // Add arrays to formData
    formData.append('existingPhotos', JSON.stringify(existingPhotos))
    
    formData.delete('newImages')
    newFiles.forEach(file => {
      formData.append('newImages', file)
    })

    try {
      const result = await updateProperty(property.id, formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setNewFiles([])
        setNewPreviews([])
        // Optionally update existingPhotos to reflect the new state, but a page reload usually handles this.
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err: any) {
      setError('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-semibold">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Updates saved successfully!</div>}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-gray-700 font-bold">Property Name</Label>
        <Input name="name" defaultValue={property.name} required className="font-semibold" />
      </div>

      <div className="space-y-3">
        <Label className="text-gray-700 font-bold">Amenities</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
          {ALL_AMENITIES.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                name="amenities" 
                value={amenity}
                defaultChecked={property.amenities?.includes(amenity)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{amenity}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-gray-700 font-bold">Photos ({existingPhotos.length + newFiles.length})</Label>
          <div className="relative">
            <input 
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
          {existingPhotos.map((url, i) => (
            <div key={`exist-${i}`} className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Property existing" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => removeExistingPhoto(i)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {newPreviews.map((url, i) => (
            <div key={`new-${i}`} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-dashed border-blue-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Property new" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-blue-900/10 flex items-center justify-center pointer-events-none">
                <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md">NEW</span>
              </div>
              <button 
                type="button" 
                onClick={() => removeNewPhoto(i)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
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

      <div className="border-t pt-6 flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl">
          {isLoading ? 'Saving...' : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
        </Button>
      </div>
    </form>
  )
}
