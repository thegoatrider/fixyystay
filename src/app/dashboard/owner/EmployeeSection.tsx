'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CollapsibleTile } from '@/components/CollapsibleTile'
import {
  UserPlus, Users, Clock, CheckCircle, Trash2, Smartphone,
  MapPin, Activity, Clock4, User, Phone, Shield, HeartHandshake,
  Calendar, ExternalLink, XCircle
} from 'lucide-react'
import { addEmployee, fireEmployee, getEmployeesByOwner } from './employees-actions'
import AttendanceKiosk from './AttendanceKiosk'
import { EmployeeIdUpload, type EmployeeIdData } from './EmployeeIdUpload'
import { cn } from '@/lib/utils'

export default function EmployeeSection({
  ownerId,
  properties
}: {
  ownerId: string
  properties: any[]
}) {
  const [employees, setEmployees]     = useState<any[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showKiosk, setShowKiosk]     = useState(false)
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [propertyId,        setPropertyId]        = useState(properties[0]?.id || '')
  const [firstName,         setFirstName]          = useState('')
  const [lastName,          setLastName]           = useState('')
  const [mobileNumber,      setMobileNumber]       = useState('')
  const [permanentAddress,  setPermanentAddress]   = useState('')
  const [propertyAddress,   setPropertyAddress]    = useState('')
  const [role,              setRole]               = useState('')
  const [attendancePin,     setAttendancePin]      = useState('')
  const [dateOfBirth,       setDateOfBirth]        = useState('')
  const [guardianName,      setGuardianName]       = useState('')
  const [guardianPhone,     setGuardianPhone]      = useState('')

  // ID verification
  const [idData, setIdData] = useState<EmployeeIdData | null>(null)

  const fetchEmployees = async () => {
    setIsLoading(true)
    const data = await getEmployeesByOwner(ownerId)
    setEmployees(data)
    setIsLoading(false)
  }

  useEffect(() => { fetchEmployees() }, [ownerId])

  const resetForm = () => {
    setFirstName(''); setLastName(''); setMobileNumber(''); setPermanentAddress('')
    setPropertyAddress(''); setRole(''); setAttendancePin(''); setDateOfBirth('')
    setGuardianName(''); setGuardianPhone(''); setIdData(null)
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idData) { alert('Please upload and verify the employee\'s government ID before registering.'); return }
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('propertyId',       propertyId)
    formData.append('firstName',        firstName)
    formData.append('lastName',         lastName)
    formData.append('mobileNumber',     mobileNumber)
    formData.append('permanentAddress', permanentAddress)
    formData.append('propertyAddress',  propertyAddress)
    formData.append('role',             role)
    formData.append('attendancePin',    attendancePin)
    formData.append('dateOfBirth',      dateOfBirth)
    formData.append('guardianName',     guardianName)
    formData.append('guardianPhone',    guardianPhone)
    formData.append('idData',           JSON.stringify(idData))

    const result = await addEmployee(formData)

    if (result.success) {
      alert('Employee registered successfully!')
      resetForm()
      fetchEmployees()
    } else {
      alert(`Error: ${result.error}`)
    }
    setIsSubmitting(false)
  }

  const handleFireEmployee = async (employeeId: string, name: string) => {
    if (confirm(`Are you sure you want to fire ${name}?`)) {
      const result = await fireEmployee(employeeId)
      if (result.success) fetchEmployees()
      else alert('Failed to fire employee.')
    }
  }

  const fullName = `${firstName} ${lastName}`.trim()

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">

      {/* Kiosk Mode */}
      {showKiosk && (
        <AttendanceKiosk employees={employees} onClose={() => { setShowKiosk(false); fetchEmployees() }} />
      )}

      {/* Employee ID document viewer modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  {viewingEmployee.first_name} {viewingEmployee.last_name} — ID Documents
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {viewingEmployee.govt_doc_type || 'Government ID'} 
                  {viewingEmployee.govt_doc_number ? ` · ${viewingEmployee.govt_doc_number}` : ''}
                  {viewingEmployee.govt_doc_name ? ` · ${viewingEmployee.govt_doc_name}` : ''}
                </p>
              </div>
              <button onClick={() => setViewingEmployee(null)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {/* Match badges */}
              {(viewingEmployee.name_match_status || viewingEmployee.dob_match_status) && (
                <div className="flex gap-3 flex-wrap">
                  {viewingEmployee.name_match_status && (
                    <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full', 
                      viewingEmployee.name_match_status === 'MATCHED'  ? 'bg-green-100 text-green-800' :
                      viewingEmployee.name_match_status === 'MISMATCH' ? 'bg-red-100 text-red-800' :
                                                                          'bg-gray-100 text-gray-600')}>
                      Name: {viewingEmployee.name_match_status}
                    </span>
                  )}
                  {viewingEmployee.dob_match_status && (
                    <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full',
                      viewingEmployee.dob_match_status === 'MATCHED'  ? 'bg-green-100 text-green-800' :
                      viewingEmployee.dob_match_status === 'MISMATCH' ? 'bg-amber-100 text-amber-800' :
                                                                         'bg-gray-100 text-gray-600')}>
                      DOB: {viewingEmployee.dob_match_status}
                    </span>
                  )}
                  {viewingEmployee.govt_doc_verified && (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> ID Verified
                    </span>
                  )}
                </div>
              )}

              {/* Front + Back images */}
              <div className="grid grid-cols-2 gap-4">
                {viewingEmployee.govt_doc_front_url ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">▣ Front Side</p>
                    <div className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-100">
                      <Image src={viewingEmployee.govt_doc_front_url} alt="Front ID" fill sizes="(max-width: 768px) 50vw, 250px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      <a href={viewingEmployee.govt_doc_front_url} target="_blank" rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                        <ExternalLink className="w-4 h-4" /> Open
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">▣ Front Side</p>
                    <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs font-bold">Not uploaded</div>
                  </div>
                )}
                {viewingEmployee.govt_doc_back_url ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">◫ Back Side</p>
                    <div className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-100">
                      <Image src={viewingEmployee.govt_doc_back_url} alt="Back ID" fill sizes="(max-width: 768px) 50vw, 250px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      <a href={viewingEmployee.govt_doc_back_url} target="_blank" rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                        <ExternalLink className="w-4 h-4" /> Open
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">◫ Back Side</p>
                    <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs font-bold">Not uploaded</div>
                  </div>
                )}
              </div>

              {/* OCR extracted info */}
              {viewingEmployee.govt_doc_name && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5 border border-gray-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">OCR Extracted Data</p>
                  <p><span className="text-gray-500">Name on ID:</span> <span className="font-bold">{viewingEmployee.govt_doc_name}</span></p>
                  {viewingEmployee.govt_doc_dob && <p><span className="text-gray-500">DOB on ID:</span> <span className="font-bold">{viewingEmployee.govt_doc_dob}</span></p>}
                  <p><span className="text-gray-500">Doc Type:</span> <span className="font-bold">{viewingEmployee.govt_doc_type}</span></p>
                  <p><span className="text-gray-500">Doc Number:</span> <span className="font-mono font-bold">{viewingEmployee.govt_doc_number || '—'}</span></p>
                  <p><span className="text-gray-500">Confidence:</span> <span className="font-bold">{Math.round((viewingEmployee.govt_doc_confidence || 0) * 100)}%</span></p>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end">
              <Button onClick={() => setViewingEmployee(null)} className="bg-gray-900 hover:bg-black text-white px-6 rounded-xl">Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Manage Staff
          </h2>
          <p className="text-sm text-gray-500">Track attendance and manage your property employees.</p>
        </div>
        <Button onClick={() => setShowKiosk(true)} className="w-full md:w-auto h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-bold px-8 flex items-center gap-2">
          <Clock className="w-5 h-5" /> Open Attendance Kiosk
        </Button>
      </div>

      {/* ── Add Employee Form ─────────────────────────────────────────────────── */}
      <CollapsibleTile title="Add New Employee" icon={UserPlus} defaultOpen={false}>
        <form onSubmit={handleAddEmployee} className="flex flex-col gap-6 p-4">

          {/* ── Section: Basic Info ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1">
              <User className="w-3 h-3" /> Basic Information
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property</Label>
                <select className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={propertyId} onChange={e => setPropertyId(e.target.value)} required>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Role (e.g. Receptionist, Housekeeping)</Label>
                <Input required value={role} onChange={e => setRole(e.target.value)} placeholder="Housekeeping" />
              </div>
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input required value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input required value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Mobile Number</Label>
                <Input required type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="9876543210" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date of Birth</Label>
                <Input required type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>4-Digit Attendance PIN</Label>
                <Input required type="password" maxLength={4} pattern="\d{4}" title="Must be exactly 4 digits"
                  value={attendancePin} onChange={e => setAttendancePin(e.target.value)} placeholder="1234"
                  className="font-mono tracking-[0.5em] text-lg" />
              </div>
            </div>
          </div>

          {/* ── Section: Addresses ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Addresses
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Permanent Home Address</Label>
                <Input required value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)} placeholder="Full permanent address including city, state, PIN" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address at Property <span className="text-[10px] text-gray-400 font-normal">(Optional)</span></Label>
                <Input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} placeholder="e.g. Staff Quarters Room 2" />
              </div>
            </div>
          </div>

          {/* ── Section: Guardian / Reference ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1">
              <HeartHandshake className="w-3 h-3" /> Guardian / Emergency Reference
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guardian / Reference Name</Label>
                <Input required value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Parent, spouse, or close relative name" />
              </div>
              <div className="space-y-2">
                <Label>Guardian / Reference Phone</Label>
                <Input required type="tel" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} placeholder="9876543210" />
              </div>
            </div>
          </div>

          {/* ── Section: Government ID ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Government ID Verification
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Upload the front and back of a government ID (Aadhaar, PAN, Passport, Driving License, Voter ID).
              The AI will extract and verify the name and date of birth against what you&apos;ve entered above.
            </p>
            <EmployeeIdUpload
              enteredName={fullName}
              enteredDob={dateOfBirth}
              onComplete={(data) => setIdData(data)}
              onReset={() => setIdData(null)}
            />
            {!idData && (
              <p className="text-[10px] text-amber-600 font-medium mt-2 flex items-center gap-1">
                ⚠ ID verification is required before you can register the employee.
              </p>
            )}
            {idData && (
              <p className="text-[10px] text-green-700 font-bold mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> ID captured — ready to register.
              </p>
            )}
          </div>

          <div className="mt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !idData}
              className={cn('w-full h-12 font-bold text-base', idData ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed')}
            >
              {isSubmitting ? 'Registering Employee...' : 'Register Employee'}
            </Button>
          </div>
        </form>
      </CollapsibleTile>

      {/* ── Employee Roster ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Active Roster
          </h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{employees.length} employees</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No active employees. Add one above.</div>
        ) : (
          <div className="divide-y">
            {employees.map(emp => {
              const today = new Date().toISOString().split('T')[0]
              const todayRecord = emp.employee_attendance?.find((a: any) => a.date === today)
              let statusText  = 'Not Clocked In'
              let statusColor = 'text-gray-500 bg-gray-100'
              if (todayRecord?.time_in && !todayRecord?.time_out) {
                statusText  = `Clocked IN at ${new Date(todayRecord.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                statusColor = 'text-green-700 bg-green-100'
              } else if (todayRecord?.time_in && todayRecord?.time_out) {
                statusText  = 'Shift Completed'
                statusColor = 'text-blue-700 bg-blue-100'
              }

              return (
                <div key={emp.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-gray-50/50 transition">
                  <div className="flex gap-4 items-start flex-1 min-w-0">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 text-lg flex flex-wrap items-center gap-2">
                        {emp.first_name} {emp.last_name}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${statusColor}`}>
                          {statusText}
                        </span>
                        {emp.govt_doc_verified && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> ID Verified
                          </span>
                        )}
                        {emp.name_match_status === 'MISMATCH' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-red-100 text-red-700">
                            Name Mismatch
                          </span>
                        )}
                        {emp.police_verification_status === 'APPROVED' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-green-100 text-green-700 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Police Approved
                          </span>
                        )}
                        {emp.police_verification_status === 'REJECTED' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-red-100 text-red-700 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Police Rejected
                          </span>
                        )}
                        {(!emp.police_verification_status || emp.police_verification_status === 'PENDING') && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                            Pending Police Approval
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500 font-medium">{emp.role} · {emp.properties?.name}</p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" /> {emp.mobile_number}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {emp.permanent_address || '—'}
                        </span>
                        {emp.date_of_birth && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {emp.date_of_birth}
                          </span>
                        )}
                        {emp.guardian_name && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <HeartHandshake className="w-3.5 h-3.5" />
                            {emp.guardian_name}
                            {emp.guardian_phone ? ` · ${emp.guardian_phone}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full lg:w-auto flex-shrink-0">
                    {emp.govt_doc_front_url && (
                      <Button variant="outline"
                        className="flex-1 lg:flex-none border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => setViewingEmployee(emp)}>
                        <Shield className="w-4 h-4 mr-2" /> View ID
                      </Button>
                    )}
                    <Button variant="outline" className="flex-1 lg:flex-none border-gray-200 hover:bg-blue-50 hover:text-blue-600"
                      onClick={() => alert('Detailed history view coming soon!')}>
                      <Clock4 className="w-4 h-4 mr-2" /> History
                    </Button>
                    <Button variant="outline"
                      className="flex-1 lg:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      onClick={() => handleFireEmployee(emp.id, `${emp.first_name} ${emp.last_name}`)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Fire
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
