'use client'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'

export function CollapsibleTile({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  badgeCount = 0
}: { 
  title: string, 
  icon: any, 
  children: React.ReactNode, 
  defaultOpen?: boolean,
  badgeCount?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  
  return (
    <div className={`bg-white border rounded-lg shadow-sm overflow-hidden transition-all ${open ? 'ring-2 ring-blue-500/20' : ''}`}>
      <button 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${open ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-bold text-gray-900 text-sm md:text-base">{title}</span>
          {badgeCount > 0 && !open && (
            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {badgeCount} New
            </span>
          )}
        </div>
        <div className={`p-1 rounded-full transition-colors ${open ? 'bg-gray-100' : ''}`}>
          {open ? <X className="w-5 h-5 text-gray-500" /> : <Plus className="w-5 h-5 text-blue-600" />}
        </div>
      </button>
      
      <div className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[2000px] opacity-100 border-t' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-4 md:p-6 bg-gray-50/50">
          {children}
        </div>
      </div>
    </div>
  )
}
