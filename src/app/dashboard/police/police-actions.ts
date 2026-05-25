'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export async function updateEmployeePoliceStatus(employeeId: string, status: 'APPROVED' | 'REJECTED') {
  try {
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('property_employees')
      .update({ police_verification_status: status })
      .eq('id', employeeId)

    if (error) {
      console.error('Error updating employee police status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: 'An unexpected error occurred.' }
  }
}
