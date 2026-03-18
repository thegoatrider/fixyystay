import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { approveProperty, assignInfluencer } from './actions'
import { CheckCircle, Users } from 'lucide-react'
import Link from 'next/link'
import DeletePropertyButton from './DeletePropertyButton'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // 1. Pending Approvals
  const { data: pendingProperties } = await supabase
    .from('properties')
    .select('*, owners(name), rooms(price_bucket)')
    .eq('approved', false)
    .order('created_at', { ascending: false })

  // 2. All Approved Properties
  const { data: approvedProperties } = await supabase
    .from('properties')
    .select('*, owners(name)')
    .eq('approved', true)
    .order('created_at', { ascending: false })

  // 3. Influencers
  const { data: influencers } = await supabase
    .from('influencers')
    .select('*')

  // 4. Influencer Promotion Stats
  // We will need a complex query to get clicks, bookings, revenue, commission.
  // For now, let's fetch basic mappings and calculate.
  const { data: promotionData } = await supabase
    .from('influencer_properties')
    .select(`
      id,
      property_id,
      influencer_id,
      properties(name),
      influencers(name)
    `)

  const { data: clicks } = await supabase.from('influencer_clicks').select('*')
  const { data: bookings } = await supabase.from('bookings').select('*')

  const promotions = promotionData?.map(promo => {
    const promoClicks = clicks?.filter(c => c.property_id === promo.property_id && c.influencer_id === promo.influencer_id).length || 0
    const promoBookings = bookings?.filter(b => b.property_id === promo.property_id && b.influencer_id === promo.influencer_id) || []
    const totalRevenue = promoBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0)
    const commission = totalRevenue * 0.10 // 10% commission rule

    return {
      ...promo,
      clicks: promoClicks,
      bookingsCount: promoBookings.length,
      revenue: totalRevenue,
      commission
    }
  }) || []

  return (
    <div className="flex flex-col gap-10">
      
      {/* SECTION 1: Pending Approvals */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="text-orange-500" /> Pending Property Approvals
        </h2>
        {pendingProperties && pendingProperties.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingProperties.map((prop) => (
              <div key={prop.id} className="border bg-white rounded-lg p-5 shadow-sm flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-lg">{prop.name}</h3>
                  <p className="text-sm text-gray-500">{prop.type} • Owner: {prop.owners?.name}</p>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    <p><span className="font-semibold">Amenities:</span> {prop.amenities?.join(', ') || 'None'}</p>
                    <p><span className="font-semibold">Max Price Tier:</span> {prop.rooms?.[0]?.price_bucket || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="mt-auto flex gap-2">
                  <DeletePropertyButton propertyId={prop.id} propertyName={prop.name} className="w-1/3" />
                  <form action={approveProperty.bind(null, prop.id)} className="w-2/3">
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
                      Approve
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed rounded-lg text-center text-gray-500">
            No properties pending approval.
          </div>
        )}
      </section>

      {/* SECTION 2: All Properties */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="text-green-500" /> Approved Properties
        </h2>
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Property Name</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {approvedProperties?.map((prop) => (
                <tr key={prop.id}>
                  <td className="px-6 py-4 font-medium">{prop.name}</td>
                  <td className="px-6 py-4">{prop.owners?.name}</td>
                  <td className="px-6 py-4 capitalize">{prop.type}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <form action={async (formData) => {
                        'use server'
                        const infId = formData.get('influencerId') as string
                        if (infId) await assignInfluencer(prop.id, infId)
                      }} className="flex-shrink-0 flex items-center gap-2">
                        <select name="influencerId" className="border rounded px-2 py-1 bg-gray-50" required defaultValue="">
                          <option value="" disabled>Select Influencer...</option>
                          {influencers?.map(inf => (
                            <option key={inf.id} value={inf.id}>{inf.name}</option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="secondary" className="flex-shrink-0">Assign</Button>
                      </form>
                      <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
                      <DeletePropertyButton propertyId={prop.id} propertyName={prop.name} />
                      <Button asChild size="sm" variant="outline" className="flex-shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50">
                        <Link href={`/dashboard/admin/properties/${prop.id}`}>Manage</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!approvedProperties || approvedProperties.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No approved properties yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3: Influencer Promotion Properties */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users className="text-blue-500" /> Influencer Promotion Properties
        </h2>
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Property</th>
                <th className="px-6 py-3">Influencer</th>
                <th className="px-6 py-3 text-right">Clicks</th>
                <th className="px-6 py-3 text-right">Bookings</th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-right">Commission (10%)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {promotions.map((promo) => {
                // Supabase joins with to-one relationships return an object or array. We need to safely extract name.
                const propVal = promo.properties as any;
                const infVal = promo.influencers as any;

                const propName = propVal && !Array.isArray(propVal) ? propVal.name : 'Unknown Property';
                const infName = infVal && !Array.isArray(infVal) ? infVal.name : 'Unknown Influencer';
                
                return (
                  <tr key={promo.id}>
                    <td className="px-6 py-4 font-medium">{propName}</td>
                    <td className="px-6 py-4">{infName}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{promo.clicks}</td>
                    <td className="px-6 py-4 text-right font-medium">{promo.bookingsCount}</td>
                    <td className="px-6 py-4 text-right text-gray-600">₹{promo.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">₹{promo.commission.toLocaleString()}</td>
                  </tr>
                )
              })}
              {promotions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No influencers assigned to properties yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      
    </div>
  )
}
