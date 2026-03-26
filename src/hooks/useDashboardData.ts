import { createClient } from '@/utils/supabase/client'
import { useQuery } from '@tanstack/react-query'

export type DashboardData = {
  properties: any[]
  leads: any[]
  checkins: any[]
  wallet: {
    transactions: any[]
    payouts: any[]
  }
}

export function useDashboardData(ownerId: string | undefined, isSuperAdmin: boolean) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['dashboard_data', ownerId],
    queryFn: async () => {
      if (!ownerId && !isSuperAdmin) return null

      const { data, error } = await supabase.rpc('get_owner_dashboard_data', {
        p_owner_id: ownerId,
        p_is_superadmin: isSuperAdmin,
      })

      if (error) throw error
      return data as DashboardData
    },
    enabled: !!ownerId || isSuperAdmin,
    staleTime: 60 * 1000, // 1 minute
  })
}
