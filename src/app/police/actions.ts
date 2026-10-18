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
    const cleanQuery = query.trim()

    // 1. Concurrently search guest_identity and guest_checkins
    const [identitiesRes, directCheckinsRes] = await Promise.all([
      supabase
        .from('guest_identity')
        .select('id, full_name, document_type, document_number, date_of_birth, address, document_image_url, checkin_id, created_at')
        .or(`document_number.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%,address.ilike.%${cleanQuery}%`)
        .limit(50),
      supabase
        .from('guest_checkins')
        .select(`
          id,
          guest_name,
          guest_phone,
          checkin_date,
          checkout_date,
          num_people,
          room_number,
          vehicle_number,
          uid,
          properties:property_id (
            name,
            city,
            pincode,
            helpdesk_number
          ),
          identities:guest_identity(*)
        `)
        .or(`guest_name.ilike.%${cleanQuery}%,guest_phone.ilike.%${cleanQuery}%,vehicle_number.ilike.%${cleanQuery}%,uid.ilike.%${cleanQuery}%`)
        .limit(50)
    ])

    const matchedIdentities = identitiesRes.data || []
    const directCheckins = directCheckinsRes.data || []

    // 2. Fetch any missing checkins referenced by matched identities
    const existingCheckinIds = new Set(directCheckins.map(c => c.id))
    const missingCheckinIds = [
      ...new Set(
        matchedIdentities
          .map(i => i.checkin_id)
          .filter(id => id && !existingCheckinIds.has(id))
      )
    ]

    let additionalCheckins: any[] = []
    if (missingCheckinIds.length > 0) {
      const { data: fetched } = await supabase
        .from('guest_checkins')
        .select(`
          id,
          guest_name,
          guest_phone,
          checkin_date,
          checkout_date,
          num_people,
          room_number,
          vehicle_number,
          uid,
          properties:property_id (
            name,
            city,
            pincode,
            helpdesk_number
          ),
          identities:guest_identity(*)
        `)
        .in('id', missingCheckinIds)

      additionalCheckins = fetched || []
    }

    const allCheckins = [...directCheckins, ...additionalCheckins]

    // 3. Format result: if we have full check-in records, return them with all accompanying guests
    if (allCheckins.length > 0) {
      const formatted = allCheckins.map(checkin => {
        // Collect all accompanying guests
        const accompanying = (checkin.identities || []).filter(
          (doc: any) => (doc.full_name || '').toLowerCase().trim() !== (checkin.guest_name || '').toLowerCase().trim()
        )
        const primaryDoc = (checkin.identities || []).find(
          (doc: any) => (doc.full_name || '').toLowerCase().trim() === (checkin.guest_name || '').toLowerCase().trim()
        ) || (checkin.identities || [])[0]

        return {
          id: primaryDoc?.id || checkin.id,
          full_name: checkin.guest_name,
          document_number: primaryDoc?.document_number || '—',
          document_type: primaryDoc?.document_type || 'ID',
          address: primaryDoc?.address || null,
          document_image_url: primaryDoc?.document_image_url || null,
          created_at: checkin.created_at,
          checkin_id: checkin.id,
          checkin_details: checkin,
          accompanying_guests: accompanying,
          all_identities: checkin.identities || []
        }
      })

      return { success: true, data: formatted }
    }

    // Fallback: return standalone matched identities if no checkin was linked
    return { success: true, data: matchedIdentities }
  } catch (error) {
    console.error('[POLICE] Unexpected error:', error)
    return { error: 'An unexpected system error occurred.' }
  }
}
