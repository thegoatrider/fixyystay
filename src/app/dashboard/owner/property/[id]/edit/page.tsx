import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditPropertyForm from '@/components/EditPropertyForm'

export default async function EditPropertyPage(
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const propertyId = params.id
  const supabase = await createClient()

  // Verify owner
  const { data: { user } } = await supabase.auth.getUser()
  const { data: owner } = await supabase.from('owners').select('id').eq('user_id', user?.id).single()

  if (!owner) redirect('/login')

  const { data: property, error } = await supabase
    .from('properties')
    .select('id, name, type, description, amenities, highlights, address, city, area_name, pincode, contact_number, helpdesk_number, image_url, images, base_price, location, is_active')
    .eq('id', propertyId)
    .eq('owner_id', owner.id)
    .single()

  if (error || !property) redirect('/dashboard/owner')

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, property_id, name, category, base_price, max_guests, price_bucket, image_url')
    .eq('property_id', propertyId)

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      <div>
        <Link href="/dashboard/owner" className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-4 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit {property.name}</h1>
            <p className="text-gray-500 mt-1">Update property highlights, amenities, and gallery photos.</p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <EditPropertyForm property={property} initialRooms={rooms || []} />
      </div>
    </div>
  )
}
