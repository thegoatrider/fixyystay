'use client'
import { useState } from 'react'
import { Copy, CheckCircle } from 'lucide-react'

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex bg-gray-50 border rounded-md overflow-hidden text-sm">
      <input 
        type="text" 
        value={link} 
        readOnly 
        className="px-3 py-2 w-full bg-transparent outline-none text-gray-600"
      />
      <button 
        onClick={handleCopy}
        className="px-4 py-2 border-l bg-white hover:bg-gray-100 flex items-center gap-2 font-medium transition"
        title="Copy referral link"
      >
        {copied ? (
          <><CheckCircle className="w-4 h-4 text-green-600" /> Copied</>
        ) : (
          <><Copy className="w-4 h-4" /> Copy</>
        )}
      </button>
    </div>
  )
}
