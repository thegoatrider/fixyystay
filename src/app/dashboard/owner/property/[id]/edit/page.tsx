import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
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

  // 1. Verify user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const email = user.email?.toLowerCase().trim() || ''
  const userRole = (user.user_metadata?.role || '').toLowerCase().trim()
  const appRole = (user.app_metadata?.role || '').toLowerCase().trim()
  const isAdmin = 
    email === 'superadmin@fixstay.com' ||
    email === 'admin@fixstay.com' ||
    email.endsWith('@fixstay.com') ||
    userRole === 'admin' ||
    userRole === 'superadmin' ||
    appRole === 'admin' ||
    appRole === 'superadmin'

  const supabaseAdmin = createAdminClient()

  let property: any = null

  if (isAdmin) {
    // Admin can edit any property
    const { data, error } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .maybeSingle()

    if (error) console.error('Admin Property Edit Query Error:', error)
    property = data
  } else {
    // Look up owner record for user
    let { data: owner } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!owner && email) {
      const { data: matchedOwner } = await supabaseAdmin
        .from('owners')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (matchedOwner) {
        owner = matchedOwner
        await supabaseAdmin.from('owners').update({ user_id: user.id }).eq('id', matchedOwner.id)
      }
    }

    if (!owner) redirect('/login')

    const { data, error } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .maybeSingle()

    if (error) console.error('Owner Property Edit Query Error:', error)

    if (data) {
      // Self-heal: if property has no owner_id, claim it for this owner
      if (!data.owner_id) {
        await supabaseAdmin
          .from('properties')
          .update({ owner_id: owner.id })
          .eq('id', propertyId)
        data.owner_id = owner.id
      }

      if (data.owner_id === owner.id) {
        property = data
      }
    }
  }

  if (!property) redirect('/dashboard/owner')

  const { data: rooms } = await supabaseAdmin
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
