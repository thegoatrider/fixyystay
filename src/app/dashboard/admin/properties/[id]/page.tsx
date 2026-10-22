import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { ArrowLeft, AlertCircle, Phone } from 'lucide-react'
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
    .select('*, owners(id, name, email, phone)')
    .eq('id', propertyId)
    .single()

  if (error || !property) {
    console.error('Property Load Error:', error, 'Property Data:', property)
    redirect('/dashboard/admin')
  }

  // Check if property has active subscription
  const owner = (Array.isArray(property.owners) ? property.owners[0] : property.owners) as any
  let isOwnerPaid = false
  const now = new Date()

  const { data: propSub } = await supabaseAdmin
    .from('property_subscriptions')
    .select('id, status, end_date')
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .gt('end_date', now.toISOString())
    .limit(1)
    .maybeSingle()

  if (propSub) {
    isOwnerPaid = true
  } else if (property.is_guest_hub_only) {
    const { data: hub } = await supabaseAdmin
      .from('guest_hub_settings')
      .select('id')
      .eq('property_id', propertyId)
      .eq('subscription_status', 'active')
      .maybeSingle()

    if (hub) isOwnerPaid = true
  } else if (property.owner_id) {
    const { data: legacySub } = await supabaseAdmin
      .from('owner_subscriptions')
      .select('status, end_date')
      .eq('owner_id', property.owner_id)
      .eq('status', 'active')
      .gt('end_date', now.toISOString())
      .maybeSingle()

    if (legacySub) isOwnerPaid = true
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

  const ownerPhone = property.helpdesk_number || owner?.phone || null
  const cleanPhone = ownerPhone ? ownerPhone.replace(/\D/g, '') : null

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Manage Property</h1>
      </div>

      {!property.approved && (
        <div className={`border rounded-3xl p-6 flex flex-col sm:flex-row gap-6 justify-between items-center shadow-sm ${
          isOwnerPaid ? 'bg-orange-50 border-orange-200 text-orange-950' : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-center gap-4">
            <AlertCircle className={`w-8 h-8 flex-shrink-0 ${isOwnerPaid ? 'text-orange-500' : 'text-amber-600'}`} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">This property is pending approval</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isOwnerPaid ? 'text-green-700 bg-green-100 border border-green-200' : 'text-amber-700 bg-amber-100 border border-amber-200'
                }`}>
                  {isOwnerPaid ? '✓ Subscription Active' : '⏳ Payment Pending / Offline'}
                </span>
              </div>
              <p className="text-sm opacity-85 mt-0.5">
                {isOwnerPaid 
                  ? 'Review the images and details below before approving.' 
                  : 'Notice: Property owner does not have an active subscription. An active subscription is required before approval.'}
              </p>
              {ownerPhone ? (
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <a href={`tel:${ownerPhone}`} className="font-bold hover:underline flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-orange-600" />
                    {ownerPhone}
                  </a>
                  {cleanPhone && (
                    <a 
                      href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(property.owners?.name || 'Owner')},%20reviewing%20your%20property%20listing%20${encodeURIComponent(property.name)}.`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs font-bold text-green-800 bg-white border border-green-200 px-2 py-0.5 rounded shadow-sm hover:bg-green-50"
                    >
                      WhatsApp Owner
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs font-semibold text-red-600 mt-1">⚠️ No phone number provided</p>
              )}
            </div>
          </div>
          <div className="w-full sm:w-auto min-w-[200px] flex gap-2">
            <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
            <PropertyApprovalActions propertyId={property.id} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border shadow-sm p-6 md:p-8">
            <div className="mb-6 pb-6 border-b flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Business Partner</div>
                <div className="text-xl font-bold text-blue-600">{property.owners?.name || 'Unknown Owner'}</div>
                {ownerPhone ? (
                  <div className="flex items-center gap-2 mt-1">
                    <a href={`tel:${ownerPhone}`} className="text-xs font-bold text-gray-800 hover:text-blue-600 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                      {ownerPhone}
                    </a>
                    {cleanPhone && (
                      <a 
                        href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(property.owners?.name || 'Owner')},%20regarding%20your%20property%20${encodeURIComponent(property.name)}.`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded hover:bg-green-100"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-red-500 font-semibold mt-1">⚠️ No phone number provided</span>
                )}
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
