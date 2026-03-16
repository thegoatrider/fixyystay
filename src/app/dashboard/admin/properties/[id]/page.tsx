import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { updateProperty } from './actions'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default async function ManagePropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const supabase = await createClient()

  const { data: property, error } = await supabase
    .from('properties')
    .select('*, owners(name)')
    .eq('id', propertyId)
    .single()

  if (error || !property) {
    console.error('Property Load Error:', error, 'Property Data:', property)
    redirect('/dashboard/admin')
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">Manage Property</h1>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 md:p-8">
        <div className="mb-6 pb-6 border-b flex flex-col gap-1">
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Owner Details</div>
          <div className="text-lg">{property.owners?.name || 'Unknown Owner'}</div>
        </div>

        <form action={updateProperty.bind(null, propertyId)} className="flex flex-col gap-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium">Property Name</label>
              <input 
                id="name"
                name="name" 
                defaultValue={property.name} 
                required 
                className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="type" className="text-sm font-medium">Property Type</label>
              <select 
                id="type"
                name="type" 
                defaultValue={property.type} 
                required
                className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="hotel">Hotel</option>
                <option value="resort">Resort</option>
                <option value="villa">Villa</option>
                <option value="apartment">Apartment</option>
                <option value="homestay">Homestay</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <textarea 
              id="description"
              name="description" 
              defaultValue={property.description || ''} 
              rows={4}
              className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="amenities" className="text-sm font-medium">Amenities (Comma separated)</label>
            <input 
              id="amenities"
              name="amenities" 
              defaultValue={(property.amenities || []).join(', ')} 
              placeholder="e.g. WiFi, Pool, AC, Parking"
              className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="image_url" className="text-sm font-medium">Main Image URL</label>
            <input 
              id="image_url"
              name="image_url" 
              type="url"
              defaultValue={property.image_url || ''} 
              placeholder="https://example.com/image.jpg"
              className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {property.image_url && (
              <div className="mt-2 text-sm text-gray-500 flex flex-col gap-2">
                <span>Current Image Preview:</span>
                <img src={property.image_url} alt="Preview" className="w-full max-w-sm h-48 object-cover rounded shadow-sm border" />
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
