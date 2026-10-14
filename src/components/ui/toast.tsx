'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
  }
}

const ToastContext = createContext<ToastContextType | null>(null)

// Singleton event emitter for calling toast outside React tree
type ToastListener = (msg: ToastMessage) => void
const listeners = new Set<ToastListener>()

export const toast = {
  success: (message: string) => {
    listeners.forEach((fn) => fn({ id: Math.random().toString(36).slice(2), message, type: 'success' }))
  },
  error: (message: string) => {
    listeners.forEach((fn) => fn({ id: Math.random().toString(36).slice(2), message, type: 'error' }))
  },
  info: (message: string) => {
    listeners.forEach((fn) => fn({ id: Math.random().toString(36).slice(2), message, type: 'info' }))
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (toastItem: ToastMessage) => {
      setToasts((prev) => [...prev.slice(-3), toastItem]) // Max 4 toasts visible
      setTimeout(() => {
        removeToast(toastItem.id)
      }, 4000)
    },
    [removeToast]
  )

  React.useEffect(() => {
    listeners.add(addToast)
    return () => {
      listeners.delete(addToast)
    }
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast viewport container */}
      <div 
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold transition-all duration-300 animate-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-white border-green-200 text-green-900 shadow-green-100/50'
                : t.type === 'error'
                ? 'bg-white border-red-200 text-red-900 shadow-red-100/50'
                : 'bg-white border-blue-200 text-blue-900 shadow-blue-100/50'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />}
              <span className="truncate">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
