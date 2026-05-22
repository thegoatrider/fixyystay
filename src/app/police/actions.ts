'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export async function searchPoliceRecords(query: string, authPin: string) {
  // Using a simple hardcoded PIN for prototype security
  if (authPin !== '112') { // Standard emergency number as a default pin
    return { error: 'Invalid authentication PIN.' }
  }

  if (!query || query.length < 3) {
    return { error: 'Search query must be at least 3 characters long.' }
  }

  const supabase = createAdminClient()
  
  try {
    // 1. Search for matching identities
    const { data: identities, error: identityError } = await supabase
      .from('guest_identity')
      .select('*')
      .or(`document_number.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(50)

    if (identityError) {
      console.error('[POLICE] Identity search error:', identityError)
      return { error: 'Database error while searching identities.' }
    }

    if (!identities || identities.length === 0) {
      return { success: true, data: [] }
    }

    // 2. Fetch associated checkins and properties
    const checkinIds = [...new Set(identities.map(i => i.checkin_id).filter(Boolean))]
    
    if (checkinIds.length === 0) {
      return { success: true, data: identities }
    }

    const { data: checkins, error: checkinError } = await supabase
      .from('guest_checkins')
      .select(`
        *,
        properties:property_id (
          name,
          city,
          pincode,
          helpdesk_number
        )
      `)
      .in('id', checkinIds)

    if (checkinError) {
      console.error('[POLICE] Checkin fetch error:', checkinError)
      // Return identities even if checkin fetch fails
      return { success: true, data: identities }
    }

    // 3. Merge data
    const mergedData = identities.map(identity => {
      const checkin = checkins?.find(c => c.id === identity.checkin_id)
      return {
        ...identity,
        checkin_details: checkin || null
      }
    })

    return { success: true, data: mergedData }
  } catch (error) {
    console.error('[POLICE] Unexpected error:', error)
    return { error: 'An unexpected system error occurred.' }
  }
}
