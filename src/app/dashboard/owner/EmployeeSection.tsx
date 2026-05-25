'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CollapsibleTile } from '@/components/CollapsibleTile'
import { UserPlus, Users, Clock, LogOut, CheckCircle, Trash2, Smartphone, MapPin, Building, Activity, Clock4 } from 'lucide-react'
import { addEmployee, fireEmployee, getEmployeesByOwner } from './employees-actions'
import AttendanceKiosk from './AttendanceKiosk'

export default function EmployeeSection({ 
  ownerId, 
  properties 
}: { 
  ownerId: string
  properties: any[] 
}) {
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showKiosk, setShowKiosk] = useState(false)

  // Form states
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [role, setRole] = useState('')
  const [attendancePin, setAttendancePin] = useState('')

  const fetchEmployees = async () => {
    setIsLoading(true)
    const data = await getEmployeesByOwner(ownerId)
    setEmployees(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchEmployees()
  }, [ownerId])

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('propertyId', propertyId)
    formData.append('firstName', firstName)
    formData.append('lastName', lastName)
    formData.append('mobileNumber', mobileNumber)
    formData.append('permanentAddress', permanentAddress)
    formData.append('propertyAddress', propertyAddress)
    formData.append('role', role)
    formData.append('attendancePin', attendancePin)

    const result = await addEmployee(formData)

    if (result.success) {
      alert('Employee added successfully!')
      // Reset form
      setFirstName('')
      setLastName('')
      setMobileNumber('')
      setPermanentAddress('')
      setPropertyAddress('')
      setRole('')
      setAttendancePin('')
      fetchEmployees()
    } else {
      alert(`Error: ${result.error}`)
    }
    setIsSubmitting(false)
  }

  const handleFireEmployee = async (employeeId: string, name: string) => {
    if (confirm(`Are you sure you want to fire ${name}? They will no longer be able to mark attendance.`)) {
      const result = await fireEmployee(employeeId)
      if (result.success) {
        fetchEmployees()
      } else {
        alert('Failed to fire employee.')
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      
      {/* Kiosk Mode Overlay */}
      {showKiosk && (
        <AttendanceKiosk 
          employees={employees} 
          onClose={() => {
            setShowKiosk(false)
            fetchEmployees() // Refresh data after kiosk closes
          }} 
        />
      )}

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Manage Staff
          </h2>
          <p className="text-sm text-gray-500">Track attendance and manage your property employees.</p>
        </div>
        <Button 
          onClick={() => setShowKiosk(true)}
          className="w-full md:w-auto h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-bold px-8 flex items-center gap-2"
        >
          <Clock className="w-5 h-5" /> Open Attendance Kiosk
        </Button>
      </div>

      {/* Add Employee Form */}
      <CollapsibleTile 
        title="Add New Employee" 
        icon={UserPlus}
        defaultOpen={false}
      >
        <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          <div className="space-y-2">
            <Label>Property</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
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
            <Label>Mobile Number</Label>
            <Input required type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="9876543210" />
          </div>

          <div className="space-y-2">
            <Label>4-Digit Attendance PIN</Label>
            <Input 
              required 
              type="password" 
              maxLength={4}
              pattern="\d{4}"
              title="Must be exactly 4 digits"
              value={attendancePin} 
              onChange={e => setAttendancePin(e.target.value)} 
              placeholder="1234" 
              className="font-mono tracking-[0.5em] text-lg"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Permanent Address</Label>
            <Input required value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Address in Property (Optional)</Label>
            <Input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} placeholder="e.g. Staff Quarters Room 2" />
          </div>

          <div className="md:col-span-2 mt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700">
              {isSubmitting ? 'Adding Employee...' : 'Register Employee'}
            </Button>
          </div>
        </form>
      </CollapsibleTile>

      {/* Employee Roster */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Active Roster
          </h3>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No active employees. Add one above.</div>
        ) : (
          <div className="divide-y">
            {employees.map(emp => {
              // Calculate today's status
              const today = new Date().toISOString().split('T')[0]
              const todayRecord = emp.employee_attendance?.find((a: any) => a.date === today)
              let statusText = 'Not Clocked In'
              let statusColor = 'text-gray-500 bg-gray-100'
              
              if (todayRecord?.time_in && !todayRecord?.time_out) {
                statusText = `Clocked IN at ${new Date(todayRecord.time_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                statusColor = 'text-green-700 bg-green-100'
              } else if (todayRecord?.time_in && todayRecord?.time_out) {
                statusText = 'Shift Completed'
                statusColor = 'text-blue-700 bg-blue-100'
              }

              return (
                <div key={emp.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-gray-50/50 transition">
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {emp.first_name} {emp.last_name}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${statusColor}`}>
                          {statusText}
                        </span>
                      </h4>
                      <p className="text-sm text-gray-500 font-medium">{emp.role} • {emp.properties?.name}</p>
                      
                      <div className="flex flex-wrap gap-4 mt-3">
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Smartphone className="w-3.5 h-3.5"/> {emp.mobile_number}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {emp.permanent_address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <Button variant="outline" className="flex-1 lg:flex-none border-gray-200 hover:bg-blue-50 hover:text-blue-600" onClick={() => alert('Detailed history view coming soon!')}>
                      <Clock4 className="w-4 h-4 mr-2" /> History
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 lg:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      onClick={() => handleFireEmployee(emp.id, `${emp.first_name} ${emp.last_name}`)}
                    >
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
