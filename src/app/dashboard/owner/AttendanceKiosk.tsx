'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, User, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { markAttendance } from './employees-actions'

type Employee = {
  id: string
  first_name: string
  last_name: string
  role: string
  employee_attendance: any[]
}

export default function AttendanceKiosk({ 
  employees, 
  onClose 
}: { 
  employees: Employee[], 
  onClose: () => void 
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Real-time clock
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleNumpad = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num)
    }
  }

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const handleAction = async (type: 'in' | 'out') => {
    if (!selectedEmployee) return
    if (pin.length !== 4) {
      setMessage({ type: 'error', text: 'Please enter a 4-digit PIN.' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    const result = await markAttendance(selectedEmployee.id, pin, type)
    
    if (result.success) {
      setMessage({ type: 'success', text: `Successfully clocked ${type} at ${time.toLocaleTimeString()}` })
      setPin('')
      setTimeout(() => {
        setMessage(null)
        setSelectedEmployee(null)
      }, 3000)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to mark attendance.' })
    }
    setIsLoading(false)
  }

  if (selectedEmployee) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-[100] flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-300">
        <button onClick={() => { setSelectedEmployee(null); setPin(''); setMessage(null); }} className="absolute top-6 right-6 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition">
          <X className="w-8 h-8" />
        </button>

        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold">{selectedEmployee.first_name} {selectedEmployee.last_name}</h2>
          <p className="text-gray-400">{selectedEmployee.role}</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl font-bold ${pin[i] ? 'bg-white text-gray-900 border-white' : 'border-gray-600'}`}>
                {pin[i] ? '•' : ''}
              </div>
            ))}
          </div>

          {message && (
            <div className={`p-4 rounded-xl mb-6 text-center text-sm font-bold flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-8">
            {['1','2','3','4','5','6','7','8','9'].map(num => (
              <button key={num} onClick={() => handleNumpad(num)} className="h-16 bg-gray-800 rounded-2xl text-2xl font-bold hover:bg-gray-700 transition active:scale-95">
                {num}
              </button>
            ))}
            <button onClick={() => { setSelectedEmployee(null); setPin(''); setMessage(null); }} className="h-16 bg-gray-800 rounded-2xl text-sm font-bold text-gray-400 hover:bg-gray-700 transition active:scale-95">
              CANCEL
            </button>
            <button onClick={() => handleNumpad('0')} className="h-16 bg-gray-800 rounded-2xl text-2xl font-bold hover:bg-gray-700 transition active:scale-95">
              0
            </button>
            <button onClick={handleDelete} className="h-16 bg-gray-800 rounded-2xl text-sm font-bold text-red-400 hover:bg-gray-700 transition flex items-center justify-center active:scale-95">
              DEL
            </button>
          </div>

          <div className="flex gap-4">
            <Button onClick={() => handleAction('in')} disabled={isLoading || pin.length !== 4} className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700 text-white rounded-xl">
              Clock IN
            </Button>
            <Button onClick={() => handleAction('out')} disabled={isLoading || pin.length !== 4} className="flex-1 h-14 text-lg bg-red-600 hover:bg-red-700 text-white rounded-xl">
              Clock OUT
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-[100] flex flex-col p-8 overflow-y-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Clock className="w-10 h-10 text-blue-500" /> Attendance Kiosk
          </h1>
          <p className="text-gray-400 mt-2 font-medium">Select your name to mark attendance</p>
        </div>
        <div className="text-right flex items-center gap-6">
          <div className="text-5xl font-mono text-white tracking-wider">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          <Button onClick={onClose} variant="outline" className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-xl px-6 h-12">
            Exit Kiosk
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-7xl mx-auto w-full">
        {employees.map(emp => (
          <button 
            key={emp.id} 
            onClick={() => setSelectedEmployee(emp)}
            className="bg-gray-800 border border-gray-700 rounded-3xl p-6 flex flex-col items-center gap-4 hover:bg-gray-700 hover:border-blue-500 transition-all hover:scale-105 active:scale-95 group"
          >
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
              <User className="w-10 h-10 text-gray-400 group-hover:text-white" />
            </div>
            <div className="text-center">
              <div className="font-bold text-white text-lg">{emp.first_name}</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">{emp.role}</div>
            </div>
          </button>
        ))}
        {employees.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-500">
            No active employees found.
          </div>
        )}
      </div>
    </div>
  )
}
