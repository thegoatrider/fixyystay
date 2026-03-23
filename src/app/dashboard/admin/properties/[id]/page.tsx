import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { updateProperty } from './actions'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import EditPropertyForm from '@/components/EditPropertyForm'

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

        <EditPropertyForm property={property} />
      </div>
    </div>
  )
}
