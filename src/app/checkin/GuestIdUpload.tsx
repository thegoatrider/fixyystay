'use client'

import { useState } from 'react'
import { Camera, Image as ImageIcon, CheckCircle, AlertTriangle, Loader2, FlipHorizontal } from 'lucide-react'
import { uploadAndVerifyFront, uploadBackImage } from './verify-action'
import { cn } from '@/lib/utils'

type UploadState = 'IDLE' | 'UPLOADING' | 'PROCESSING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW'

type GuestIdUploadProps = {
  guestIndex: number         // 0-based index
  onVerified: (identityId: string) => void  // called once front is verified
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
          <img src={preview} alt={label} className="w-full h-full object-cover" />
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

  const frontDone = frontStatus === 'VERIFIED' || frontStatus === 'MANUAL_REVIEW'
  const backDone = backStatus === 'DONE'
  const bothDone = frontDone && backDone

  // Process front image — OCR verification
  const handleFrontFile = async (file: File) => {
    setFrontPreview(URL.createObjectURL(file))
    setFrontStatus('PROCESSING')
    setFrontReason('')

    const fd = new FormData()
    fd.append('image', file)
    const result = await uploadAndVerifyFront(fd)

    if (result.success && result.guest_identity_id) {
      if (result.status === 'VERIFIED' || result.status === 'MANUAL_REVIEW') {
        const isVerified = result.status === 'VERIFIED'
        setFrontStatus(isVerified ? 'VERIFIED' : 'MANUAL_REVIEW')
        if (!isVerified) {
          setFrontReason('Manual review needed — image was accepted but may be re-checked.')
        }
        setIdentityId(result.guest_identity_id)
        onVerified(result.guest_identity_id)

        // Automatically upload the pending back file if it exists
        if (pendingBackFile) {
          setBackStatus('UPLOADING')
          const backFd = new FormData()
          backFd.append('image', pendingBackFile)
          backFd.append('identityId', result.guest_identity_id)
          const backRes = await uploadBackImage(backFd)
          if (backRes.success) {
            setBackStatus('DONE')
            setPendingBackFile(null)
          } else {
            setBackStatus('FAILED')
            setBackReason(backRes.error || 'Back image upload failed.')
            setPendingBackFile(null)
          }
        }
      } else {
        setFrontStatus('FAILED')
        setFrontReason(result.reason || 'Could not verify. Please upload a clearer image.')
        setFrontPreview(null)
      }
    } else {
      setFrontStatus('FAILED')
      setFrontReason(result.error || 'Verification failed. Please try again.')
      setFrontPreview(null)
    }
  }

  // Process back image — store as pending if front isn't verified yet, otherwise upload
  const handleBackFile = async (file: File) => {
    setBackPreview(URL.createObjectURL(file))
    setBackReason('')

    if (!identityId) {
      // Front is not verified yet. Store the file to be uploaded later.
      setPendingBackFile(file)
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
    } else {
      setBackStatus('FAILED')
      setBackReason(result.error || 'Back image upload failed.')
      setBackPreview(null)
      setPendingBackFile(null)
    }
  }

  const resetFront = () => {
    setFrontPreview(null)
    setFrontStatus('IDLE')
    setFrontReason('')
    setIdentityId(null)
    // If back was uploaded or pending, maybe keep it or reset it? Better to reset it so it links to the new front.
    setBackPreview(null)
    setBackStatus('IDLE')
    setBackReason('')
    setPendingBackFile(null)
  }

  const resetBack = () => {
    setBackPreview(null)
    setBackStatus('IDLE')
    setBackReason('')
    setPendingBackFile(null)
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
                <img
                  src={frontPreview}
                  alt="Front ID"
                  className={cn("w-full h-full object-cover", frontStatus === 'PROCESSING' && "opacity-40 blur-sm")}
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
                {frontStatus === 'MANUAL_REVIEW' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-400/20 gap-1">
                    <CheckCircle className="w-6 h-6 text-amber-600 bg-white rounded-full" />
                    <span className="text-[9px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-full">Accepted</span>
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
                {/* Retake button when verified */}
                {(frontStatus === 'VERIFIED' || frontStatus === 'MANUAL_REVIEW') && (
                  <button
                    type="button"
                    onClick={resetFront}
                    className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full hover:bg-black/70 transition"
                  >
                    Retake
                  </button>
                )}
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
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFrontFile(f) }}
              disabled={frontStatus === 'PROCESSING'}
            />
            <input type="file" id={`gal_front_${prefix}`} accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFrontFile(f) }}
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
                <img
                  src={backPreview}
                  alt="Back ID"
                  className={cn("w-full h-full object-cover", backStatus === 'UPLOADING' && "opacity-40 blur-sm")}
                />
                {backStatus === 'UPLOADING' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-white gap-1">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[9px] font-bold uppercase">Saving...</span>
                  </div>
                )}
                {backStatus === 'PENDING' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white gap-1">
                    <span className="text-[9px] font-bold uppercase text-center px-2">Ready. Waiting for front to verify...</span>
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
                {backStatus === 'DONE' && (
                  <button
                    type="button"
                    onClick={resetBack}
                    className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full hover:bg-black/70 transition"
                  >
                    Retake
                  </button>
                )}
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
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBackFile(f) }}
              disabled={backStatus === 'UPLOADING' || backStatus === 'PENDING'}
            />
            <input type="file" id={`gal_back_${prefix}`} accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBackFile(f) }}
              disabled={backStatus === 'UPLOADING' || backStatus === 'PENDING'}
            />
          </div>
        </div>
      </div>

      {/* Per-guest status message */}
      {frontReason && frontStatus !== 'FAILED' && (
        <p className="text-[10px] text-amber-600 font-medium px-1">{frontReason}</p>
      )}
    </div>
  )
}
