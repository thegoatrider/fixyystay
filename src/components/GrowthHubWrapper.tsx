'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, Zap, BarChart3, PieChart, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GrowthHubProps {
  children: React.ReactNode
  stats: {
    totalProperties: number
    pendingProperties: number
    totalInfluencers: number
    activePromotions: number
  }
}

export default function GrowthHubWrapper({ children, stats }: GrowthHubProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mt-12 bg-gray-50/50 rounded-[3rem] border border-gray-100 p-8 shadow-inner overflow-hidden transition-all duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Growth & Marketing Hub</h2>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-0.5">Scale Fixy Stays Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-2">
            {[1, 2, 3].map(i => (
               <div key={i} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
                 {i}+
               </div>
            ))}
          </div>
          <Button 
            onClick={() => setIsOpen(!isOpen)}
            variant={isOpen ? "outline" : "default"}
            className={cn(
              "rounded-2xl px-6 h-12 font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95",
              isOpen ? "border-gray-200 text-gray-600" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
            )}
          >
            {isOpen ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
            {isOpen ? "Close Portal" : "Open Growth Center"}
          </Button>
        </div>
      </div>

      {/* Quick Metrics Bar (Always Visible) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><Zap className="w-4 h-4 text-green-600" /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Approved</p>
              <p className="text-lg font-black text-gray-900">{stats.totalProperties}</p>
            </div>
         </div>
         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg"><PieChart className="w-4 h-4 text-orange-600" /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Waiting</p>
              <p className="text-lg font-black text-gray-900">{stats.pendingProperties}</p>
            </div>
         </div>
         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg"><Users className="w-4 h-4 text-indigo-600" /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Influencers</p>
              <p className="text-lg font-black text-gray-900">{stats.totalInfluencers}</p>
            </div>
         </div>
         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><BarChart3 className="w-4 h-4 text-blue-600" /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Ads</p>
              <p className="text-lg font-black text-gray-900">{stats.activePromotions}</p>
            </div>
         </div>
      </div>

      <div className={cn(
        "grid transition-all duration-700 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100 mt-8" : "grid-rows-[0fr] opacity-0 pointer-events-none"
      )}>
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
