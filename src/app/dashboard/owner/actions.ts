'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProperty(formData: FormData) {
  // 1. Initialize Admin client to bypass RLS entirely for this operation
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '[E1] Session expired. Please log in again.' }
  
  if (user?.user_metadata?.role !== 'owner') {
    return { error: '[E2] Access denied. Your account role is not "owner".' }
  }

  // 2. Get Owner ID using Admin client to ensure we find it even if RLS is tight
  const { data: owner, error: ownerError } = await supabaseAdmin
    .from('owners')
    .select('id')
    .eq('user_id', user.id)
    .single()
    
  if (ownerError || !owner) {
    console.error('Owner fetch error:', ownerError)
    return { error: `[E3] Owner record not found for UID: ${user.id}. Please contact support.` }
  }

  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const amenitiesRaw = formData.get('amenities') as string
  const amenities = amenitiesRaw ? amenitiesRaw.split(',').map(s => s.trim()).filter(Boolean) : []
  const priceBucket = formData.get('priceBucket') as string
  const latitude = Number(formData.get('latitude')) || 0
  const longitude = Number(formData.get('longitude')) || 0
  const cityArea = formData.get('cityArea') as string
  const helpdeskNumber = formData.get('helpdeskNumber') as string
  
  // 3. Handle Image Upload
  const imageFile = formData.get('image') as File
  let image_url = null
  
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${owner.id}-${Date.now()}.${fileExt}`
    
    // Upload using standard client (storage usually has its own RLS or is public)
    const { error: uploadError } = await supabase.storage
      .from('property_images')
      .upload(fileName, imageFile)
      
    if (uploadError) {
      console.error('Image upload failed:', uploadError)
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('property_images')
        .getPublicUrl(fileName)
      image_url = publicUrlData.publicUrl
    }
  }

  // 4. Insert Property using Admin client
  const { data, error } = await supabaseAdmin
    .from('properties')
    .insert([{
      owner_id: owner.id,
      name,
      type,
      description,
      amenities,
      image_url,
      helpdesk_number: helpdeskNumber,
      city_area: cityArea,
      latitude,
      longitude,
      approved: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Property creation failed:', error)
    return { error: `[E4] Database Insert Failed: ${error.message} (${error.code})` }
  }

  // 5. Create Default Room
  if (priceBucket) {
    const { error: roomError } = await supabaseAdmin.from('rooms').insert([{
      property_id: data.id,
      name: type === 'villa' ? 'Entire Villa' : 'Standard Room',
      category: 'Standard',
      base_price: Number(priceBucket.replace(/[^0-9]/g, '')) || 0,
      price_bucket: priceBucket,
      is_ac: true
    }])
    if (roomError) console.error('Default room creation failed:', roomError)
  }

  revalidatePath('/dashboard/owner')
  return { success: true, id: data.id }
}
