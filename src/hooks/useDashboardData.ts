import { createClient } from '@/utils/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { getOwnerDashboardDataDirect } from '@/app/dashboard/owner/actions'

export type DashboardData = {
  properties: any[]
  leads: any[]
  checkins: any[]
  influencer_requests: any[]
  wallet_transactions: any[]
  payout_requests: any[]
  property_rooms?: any[]
  subscription: {
    plan_name: string
    end_date: string
    status: string
    is_active: boolean
  }
  owner?: {
    id: string
    free_tier_enabled: boolean
    created_at: string
  }
}

export function useDashboardData(
  ownerId: string | undefined, 
  isSuperAdmin: boolean,
  initialData?: Partial<DashboardData> | null
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['dashboard_data', ownerId],
    queryFn: async () => {
      if (!ownerId && !isSuperAdmin) return null

      // 1. Attempt fast consolidated RPC execution
      try {
        const { data, error } = await supabase.rpc('get_owner_dashboard_data', {
          p_owner_id: ownerId,
          p_is_superadmin: isSuperAdmin,
        })

        if (!error && data) {
          return data as DashboardData
        }
        console.warn('[useDashboardData] RPC call failed, engaging direct server action fallback:', error?.message)
      } catch (rpcErr: any) {
        console.warn('[useDashboardData] RPC call threw exception, engaging direct server action fallback:', rpcErr?.message)
      }

      // 2. Resilient fallback: direct server action query with service-role admin client
      const fallbackResult = await getOwnerDashboardDataDirect(ownerId, isSuperAdmin)
      if (fallbackResult.success && fallbackResult.data) {
        return fallbackResult.data as DashboardData
      }

      throw new Error(fallbackResult.error || 'Failed to load dashboard data')
    },
    enabled: !!ownerId || isSuperAdmin,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes cache retention
    refetchOnWindowFocus: false, // Prevent wasteful refetches on mobile app focus/resume
    initialData: initialData ? (initialData as DashboardData) : undefined,
  })
}
