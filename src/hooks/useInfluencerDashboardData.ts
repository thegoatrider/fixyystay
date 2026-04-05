import { createClient } from '@/utils/supabase/client'
import { useQuery } from '@tanstack/react-query'

export type InfluencerDashboardData = {
  influencer: {
    id: string
    name: string
    email: string
    commission_rate: number
    approved: boolean
  }
  all_properties: any[]
  my_requests: any[]
  clicks: any[]
  bookings: any[]
  wallet_transactions: any[]
  payout_requests: any[]
}

export function useInfluencerDashboardData(influencerId: string | undefined, isSuperAdmin: boolean) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['influencer_dashboard_data', influencerId],
    queryFn: async () => {
      if (!influencerId && !isSuperAdmin) return null

      // Use the V2 RPC that returns ALL properties for the marketplace
      const { data, error } = await supabase.rpc('get_influencer_dashboard_data_v2', {
        p_influencer_id: influencerId,
        p_is_super_admin: isSuperAdmin,
      })

      if (error) {
        console.error('RPC Error:', error)
        throw error
      }
      return data as InfluencerDashboardData
    },
    enabled: !!influencerId || isSuperAdmin,
    staleTime: 60 * 1000, // 1 minute
  })
}
