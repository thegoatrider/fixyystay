'use client'

import { useState } from 'react'
import NextImage from 'next/image'
import { Camera, Image as ImageIcon, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { uploadAndVerifyDocument } from './verify-action'

type DocumentUploadProps = {
  label: string
  idKey: string
  onVerified: (identityId: string) => void
}

const compressAndEnhanceImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_compressed.jpg", {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/jpeg', 0.80);
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export function DocumentUpload({ label, idKey, onVerified }: DocumentUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'EXTRACTING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW'>('IDLE')
  const [reason, setReason] = useState<string>('')
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0]
    if (!originalFile) return

    setStatus('UPLOADING')
    setReason('')

    try {
      const file = await compressAndEnhanceImage(originalFile)
      const url = URL.createObjectURL(file)
      setPreview(url)
      
      const formData = new FormData()
      formData.append('image', file)

      setStatus('PROCESSING')
      // Simulate granular states for better UX
      setTimeout(() => { if (status !== 'VERIFIED' && status !== 'FAILED') setStatus('EXTRACTING') }, 1500)
      
      const result = await uploadAndVerifyDocument(formData)

      if (result.success && result.guest_identity_id) {
        if (result.status === 'VERIFIED') {
          setStatus('VERIFIED')
          onVerified(result.guest_identity_id)
        } else if (result.status === 'MANUAL_REVIEW') {
          setStatus('MANUAL_REVIEW')
          setReason(result.reason || 'Verification saved for manual review.')
          onVerified(result.guest_identity_id)
        } else {
          setStatus('FAILED')
          setReason(result.reason || 'Verification failed. Please try again with a clearer image.')
        }
      } else {
        setStatus('FAILED')
        setReason(result.error || 'System error during verification.')
      }
    } catch (error) {
      console.error('Upload Error:', error)
      setStatus('FAILED')
      setReason('Network error. Please try again.')
    }
  }

  const resetUpload = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setStatus('IDLE')
    setReason('')
  }

  const isLocked = status === 'VERIFIED' || status === 'MANUAL_REVIEW'

  return (
    <div className="space-y-2 relative group">
      <Label className="text-[11px] font-bold text-gray-500 uppercase ml-1">{label}</Label>
      
      <div className="relative w-full aspect-[4/3]">
        <input 
          type="file" 
          id={`input_camera_${idKey}`}
          accept="image/*" 
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLocked}
        />
        <input 
          type="file" 
          id={`input_gallery_${idKey}`}
          accept="image/*" 
          className="hidden"
          onChange={handleFileChange}
          disabled={isLocked}
        />
        
        {preview ? (
          <div className={`absolute inset-0 rounded-xl overflow-hidden border-2 ${status === 'VERIFIED' ? 'border-green-400' : status === 'FAILED' ? 'border-red-400' : 'border-blue-400'}`}>
            <NextImage src={preview} alt="ID Preview" fill unoptimized className={`object-cover ${status !== 'VERIFIED' && status !== 'IDLE' && status !== 'FAILED' ? 'opacity-50 blur-sm' : ''}`} />
            
            {(status === 'UPLOADING' || status === 'PROCESSING' || status === 'EXTRACTING') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white z-10">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider">{status}...</span>
              </div>
            )}

            {status === 'VERIFIED' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/20 text-green-700 font-bold z-10 backdrop-blur-[2px]">
                <CheckCircle className="w-10 h-10 mb-2 text-green-600 bg-white rounded-full" />
                <span className="text-sm bg-white px-3 py-1 rounded-full shadow">✓ Government ID detected</span>
              </div>
            )}

            {status === 'FAILED' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/80 text-white z-10 p-4 text-center">
                <AlertTriangle className="w-8 h-8 mb-2" />
                <span className="text-xs font-bold mb-2">{reason}</span>
                <button type="button" onClick={resetUpload} className="bg-white text-red-600 text-[10px] font-bold px-3 py-1.5 rounded-full shadow hover:bg-gray-100">
                  Try Again
                </button>
              </div>
            )}

            {status === 'MANUAL_REVIEW' && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-orange-500/90 text-white z-10 p-4 text-center">
               <AlertTriangle className="w-8 h-8 mb-2" />
               <span className="text-xs font-bold mb-1">Verification Locked</span>
               <span className="text-[10px] opacity-90 leading-tight">{reason}</span>
             </div>
            )}
            
            {status === 'IDLE' && !isLocked && (
              <button 
                type="button"
                onClick={resetUpload}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-white border-2 border-dashed border-gray-200 rounded-xl transition-all flex flex-col items-center justify-center p-2 gap-2">
             <button
               type="button"
               onClick={() => document.getElementById(`input_camera_${idKey}`)?.click()}
               className="w-full h-[60%] flex flex-col items-center justify-center gap-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all group"
             >
               <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
               <span>Take Physical Photo</span>
             </button>
             <button
               type="button"
               onClick={() => document.getElementById(`input_gallery_${idKey}`)?.click()}
               className="w-full h-[40%] flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold hover:bg-gray-200 active:scale-95 transition-all"
             >
               <ImageIcon className="w-3.5 h-3.5" /> Upload gallery
             </button>
          </div>
        )}
      </div>
    </div>
  )
}
