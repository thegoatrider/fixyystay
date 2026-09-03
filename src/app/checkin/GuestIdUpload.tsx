'use client'

import { useState, useRef } from 'react'
import NextImage from 'next/image'
import { Camera, Image as ImageIcon, CheckCircle, AlertTriangle, Loader2, FlipHorizontal, X } from 'lucide-react'
import { uploadAndVerifyFront, uploadBackImage } from './verify-action'
import { cn } from '@/lib/utils'

type UploadState = 'IDLE' | 'UPLOADING' | 'PROCESSING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW'

const compressImage = (file: File): Promise<File> => {
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

type GuestIdUploadProps = {
  guestIndex: number
  onVerified: (identityId: string | null) => void
}

function SingleSideUpload({
  label,
  idKey,
  disabled,
  onFile,
}: {
  label: string
  idKey: string
  disabled: boolean
  onFile: (file: File) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    onFile(file)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-0.5">{label}</span>
      <div className="relative aspect-[3/2] rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50">
        {preview ? (
          <NextImage src={preview} alt={label} fill unoptimized className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col gap-1.5 items-center justify-center p-2">
            <label
              htmlFor={`cam_${idKey}`}
              className={cn(
                "w-full flex-1 flex flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all active:scale-95",
                disabled
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </label>
            <label
              htmlFor={`gal_${idKey}`}
              className={cn(
                "w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all active:scale-95",
                disabled
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Gallery</span>
            </label>
          </div>
        )}
        <input type="file" id={`cam_${idKey}`} accept="image/*" capture="environment" className="hidden" onChange={handleChange} disabled={disabled} />
        <input type="file" id={`gal_${idKey}`} accept="image/*" className="hidden" onChange={handleChange} disabled={disabled} />
      </div>
    </div>
  )
}

export function GuestIdUpload({ guestIndex, onVerified }: GuestIdUploadProps) {
  const guestLabel = guestIndex === 0 ? 'Primary Guest' : `Guest ${guestIndex + 1}`
  const prefix = `g${guestIndex}`

  // Front states
  const [frontStatus, setFrontStatus] = useState<UploadState>('IDLE')
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [frontReason, setFrontReason] = useState('')
  const [identityId, setIdentityId] = useState<string | null>(null)

  // Back states
  const [backStatus, setBackStatus] = useState<'IDLE' | 'PENDING' | 'UPLOADING' | 'DONE' | 'FAILED'>('IDLE')
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const [backReason, setBackReason] = useState('')
  const [pendingBackFile, setPendingBackFile] = useState<File | null>(null)
  const pendingBackFileRef = useRef<File | null>(null)

  const frontDone = frontStatus === 'VERIFIED' || frontStatus === 'MANUAL_REVIEW'
  const backDone = backStatus === 'DONE'
  const bothDone = frontDone && backDone

  // Process front image — OCR verification
  const handleFrontFile = async (originalFile: File) => {
    setFrontStatus('PROCESSING')
    setFrontReason('')
    const file = await compressImage(originalFile)
    setFrontPreview(URL.createObjectURL(file))
    setFrontReason('')

    const fd = new FormData()
    fd.append('image', file)
    const result = await uploadAndVerifyFront(fd)

    if (result.success && result.guest_identity_id) {
      if (result.status === 'VERIFIED' || result.status === 'MANUAL_REVIEW') {
        const isManual = result.status === 'MANUAL_REVIEW'
        setFrontStatus(isManual ? 'MANUAL_REVIEW' : 'VERIFIED')
        if (isManual && result.reason) {
          setFrontReason(result.reason)
        }
        setIdentityId(result.guest_identity_id)

        // Only call onVerified if back is already DONE (edge case if back was processed before somehow, though unlikely)
        if (backStatus === 'DONE') {
          onVerified(result.guest_identity_id)
        } else {
          onVerified(null)
        }

        // Automatically upload the pending back file if it exists
        const backFileToUpload = pendingBackFileRef.current || pendingBackFile
        if (backFileToUpload) {
          setBackStatus('UPLOADING')
          const backFd = new FormData()
          backFd.append('image', backFileToUpload)
          backFd.append('identityId', result.guest_identity_id)
          const backRes = await uploadBackImage(backFd)
          if (backRes.success) {
            setBackStatus('DONE')
            setPendingBackFile(null)
            onVerified(result.guest_identity_id)
          } else {
            setBackStatus('FAILED')
            setBackReason(backRes.error || 'Back image upload failed.')
            setPendingBackFile(null)
            pendingBackFileRef.current = null
            onVerified(null)
          }
        }
      } else {
        setFrontStatus('FAILED')
        setFrontReason(
          result.reason && result.reason.includes('format') 
            ? result.reason 
            : 'Image blurry or document format not recognized. Please scan a sharp, well-lit image.'
        )
        onVerified(null)
      }
    } else {
      setFrontStatus('FAILED')
      setFrontReason(result.error || 'Verification failed. Please try again.')
      onVerified(null)
    }
  }

  // Process back image — store as pending if front isn't verified yet, otherwise upload
  const handleBackFile = async (originalFile: File) => {
    setBackStatus('UPLOADING') // Set a temporary status so UI shows action
    const file = await compressImage(originalFile)
    setBackPreview(URL.createObjectURL(file))
    setBackReason('')

    if (!identityId) {
      // Front is not verified yet. Store the file to be uploaded later.
      setPendingBackFile(file)
      pendingBackFileRef.current = file
      setBackStatus('PENDING')
      return
    }

    setBackStatus('UPLOADING')
    const fd = new FormData()
    fd.append('image', file)
    fd.append('identityId', identityId)
    const result = await uploadBackImage(fd)

    if (result.success) {
      setBackStatus('DONE')
      setPendingBackFile(null)
      if (identityId && frontDone) onVerified(identityId)
    } else {
      setBackStatus('FAILED')
      setBackReason(result.error || 'Back image upload failed.')
      setPendingBackFile(null)
    }
  }

  const resetFront = () => {
    setFrontPreview(null)
    setFrontStatus('IDLE')
    setFrontReason('')
    setIdentityId(null)
    if (backStatus !== 'PENDING') {
      setBackPreview(null)
      setBackStatus('IDLE')
      setBackReason('')
      setPendingBackFile(null)
    }
    onVerified(null)
  }

  const resetBack = () => {
    setBackPreview(null)
    setBackStatus('IDLE')
    setBackReason('')
    setPendingBackFile(null)
    onVerified(null)
  }

  return (
    <div className={cn(
      "flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all duration-300",
      bothDone
        ? "border-green-300 bg-green-50/50"
        : frontDone
        ? "border-blue-200 bg-blue-50/30"
        : "border-gray-200 bg-white"
    )}>
      {/* Guest header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{guestLabel}</span>
        {bothDone && (
          <span className="flex items-center gap-1 text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        )}
        {frontDone && !backDone && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
            Back ID needed
          </span>
        )}
      </div>

      {/* Two-column: Front | Back */}
      <div className="grid grid-cols-2 gap-3">
        {/* ── FRONT ── */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest px-0.5 flex items-center gap-1
            text-gray-400">
            Front Side
          </span>
          <div className={cn(
            "relative aspect-[3/2] rounded-xl overflow-hidden border-2 transition-all",
            frontStatus === 'VERIFIED' ? "border-green-400" :
            frontStatus === 'MANUAL_REVIEW' ? "border-amber-400" :
            frontStatus === 'FAILED' ? "border-red-400" :
            frontStatus === 'PROCESSING' ? "border-blue-300" :
            "border-dashed border-gray-200 bg-gray-50"
          )}>
            {frontPreview ? (
              <>
                <NextImage
                  src={frontPreview}
                  alt="Front ID"
                  fill
                  unoptimized
                  className={cn("object-cover", frontStatus === 'PROCESSING' && "opacity-40 blur-sm")}
                />
                {frontStatus === 'PROCESSING' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-white gap-1">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[9px] font-bold uppercase">Scanning...</span>
                  </div>
                )}
                {frontStatus === 'VERIFIED' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/20 gap-1">
                    <CheckCircle className="w-6 h-6 text-green-600 bg-white rounded-full" />
                    <span className="text-[9px] font-bold text-green-800 bg-white px-2 py-0.5 rounded-full">✓ ID Verified</span>
                  </div>
                )}

                {frontStatus === 'FAILED' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-600/80 p-2 gap-1">
                    <AlertTriangle className="w-5 h-5 text-white" />
                    <span className="text-[8px] font-bold text-white text-center leading-tight">{frontReason}</span>
                    <button type="button" onClick={resetFront} className="mt-1 bg-white text-red-600 text-[9px] font-black px-2 py-1 rounded-full">
                      Retry
                    </button>
                  </div>
                )}
                {/* Remove / Retake button always visible */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); resetFront(); }}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-sm backdrop-blur-sm z-10"
                  title="Remove Image"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col gap-1 items-center justify-center p-2">
                <label
                  htmlFor={`cam_front_${prefix}`}
                  className="w-full flex-1 flex flex-col items-center justify-center gap-1 rounded-lg bg-blue-600 text-white text-[9px] font-bold cursor-pointer hover:bg-blue-700 transition active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Camera
                </label>
                <label
                  htmlFor={`gal_front_${prefix}`}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-gray-100 text-gray-600 text-[9px] font-bold cursor-pointer hover:bg-gray-200 transition active:scale-95"
                >
                  <ImageIcon className="w-3 h-3" />
                  Gallery
                </label>
              </div>
            )}
            <input type="file" id={`cam_front_${prefix}`} accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFrontFile(f); e.target.value = ''; }}
              disabled={frontStatus === 'PROCESSING'}
            />
            <input type="file" id={`gal_front_${prefix}`} accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFrontFile(f); e.target.value = ''; }}
              disabled={frontStatus === 'PROCESSING'}
            />
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest px-0.5 flex items-center gap-1
            text-gray-400">
            <FlipHorizontal className="w-3 h-3" /> Back Side
          </span>
          <div className={cn(
            "relative aspect-[3/2] rounded-xl overflow-hidden border-2 transition-all",
            backStatus === 'DONE' ? "border-green-400" :
            backStatus === 'FAILED' ? "border-red-400" :
            (backStatus === 'UPLOADING' || backStatus === 'PENDING') ? "border-blue-300" :
            "border-dashed border-gray-200 bg-gray-50"
          )}>
            {backPreview ? (
              <>
                <NextImage
                  src={backPreview}
                  alt="Back ID"
                  fill
                  unoptimized
                  className={cn("object-cover", backStatus === 'UPLOADING' && "opacity-40 blur-sm")}
                />
                {backStatus === 'UPLOADING' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-white gap-1">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[9px] font-bold uppercase">Saving...</span>
                  </div>
                )}
                {backStatus === 'PENDING' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white gap-1">
                    <span className="text-[9px] font-bold uppercase text-center px-2">
                      {frontStatus === 'FAILED' ? 'Front failed. Retry front.' :
                       frontStatus === 'PROCESSING' ? 'Scanning front side...' :
                       'Ready. Waiting for front...'}
                    </span>
                  </div>
                )}
                {backStatus === 'DONE' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/20 gap-1">
                    <CheckCircle className="w-6 h-6 text-green-600 bg-white rounded-full" />
                    <span className="text-[9px] font-bold text-green-800 bg-white px-2 py-0.5 rounded-full">✓ Saved</span>
                  </div>
                )}
                {backStatus === 'FAILED' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-600/80 p-2 gap-1">
                    <AlertTriangle className="w-5 h-5 text-white" />
                    <span className="text-[8px] font-bold text-white text-center">{backReason}</span>
                    <button type="button" onClick={resetBack} className="mt-1 bg-white text-red-600 text-[9px] font-black px-2 py-1 rounded-full">
                      Retry
                    </button>
                  </div>
                )}
                {/* Remove / Retake button always visible */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); resetBack(); }}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-sm backdrop-blur-sm z-10"
                  title="Remove Image"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col gap-1 items-center justify-center p-2">
                <label
                  htmlFor={`cam_back_${prefix}`}
                  className="w-full flex-1 flex flex-col items-center justify-center gap-1 rounded-lg bg-indigo-600 text-white text-[9px] font-bold cursor-pointer hover:bg-indigo-700 transition active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Camera
                </label>
                <label
                  htmlFor={`gal_back_${prefix}`}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-gray-100 text-gray-600 text-[9px] font-bold cursor-pointer hover:bg-gray-200 transition active:scale-95"
                >
                  <ImageIcon className="w-3 h-3" />
                  Gallery
                </label>
              </div>
            )}
            <input type="file" id={`cam_back_${prefix}`} accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBackFile(f); e.target.value = ''; }}
              disabled={backStatus === 'UPLOADING' || backStatus === 'PENDING'}
            />
            <input type="file" id={`gal_back_${prefix}`} accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBackFile(f); e.target.value = ''; }}
              disabled={backStatus === 'UPLOADING' || backStatus === 'PENDING'}
            />
          </div>
        </div>
      </div>

      {/* Visual Helper Scan Tips */}
      {!bothDone && (
        <div className="bg-blue-50/40 rounded-xl p-3 border border-blue-100/30 text-[10px] text-blue-700 leading-normal flex flex-col gap-1.5 mt-1 animate-in fade-in duration-300">
          <p className="font-extrabold uppercase tracking-wide text-blue-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Tips for successful verification:
          </p>
          <ul className="list-disc pl-3.5 flex flex-col gap-0.5 font-medium text-blue-600/90">
            <li>Ensure the ID card is flat, completely visible, and well-lit.</li>
            <li>Text must be clear and readable (avoid screen glare/camera flash reflections).</li>
            <li>Do not upload selfies, screenshots, or photos of other screens.</li>
            <li>Make sure the document number format is fully valid (e.g. 12-digit Aadhaar).</li>
          </ul>
        </div>
      )}

      {/* Per-guest status message */}
      {frontReason && frontStatus !== 'FAILED' && (
        <p className="text-[10px] text-amber-600 font-medium px-1">{frontReason}</p>
      )}
    </div>
  )
}
