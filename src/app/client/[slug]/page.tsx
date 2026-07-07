import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'
import WhiteLabelCheckinClient from './ClientPage'

export default async function WhiteLabelPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const supabase = createAdminClient()
  
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, slug, primary_color, logo_url')
    .eq('slug', params.slug)
    .single()

  if (error || !org) {
    notFound()
  }

  return <WhiteLabelCheckinClient org={org} />
}
