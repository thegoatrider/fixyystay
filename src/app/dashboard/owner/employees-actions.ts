'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function addEmployee(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { error: 'Unauthorized' }

    const { data: owner } = await supabase
      .from('owners')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
    if (!owner) return { error: 'Owner profile not found' }

    const propertyId      = formData.get('propertyId')      as string
    const firstName       = formData.get('firstName')        as string
    const lastName        = formData.get('lastName')         as string
    const mobileNumber    = formData.get('mobileNumber')     as string
    const permanentAddress= formData.get('permanentAddress') as string
    const propertyAddress = formData.get('propertyAddress')  as string
    const role            = formData.get('role')             as string
    const attendancePin   = formData.get('attendancePin')    as string
    const dateOfBirth     = formData.get('dateOfBirth')      as string
    const guardianName    = formData.get('guardianName')     as string
    const guardianPhone   = formData.get('guardianPhone')    as string

    // ID verification data (JSON-encoded from client)
    const idDataRaw = formData.get('idData') as string | null
    let idData: any = null
    if (idDataRaw) {
      try { idData = JSON.parse(idDataRaw) } catch { idData = null }
    }

    if (!attendancePin || attendancePin.length !== 4) {
      return { error: 'A 4-digit attendance PIN is required.' }
    }

    const newEmployee: any = {
      property_id:       propertyId,
      owner_id:          owner.id,
      first_name:        firstName,
      last_name:         lastName,
      mobile_number:     mobileNumber,
      permanent_address: permanentAddress,
      property_address:  propertyAddress,
      role,
      attendance_pin:    attendancePin,
      status:            'active',
      date_of_birth:     dateOfBirth     || null,
      guardian_name:     guardianName    || null,
      guardian_phone:    guardianPhone   || null,
    }

    // Attach OCR / ID data if provided
    if (idData) {
      newEmployee.govt_doc_type        = idData.extracted?.document_type   || null
      newEmployee.govt_doc_number      = idData.extracted?.document_number || null
      newEmployee.govt_doc_name        = idData.extracted?.full_name       || null
      newEmployee.govt_doc_dob         = idData.extracted?.date_of_birth   || null
      newEmployee.govt_doc_front_url   = idData.frontUrl                   || null
      newEmployee.govt_doc_back_url    = idData.backUrl                    || null
      newEmployee.govt_doc_confidence  = idData.extracted?.confidence      || null
      newEmployee.govt_doc_verified    = idData.status === 'VERIFIED'
      newEmployee.govt_doc_ocr_json    = idData.extracted?.ocr_json        || null
      newEmployee.name_match_status    = idData.nameMatchStatus            || 'UNVERIFIED'
      newEmployee.dob_match_status     = idData.dobMatchStatus             || 'UNVERIFIED'
      // Keep old field for backward compatibility
      newEmployee.govt_verification_id = idData.frontUrl || null
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('property_employees')
      .insert([newEmployee])

    if (error) {
      console.error('Error adding employee:', error)
      return { error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Catch-all add employee error:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

export async function fireEmployee(employeeId: string) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { error: 'Unauthorized' }

    const { data: owner } = await supabase.from('owners').select('id').eq('user_id', session.user.id).single()
    if (!owner) return { error: 'Owner profile not found' }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('property_employees')
      .update({ status: 'fired' })
      .eq('id', employeeId)
      .eq('owner_id', owner.id)

    if (error) return { error: error.message }
    return { success: true }
  } catch (error: any) {
    return { error: 'An unexpected error occurred.' }
  }
}

export async function getEmployeesByOwner(ownerId: string) {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('property_employees')
    .select(`
      *,
      properties (name),
      employee_attendance (id, date, time_in, time_out)
    `)
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) { console.error('Error fetching employees:', error); return [] }
  return data
}

export async function markAttendance(employeeId: string, pin: string, type: 'in' | 'out') {
  try {
    const supabaseAdmin = createAdminClient()

    const { data: employee, error: empError } = await supabaseAdmin
      .from('property_employees')
      .select('id, attendance_pin, owner_id')
      .eq('id', employeeId)
      .single()

    if (empError || !employee) return { error: 'Employee not found.' }
    if (employee.attendance_pin !== pin) return { error: 'Incorrect PIN.' }

    const today = new Date().toISOString().split('T')[0]

    const { data: existingRecord } = await supabaseAdmin
      .from('employee_attendance')
      .select('id, time_in, time_out')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single()

    if (type === 'in') {
      if (existingRecord?.time_in) return { error: 'Already clocked in today.' }
      if (existingRecord) {
        await supabaseAdmin.from('employee_attendance').update({ time_in: new Date().toISOString() }).eq('id', existingRecord.id)
      } else {
        await supabaseAdmin.from('employee_attendance').insert([{
          employee_id: employeeId, owner_id: employee.owner_id,
          date: today, time_in: new Date().toISOString()
        }])
      }
    } else {
      if (!existingRecord?.time_in) return { error: 'You must clock in first.' }
      if (existingRecord.time_out)  return { error: 'Already clocked out today.' }
      await supabaseAdmin.from('employee_attendance').update({ time_out: new Date().toISOString() }).eq('id', existingRecord.id)
    }

    return { success: true }
  } catch (error: any) {
    return { error: 'System error. Please try again.' }
  }
}
