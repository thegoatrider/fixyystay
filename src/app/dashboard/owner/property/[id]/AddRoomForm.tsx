'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addRoom } from './actions'

interface AddRoomFormProps {
  propertyId: string
}

export default function AddRoomForm({ propertyId }: AddRoomFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    
    // Clear 'image' and manually append our state-managed files
    formData.delete('image')
    selectedFiles.forEach(file => {
      formData.append('image', file)
    })
    
    try {
      const result = await addRoom(propertyId, formData)
      
      if (result?.error) {
        alert(result.error)
        return
      }

      // Reset state on success
      previews.forEach(url => URL.revokeObjectURL(url))
      setPreviews([])
      setSelectedFiles([])
      e.currentTarget.reset()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to add room')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg p-5 shadow-sm sm:sticky sm:top-24">
      <h3 className="font-bold mb-4">Add a New Room</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Room Name / Label</Label>
          <Input name="name" placeholder="e.g. Room 101" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="acType">AC / Non AC</Label>
            <select name="acType" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" required>
              <option value="AC">AC</option>
              <option value="Non AC">Non AC</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select name="category" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" required>
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
              <option value="Deluxe">Deluxe</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (₹ per night)</Label>
          <Input type="number" name="basePrice" placeholder="2000" min="0" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceBucket">Price Cap / Bucket</Label>
          <select name="priceBucket" className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm" required>
            <option value="" disabled selected>Select price bucket...</option>
            <option value="₹799">₹799</option>
            <option value="₹999">₹999</option>
            <option value="₹1299">₹1299</option>
            <option value="₹1499">₹1499</option>
            <option value="₹1999">₹1999</option>
            <option value="₹2499">₹2499</option>
            <option value="₹2999">₹2999</option>
            <option value="₹3499">₹3499</option>
            <option value="₹3999">₹3999</option>
            <option value="₹6999">₹6999</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="image">Room Photos</Label>
          <Input 
            type="file" 
            name="image" 
            accept="image/*" 
            multiple 
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              {previews.map((url, index) => (
                <div key={index} className="relative w-16 h-16 rounded-md overflow-hidden border bg-white shadow-sm group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Room'}
        </Button>
      </form>
    </div>
  )
}
