'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createOrganization(formData: FormData) {
  try {
    const supabase = createAdminClient()
    const name = formData.get('name') as string
    const slug = formData.get('slug') as string
    const primaryColor = formData.get('primaryColor') as string || '#2563EB'
    const logoUrl = formData.get('logoUrl') as string || null

    if (!name || !slug) {
      return { error: 'Name and Slug are required.' }
    }

    const { data, error } = await supabase
      .from('organizations')
      .insert([{
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        primary_color: primaryColor,
        logo_url: logoUrl
      }])
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/dashboard/admin')
    return { success: true, organization: data }
  } catch (err: any) {
    return { error: err.message || 'Failed to create organization' }
  }
}

export async function regenerateApiKey(orgId: string) {
  try {
    const supabase = createAdminClient()
    
    // We can use an RPC or just let default uuid_generate_v4() handle it if we had a trigger,
    // but easiest way in JS is to generate a new UUID or let Supabase handle it via sql.
    // Actually we can generate a random UUID v4 here.
    const newKey = crypto.randomUUID()
    
    const { error } = await supabase
      .from('organizations')
      .update({ api_key: newKey })
      .eq('id', orgId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to regenerate API key' }
  }
}
