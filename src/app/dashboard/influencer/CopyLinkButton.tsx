'use client'
import { useState } from 'react'
import { Copy, CheckCircle, Share2 } from 'lucide-react'

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Promote this property!',
          url: link,
        })
      } catch (err) {
        console.error('Sharing failed', err)
      }
    }
  }

  return (
    <div className="flex bg-gray-50 border rounded-xl overflow-hidden text-sm shadow-inner group-hover:border-blue-200 transition-all">
      <input 
        type="text" 
        value={link} 
        readOnly 
        className="px-4 py-2.5 w-full bg-transparent outline-none text-gray-500 font-medium"
      />
      <div className="flex border-l">
        <button 
          onClick={handleCopy}
          className="px-4 py-2.5 bg-white hover:bg-gray-100 flex items-center gap-2 font-bold transition-all border-r"
          title="Copy referral link"
        >
          {copied ? (
            <><CheckCircle className="w-4 h-4 text-green-600" /> Copied</>
          ) : (
            <><Copy className="w-4 h-4" /> Copy</>
          )}
        </button>
        {typeof navigator !== 'undefined' && (navigator as any).share && (
          <button 
            onClick={handleShare}
            className="px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center gap-2 font-bold transition-all"
            title="Share with friends"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        )}
      </div>
    </div>
  )
}
