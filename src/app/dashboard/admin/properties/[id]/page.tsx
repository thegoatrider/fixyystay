import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import EditPropertyForm from '@/components/EditPropertyForm'
import GuestCheckinQR from '@/components/GuestCheckinQR'
import PropertyApprovalActions from '@/app/dashboard/admin/PropertyApprovalActions'
import DeletePropertyButton from '@/app/dashboard/admin/DeletePropertyButton'

export default async function ManagePropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  const { data: property, error } = await supabaseAdmin
    .from('properties')
    .select('*, owners(id, name, free_tier_enabled)')
    .eq('id', propertyId)
    .single()

  if (error || !property) {
    console.error('Property Load Error:', error, 'Property Data:', property)
    redirect('/dashboard/admin')
  }

  // Check if owner has completed payment
  const owner = property.owners as any
  let isOwnerPaid = owner?.free_tier_enabled === true

  if (!isOwnerPaid && property.owner_id) {
    const { data: sub } = await supabaseAdmin
      .from('owner_subscriptions')
      .select('status, end_date')
      .eq('owner_id', property.owner_id)
      .eq('status', 'active')
      .maybeSingle()

    if (sub && new Date(sub.end_date) > new Date()) {
      isOwnerPaid = true
    }
  }

  if (!isOwnerPaid && property.id) {
    const { data: hub } = await supabaseAdmin
      .from('guest_hub_settings')
      .select('id')
      .eq('property_id', property.id)
      .eq('subscription_status', 'active')
      .maybeSingle()

    if (hub) isOwnerPaid = true
  }

  const { data: rooms } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('property_id', propertyId)

  const { data: propertyRooms } = await supabaseAdmin
    .from('property_rooms')
    .select('id, property_id, room_number, created_at')
    .eq('property_id', propertyId)
    .order('room_number', { ascending: true })

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Manage Property</h1>
      </div>

      {!property.approved && (
        isOwnerPaid ? (
          <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 justify-between items-center shadow-sm">
            <div className="flex items-center gap-4 text-orange-800">
              <AlertCircle className="w-8 h-8 text-orange-500 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold">This property is pending approval</h2>
                <p className="text-sm opacity-80">Review the images and details below before approving.</p>
              </div>
            </div>
            <div className="w-full sm:w-auto min-w-[200px]">
              <PropertyApprovalActions propertyId={property.id} />
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 justify-between items-center shadow-sm">
            <div className="flex items-center gap-4 text-amber-900">
              <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold">Payment Incomplete / Unpaid Account</h2>
                <p className="text-sm opacity-90">
                  The property owner ({property.owners?.name || 'Owner'}) has not completed payment for their subscription. This property is blocked from approval until their subscription is active.
                </p>
              </div>
            </div>
            <div className="w-full sm:w-auto min-w-[160px] flex justify-end">
              <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
            </div>
          </div>
        )
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border shadow-sm p-6 md:p-8">
            <div className="mb-6 pb-6 border-b flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Business Partner</div>
                <div className="text-xl font-bold text-blue-600">{property.owners?.name || 'Unknown Owner'}</div>
              </div>
              <div className="text-right">
                 <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Property ID</div>
                 <div className="text-sm font-mono font-bold bg-gray-100 px-2 py-1 rounded mt-1">{property.uid}</div>
              </div>
            </div>

            <EditPropertyForm
              property={property}
              initialRooms={rooms || []}
              initialPropertyRooms={propertyRooms || []}
            />
          </div>
        </div>

        <div className="lg:col-span-1 border-l lg:pl-8 space-y-8">
          <GuestCheckinQR propertyId={property.id} propertyName={property.name} />
          
          <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
             <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12 font-black text-9xl">FIX</div>
             <h3 className="text-xl font-black mb-2 relative z-10">Admin Control</h3>
             <p className="text-indigo-100 text-sm relative z-10 leading-relaxed font-medium mb-4">
               The QR code on the left is property-specific. Once printed and placed at the reception, guests can check-in without manual entry by the owner.
             </p>
             <div className="text-xs font-bold bg-white/10 px-3 py-2 rounded-lg border border-white/10 relative z-10 italic">
               Security Note: Fixy Stays handles ID encryption.
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
