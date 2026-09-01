'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, RefreshCw } from 'lucide-react'

export function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const isPulling = useRef(false)
  const threshold = 120 // Distance to trigger refresh
  const router = useRouter()

  const pullDistanceRef = useRef(0)
  const isRefreshingRef = useRef(false)

  useEffect(() => {
    isRefreshingRef.current = isRefreshing
  }, [isRefreshing])

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only start pulling if we are at the top of the page
      if (window.scrollY === 0) {
        startY.current = e.touches[0].pageY
        isPulling.current = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshingRef.current) return

      const currentY = e.touches[0].pageY
      const diff = currentY - startY.current

      if (diff > 0 && window.scrollY === 0) {
        // Apply resistance
        const distance = Math.min(diff * 0.4, threshold + 20)
        pullDistanceRef.current = distance
        setPullDistance(distance)
      } else {
        pullDistanceRef.current = 0
        setPullDistance(0)
      }
    }

    const handleTouchEnd = () => {
      if (!isPulling.current) return
      isPulling.current = false

      if (pullDistanceRef.current >= threshold && !isRefreshingRef.current) {
        handleRefresh()
      } else {
        pullDistanceRef.current = 0
        setPullDistance(0)
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setPullDistance(threshold)
    
    // Simulate refresh or actual reload
    // In a Capacitor app, a full reload is often preferred to ensure everything is fresh
    setTimeout(() => {
      window.location.reload()
    }, 800)
  }

  // Calculate rotation and scale based on pull distance
  const progress = Math.min(pullDistance / threshold, 1)
  const rotation = progress * 360
  const scale = progress

  if (pullDistance === 0 && !isRefreshing) return null

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none transition-all duration-150"
      style={{ 
        transform: `translateY(${pullDistance - 50}px)`,
        opacity: progress
      }}
    >
      <div className="bg-white rounded-full shadow-xl border border-blue-50 p-2 flex items-center justify-center w-10 h-10">
        <RefreshCw 
          className={`w-5 h-5 text-blue-600 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: !isRefreshing ? `rotate(${rotation}deg) scale(${scale})` : undefined }}
        />
      </div>
    </div>
  )
}
