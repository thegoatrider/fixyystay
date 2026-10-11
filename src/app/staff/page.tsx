import { getAuthorizedHubActor, getPropertyGuestHubBundle } from '@/app/actions/guest-hub'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import StaffPortalClient from './StaffPortalClient'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Staff Console · Guest Hub',
  robots: { index: false, follow: false },
}

export default async function StaffPortalPage(props: {
  searchParams: Promise<{ propertyId?: string }>
}) {
  const searchParams = await props.searchParams
  const requestedPropertyId = searchParams.propertyId

  const actor = await getAuthorizedHubActor(requestedPropertyId)
  let initialBundle: any = null
  let ownerProperties: { id: string; name: string }[] = []

  if (actor.authorized) {
    if (actor.isOwnerOrSuperAdmin) {
      const supabase = await createClient()
      const supabaseAdmin = createAdminClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (actor.actorRole === 'platform_owner') {
        const { data: propsList } = await supabaseAdmin
          .from('properties')
          .select('id, name')
          .order('created_at', { ascending: false })
          .limit(100)
        ownerProperties = propsList || []
      } else if (user) {
        const { data: owner } = await supabaseAdmin
          .from('owners')
          .select('id')
          .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
          .maybeSingle()

        if (owner) {
          const { data: propsList } = await supabaseAdmin
            .from('properties')
            .select('id, name')
            .eq('owner_id', owner.id)
            .order('created_at', { ascending: true })
          ownerProperties = propsList || []
        }
      }
    }

    const propIdToLoad =
      requestedPropertyId || actor.propertyId || ownerProperties[0]?.id
    if (propIdToLoad) {
      const res = await getPropertyGuestHubBundle(propIdToLoad)
      if (!res.error) {
        initialBundle = res
      }
    }
  }

  return (
    <StaffPortalClient
      initialAuthorized={actor.authorized && Boolean(initialBundle?.property)}
      initialBundle={initialBundle}
      ownerProperties={ownerProperties}
      initialPropertyId={
        requestedPropertyId || actor.propertyId || ownerProperties[0]?.id || null
      }
    />
  )
}
