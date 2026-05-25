'use client'

import { useState } from 'react'
import {
  Camera, Image as ImageIcon, CheckCircle, AlertTriangle,
  Loader2, FlipHorizontal, ShieldCheck, User, AlertCircle
} from 'lucide-react'
import { verifyEmployeeFrontId, uploadEmployeeBackId } from './employee-verify-action'
import { cn } from '@/lib/utils'

export type EmployeeIdData = {
  frontUrl: string
  backUrl: string | null
  status: string
  extracted: {
    full_name: string
    date_of_birth: string
    document_type: string
    document_number: string
    confidence: number
    raw_ocr_text: string
    ocr_json: any
  }
  nameMatchStatus: 'MATCHED' | 'MISMATCH' | 'UNVERIFIED'
  dobMatchStatus:  'MATCHED' | 'MISMATCH' | 'UNVERIFIED'
}

type Props = {
  enteredName: string   // firstName + ' ' + lastName from the form
  enteredDob:  string   // YYYY-MM-DD from the form
  onComplete: (data: EmployeeIdData) => void
  onReset: () => void
}

type FrontStatus = 'IDLE' | 'PROCESSING' | 'VERIFIED' | 'MANUAL_REVIEW' | 'FAILED'
type BackStatus  = 'IDLE' | 'PENDING' | 'UPLOADING' | 'DONE' | 'FAILED'

// ── Helpers ────────────────────────────────────────────────────────────────────
function normalise(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function namesMatch(ocrName: string, enteredName: string): boolean {
  if (!ocrName || !enteredName) return false
  const ocr = normalise(ocrName)
  const entered = normalise(enteredName)
  // Check either full match or if all entered words appear in OCR name
  if (ocr === entered) return true
  const enteredWords = entered.split(' ').filter(Boolean)
  return enteredWords.every(w => ocr.includes(w))
}

function dobMatch(ocrDob: string, enteredDob: string): boolean {
  if (!ocrDob || !enteredDob) return false
  // Normalise both to digits only for fuzzy compare
  const ocrDigits     = ocrDob.replace(/\D/g, '')
  const enteredDigits = enteredDob.replace(/\D/g, '')
  return ocrDigits === enteredDigits || ocrDob.includes(enteredDob) || enteredDob.includes(ocrDob)
}

export function EmployeeIdUpload({ enteredName, enteredDob, onComplete, onReset }: Props) {
  const [frontStatus, setFrontStatus] = useState<FrontStatus>('IDLE')
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [frontReason, setFrontReason]   = useState('')
  const [extracted, setExtracted]       = useState<EmployeeIdData['extracted'] | null>(null)
  const [frontUrl, setFrontUrl]         = useState<string | null>(null)

  const [backStatus, setBackStatus] = useState<BackStatus>('IDLE')
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const [backUrl, setBackUrl]         = useState<string | null>(null)
  const [backReason, setBackReason]   = useState('')
  const [pendingBackFile, setPendingBackFile] = useState<File | null>(null)

  const [nameMatch, setNameMatch] = useState<'MATCHED' | 'MISMATCH' | 'UNVERIFIED'>('UNVERIFIED')
  const [dobMatchSt, setDobMatchSt] = useState<'MATCHED' | 'MISMATCH' | 'UNVERIFIED'>('UNVERIFIED')

  const frontDone = frontStatus === 'VERIFIED' || frontStatus === 'MANUAL_REVIEW'
  const backDone  = backStatus === 'DONE'

  // Notify parent whenever both sides are done
  const notifyComplete = (fu: string, bu: string | null, ex: EmployeeIdData['extracted'], nm: typeof nameMatch, dm: typeof dobMatchSt) => {
    onComplete({
      frontUrl: fu,
      backUrl: bu,
      status: frontStatus === 'VERIFIED' ? 'VERIFIED' : 'MANUAL_REVIEW',
      extracted: ex,
      nameMatchStatus: nm,
      dobMatchStatus: dm
    })
  }

  const handleFrontFile = async (file: File) => {
    setFrontPreview(URL.createObjectURL(file))
    setFrontStatus('PROCESSING')
    setFrontReason('')

    const fd = new FormData()
    fd.append('image', file)
    const res = await verifyEmployeeFrontId(fd)

    if (!res.success || !res.frontUrl) {
      setFrontStatus('FAILED')
      setFrontReason(res.error || 'Verification failed.')
      setFrontPreview(null)
      return
    }

    const ex = res.extracted!
    const fs = res.status === 'VERIFIED' ? 'VERIFIED' : res.status === 'MANUAL_REVIEW' ? 'MANUAL_REVIEW' : 'FAILED'

    if (fs === 'FAILED') {
      setFrontStatus('FAILED')
      setFrontReason(res.reason || 'Could not verify ID. Upload a clearer image.')
      setFrontPreview(null)
      return
    }

    setFrontStatus(fs)
    setFrontUrl(res.frontUrl)
    setExtracted(ex)

    // Cross-check
    const nm = enteredName.trim()
      ? (namesMatch(ex.full_name, enteredName) ? 'MATCHED' : 'MISMATCH')
      : 'UNVERIFIED'
    const dm = enteredDob
      ? (dobMatch(ex.date_of_birth, enteredDob) ? 'MATCHED' : 'MISMATCH')
      : 'UNVERIFIED'

    setNameMatch(nm)
    setDobMatchSt(dm)

    // Automatically upload the pending back file if it exists
    if (pendingBackFile) {
      setBackStatus('UPLOADING')
      const backFd = new FormData()
      backFd.append('image', pendingBackFile)
      const backRes = await uploadEmployeeBackId(backFd)
      if (backRes.success && backRes.backUrl) {
        setBackStatus('DONE')
        setBackUrl(backRes.backUrl)
        setPendingBackFile(null)
        notifyComplete(res.frontUrl, backRes.backUrl, ex, nm, dm)
      } else {
        setBackStatus('FAILED')
        setBackReason(backRes.error || 'Back image upload failed.')
        setPendingBackFile(null)
      }
    } else {
      // If back already done (not pending), notify complete
      if (backDone && backUrl) notifyComplete(res.frontUrl, backUrl, ex, nm, dm)
    }
  }

  const handleBackFile = async (file: File) => {
    setBackPreview(URL.createObjectURL(file))
    setBackReason('')

    if (!frontDone || !frontUrl) {
      setPendingBackFile(file)
      setBackStatus('PENDING')
      return
    }

    setBackStatus('UPLOADING')

    const fd = new FormData()
    fd.append('image', file)
    const res = await uploadEmployeeBackId(fd)

    if (!res.success || !res.backUrl) {
      setBackStatus('FAILED')
      setBackReason(res.error || 'Upload failed.')
      setBackPreview(null)
      setPendingBackFile(null)
      return
    }

    setBackStatus('DONE')
    setBackUrl(res.backUrl)
    setPendingBackFile(null)

    // Notify parent
    if (frontDone && frontUrl && extracted) {
      notifyComplete(frontUrl, res.backUrl, extracted, nameMatch, dobMatchSt)
    }
  }

  const resetAll = () => {
    setFrontStatus('IDLE'); setFrontPreview(null); setFrontReason(''); setFrontUrl(null); setExtracted(null)
    setBackStatus('IDLE');  setBackPreview(null);  setBackReason('');  setBackUrl(null); setPendingBackFile(null)
    setNameMatch('UNVERIFIED'); setDobMatchSt('UNVERIFIED')
    onReset()
  }

  return (
    <div className={cn(
      'flex flex-col gap-4 p-5 rounded-2xl border-2 transition-all duration-300',
      frontDone && backDone ? 'border-green-300 bg-green-50/40' :
      frontDone             ? 'border-blue-200 bg-blue-50/20' :
                              'border-gray-200 bg-white'
    )}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-black text-gray-900">Government ID Verification</span>
        </div>
        {frontDone && backDone && (
          <span className="flex items-center gap-1 text-[10px] font-black text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        )}
        {frontDone && !backDone && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
            Upload back side
          </span>
        )}
      </div>

      {/* Front + Back upload panels */}
      <div className="grid grid-cols-2 gap-4">
        {/* ── FRONT ── */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">▣ Front Side</span>
          <div className={cn(
            'relative aspect-[3/2] rounded-xl overflow-hidden border-2 transition-all',
            frontStatus === 'VERIFIED'      ? 'border-green-400' :
            frontStatus === 'MANUAL_REVIEW' ? 'border-amber-400' :
            frontStatus === 'FAILED'        ? 'border-red-400'   :
            frontStatus === 'PROCESSING'    ? 'border-blue-300'  :
                                              'border-dashed border-gray-200 bg-gray-50'
          )}>
            {frontPreview ? (
              <>
                <img src={frontPreview} alt="Front ID" className={cn('w-full h-full object-cover', frontStatus === 'PROCESSING' && 'opacity-40 blur-sm')} />
                {frontStatus === 'PROCESSING' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-white gap-1">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[9px] font-bold uppercase">Scanning...</span>
                  </div>
                )}
                {(frontStatus === 'VERIFIED' || frontStatus === 'MANUAL_REVIEW') && (
                  <div className={cn(
                    'absolute inset-0 flex flex-col items-center justify-center gap-1',
                    frontStatus === 'VERIFIED' ? 'bg-green-500/20' : 'bg-amber-400/20'
                  )}>
                    <CheckCircle className={cn('w-6 h-6 bg-white rounded-full', frontStatus === 'VERIFIED' ? 'text-green-600' : 'text-amber-600')} />
                    <span className={cn('text-[9px] font-bold bg-white px-2 py-0.5 rounded-full', frontStatus === 'VERIFIED' ? 'text-green-800' : 'text-amber-800')}>
                      {frontStatus === 'VERIFIED' ? '✓ ID Verified' : 'Accepted'}
                    </span>
                  </div>
                )}
                {frontStatus === 'FAILED' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-600/80 p-2 gap-1">
                    <AlertTriangle className="w-5 h-5 text-white" />
                    <span className="text-[8px] font-bold text-white text-center leading-tight">{frontReason}</span>
                    <button type="button" onClick={resetAll} className="mt-1 bg-white text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full">Retry</button>
                  </div>
                )}
                {frontDone && (
                  <button type="button" onClick={resetAll}
                    className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full hover:bg-black/70 transition">
                    Retake
                  </button>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col gap-1 items-center justify-center p-2">
                <label htmlFor="emp_cam_front" className="w-full flex-1 flex flex-col items-center justify-center gap-1 rounded-lg bg-blue-600 text-white text-[9px] font-bold cursor-pointer hover:bg-blue-700 transition active:scale-95">
                  <Camera className="w-4 h-4" /> Camera
                </label>
                <label htmlFor="emp_gal_front" className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-gray-100 text-gray-600 text-[9px] font-bold cursor-pointer hover:bg-gray-200 transition active:scale-95">
                  <ImageIcon className="w-3 h-3" /> Gallery
                </label>
              </div>
            )}
            <input type="file" id="emp_cam_front" accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFrontFile(f) }}
              disabled={frontStatus === 'PROCESSING'}
            />
            <input type="file" id="emp_gal_front" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFrontFile(f) }}
              disabled={frontStatus === 'PROCESSING'}
            />
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
            <FlipHorizontal className="w-3 h-3" /> Back Side
          </span>
          <div className={cn(
            'relative aspect-[3/2] rounded-xl overflow-hidden border-2 transition-all',
            backStatus === 'DONE'     ? 'border-green-400' :
            backStatus === 'FAILED'   ? 'border-red-400'   :
            (backStatus === 'UPLOADING' || backStatus === 'PENDING') ? 'border-blue-300' :
            'border-dashed border-gray-200 bg-gray-50'
          )}>
            {backPreview ? (
              <>
                <img src={backPreview} alt="Back ID" className={cn('w-full h-full object-cover', backStatus === 'UPLOADING' && 'opacity-40 blur-sm')} />
                {backStatus === 'UPLOADING' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader2 className="w-5 h-5 text-white animate-spin" /></div>
                )}
                {backStatus === 'PENDING' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white gap-1">
                    <span className="text-[9px] font-bold uppercase text-center px-2">Waiting for front...</span>
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
                    <span className="text-[8px] text-white text-center">{backReason}</span>
                    <button type="button" onClick={() => { setBackPreview(null); setBackStatus('IDLE') }}
                      className="mt-1 bg-white text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full">Retry</button>
                  </div>
                )}
                {backStatus === 'DONE' && (
                  <button type="button" onClick={() => { setBackPreview(null); setBackStatus('IDLE'); setBackUrl(null) }}
                    className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">Retake</button>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col gap-1 items-center justify-center p-2">
                <label htmlFor="emp_cam_back" className="w-full flex-1 flex flex-col items-center justify-center gap-1 rounded-lg bg-indigo-600 text-white text-[9px] font-bold cursor-pointer hover:bg-indigo-700 transition active:scale-95">
                  <Camera className="w-4 h-4" /> Camera
                </label>
                <label htmlFor="emp_gal_back" className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-gray-100 text-gray-600 text-[9px] font-bold cursor-pointer hover:bg-gray-200 transition active:scale-95">
                  <ImageIcon className="w-3 h-3" /> Gallery
                </label>
              </div>
            )}
            <input type="file" id="emp_cam_back" accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBackFile(f) }}
              disabled={backStatus === 'UPLOADING' || backStatus === 'PENDING'}
            />
            <input type="file" id="emp_gal_back" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBackFile(f) }}
              disabled={backStatus === 'UPLOADING' || backStatus === 'PENDING'}
            />
          </div>
        </div>
      </div>

      {/* Extracted details + match results */}
      {extracted && frontDone && (
        <div className="flex flex-col gap-3 pt-3 border-t border-gray-100">
          {/* OCR extracted data */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Extracted from ID</p>
              <p className="font-bold text-gray-900 flex items-center gap-1">
                <User className="w-3 h-3 text-gray-400" />
                {extracted.full_name || '—'}
              </p>
              <p className="text-gray-600">DOB: <span className="font-semibold">{extracted.date_of_birth || '—'}</span></p>
              <p className="text-gray-600">{extracted.document_type} · <span className="font-mono font-semibold">{extracted.document_number || '—'}</span></p>
              <p className="text-gray-400">Confidence: {Math.round((extracted.confidence || 0) * 100)}%</p>
            </div>

            <div className="flex flex-col gap-2">
              {/* Name match badge */}
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border',
                nameMatch === 'MATCHED'  ? 'bg-green-50 border-green-200 text-green-800' :
                nameMatch === 'MISMATCH' ? 'bg-red-50 border-red-200 text-red-800' :
                                           'bg-gray-50 border-gray-200 text-gray-500'
              )}>
                {nameMatch === 'MATCHED'  ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> :
                 nameMatch === 'MISMATCH' ? <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /> :
                                            <AlertCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                <div>
                  <p className="text-[9px] uppercase tracking-wider opacity-70">Name</p>
                  <p>{nameMatch === 'MATCHED' ? 'Matches ✓' : nameMatch === 'MISMATCH' ? 'Name Mismatch ⚠' : 'Enter name above'}</p>
                </div>
              </div>

              {/* DOB match badge */}
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border',
                dobMatchSt === 'MATCHED'  ? 'bg-green-50 border-green-200 text-green-800' :
                dobMatchSt === 'MISMATCH' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                             'bg-gray-50 border-gray-200 text-gray-500'
              )}>
                {dobMatchSt === 'MATCHED'  ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> :
                 dobMatchSt === 'MISMATCH' ? <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" /> :
                                              <AlertCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                <div>
                  <p className="text-[9px] uppercase tracking-wider opacity-70">Date of Birth</p>
                  <p>{dobMatchSt === 'MATCHED' ? 'Matches ✓' : dobMatchSt === 'MISMATCH' ? 'DOB Mismatch ⚠' : 'Enter DOB above'}</p>
                </div>
              </div>
            </div>
          </div>

          {(nameMatch === 'MISMATCH' || dobMatchSt === 'MISMATCH') && (
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">
              ⚠ Mismatch detected. You can still register the employee — the mismatch will be flagged for review on the police dashboard.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
