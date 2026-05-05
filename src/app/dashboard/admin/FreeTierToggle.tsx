'use client'
import { useState } from 'react'
import { Zap, ZapOff, Loader2 } from 'lucide-react'
import { toggleFreeTier } from './actions'
import { cn } from '@/lib/utils'

export default function FreeTierToggle({ 
  ownerId, 
  isEnabled 
}: { 
  ownerId: string
  isEnabled: boolean 
}) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (!confirm(`Are you sure you want to ${isEnabled ? 'disable' : 'enable'} Free Tier for this owner?`)) return
    
    setLoading(true)
    const res = await toggleFreeTier(ownerId, isEnabled)
    if (res.error) alert(res.error)
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border",
        isEnabled 
          ? "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100" 
          : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
      )}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isEnabled ? (
        <Zap className="w-3 h-3 fill-current" />
      ) : (
        <ZapOff className="w-3 h-3" />
      )}
      {isEnabled ? 'Free Tier: ON' : 'Free Tier: OFF'}
    </button>
  )
}
