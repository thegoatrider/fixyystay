'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL_NAME = 'gemini-2.5-flash'

const OCR_PROMPT = `
You are a document OCR extraction engine. Your only job is to extract text and structured data from ID documents. You must NEVER refuse, NEVER ask for re-upload, and NEVER return an error message.

ABSOLUTE RULES:
1. Always return a valid JSON response — no exceptions.
2. If a field is unclear, make your best guess and mark it with a confidence flag.
3. If a section is partially visible, extract whatever is visible.
4. Never say "I cannot", "please re-upload", "image quality", or any failure message.
5. Treat every image as processable, regardless of angle, lighting, or partial obstruction.

EXTRACTION TASK:
Extract the following fields from the uploaded government ID image:

{
  "full_name": "",
  "date_of_birth": "",
  "id_number": "",
  "id_type": "Aadhaar | PAN | Passport | Voter ID | Driving Licence | Other",
  "address": "",
  "gender": "",
  "expiry_date": "",
  "confidence": {
    "overall": "high | medium | low",
    "notes": "any field-level uncertainty notes here"
  }
}

FALLBACK BEHAVIOR (follow strictly):
- If a field cannot be read at all: use null, do not omit the key.
- If text is partially readable: extract the readable portion and add "[partial]" suffix.
- If you are guessing: add "[inferred]" suffix to that field's value.
- Never leave the response blank or return plain text — always return the JSON object.

Return ONLY the JSON. No explanations, no preamble, no markdown.
`

const SYSTEM_PROMPT = OCR_PROMPT
const BACK_SYSTEM_PROMPT = OCR_PROMPT

// Helper functions for cleaning and mapping OCR fields
function cleanFieldValue(val: string | null | undefined): string {
  if (!val) return ''
  return val.replace(/\[\s*(inferred|partial)\s*\]/gi, '').trim()
}

function mapIdType(idType: string | null | undefined): string {
  if (!idType) return 'UNKNOWN'
  const normalized = idType.toLowerCase().replace(/[\s_]/g, '')
  if (normalized.includes('aadhaar')) return 'AADHAAR'
  if (normalized.includes('pan')) return 'PAN'
  if (normalized.includes('passport')) return 'PASSPORT'
  if (normalized.includes('voterid') || normalized.includes('voter')) return 'VOTER_ID'
  if (normalized.includes('drivinglicence') || normalized.includes('drivinglicense') || normalized.includes('driving')) return 'DRIVING_LICENSE'
  return 'UNKNOWN'
}

function mapConfidenceToNumeric(overall: string | null | undefined): number {
  if (!overall) return 0.50
  const normalized = overall.toLowerCase().trim()
  if (normalized === 'high') return 0.90
  if (normalized === 'medium') return 0.70
  if (normalized === 'low') return 0.35
  return 0.50
}

// ─── Helper: upload a file to Supabase storage and return public URL ───────────
async function uploadToStorage(file: File, folder: string): Promise<string | null> {
  const supabaseAdmin = createAdminClient()
  const fileExt = file.name.split('.').pop() || 'jpg'
  const randomStr = Math.random().toString(36).substring(2, 7)
  const fileName = `${folder}/${Date.now()}-${randomStr}.${fileExt}`

  const { error } = await supabaseAdmin.storage
    .from('property_images')
    .upload(fileName, file, { contentType: file.type, cacheControl: '3600' })

  if (error) {
    console.error('[STORAGE] Upload failed:', error)
    return null
  }

  const { data } = supabaseAdmin.storage.from('property_images').getPublicUrl(fileName)
  return data.publicUrl
}

// ─── Helper: Retry wrapper for Gemini API to handle rate limits ────────────────
async function generateContentWithRetry(contents: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const generatePromise = ai.models.generateContent(contents);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 45000)
      );
      const response = await Promise.race([generatePromise, timeoutPromise]) as any;
      return response;
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      // If it's a timeout or rate limit, wait and retry
      await new Promise(res => setTimeout(res, 2000 * (i + 1))); // Exponential backoff
    }
  }
}

// ─── Action 1: Upload FRONT ID → run OCR → create guest_identity record ────────
export async function uploadAndVerifyFront(formData: FormData) {
  console.log('[VERIFY-FRONT] Starting front ID verification...')

  try {
    const file = formData.get('image') as File
    if (!file || file.size === 0) return { success: false, error: 'No image provided.' }

    // 1. Upload front image
    const imageUrl = await uploadToStorage(file, 'temp_verification')
    if (!imageUrl) return { success: false, error: 'Failed to upload front image.' }

    // 2. OCR with Gemini
    console.log('[VERIFY-FRONT] Analyzing with Gemini AI...')
    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    let aiResponseText = '{}'
    let aiUnavailableError = ''
    try {
      const response = await generateContentWithRetry({
        model: MODEL_NAME,
        contents: [
          SYSTEM_PROMPT,
          { inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } }
        ],
        config: { temperature: 0.0, responseMimeType: 'application/json' }
      });

      aiResponseText = response?.text || '{}'
    } catch (aiError: any) {
      console.error('[VERIFY-FRONT] AI call failed:', aiError)
      if (aiError.message === 'AI_TIMEOUT') {
        aiUnavailableError = 'Scanning timed out. Saved for manual review.'
      } else {
        aiUnavailableError = 'AI verification service temporarily unavailable. Saved for manual review.'
      }
    }

    // 3. Parse JSON
    let result: any = {}
    let parseFailed = false
    try {
      if (aiUnavailableError) throw new Error('AI Unavailable')
      result = JSON.parse(aiResponseText.replace(/^```json/gi, '').replace(/```$/g, '').trim())
    } catch {
      try {
        const firstBrace = aiResponseText.indexOf('{')
        const lastBrace = aiResponseText.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          result = JSON.parse(aiResponseText.substring(firstBrace, lastBrace + 1))
        } else {
          throw new Error('No JSON object found')
        }
      } catch (fallbackErr) {
        parseFailed = true
        result = { 
          is_government_id: false, 
          document_type: 'UNKNOWN', 
          confidence: 0, 
          suspicious: false, 
          reason: aiUnavailableError || 'AI could not format data correctly. Manual review required.', 
          raw_ocr_text: aiResponseText 
        }
      }
    }

    // 3.5 Normalize and map the fields if parsing succeeded
    let normalizedResult: any = {}
    if (parseFailed) {
      normalizedResult = result
    } else {
      const mappedDocType = mapIdType(result.id_type || result.idType)
      const cleanNum = cleanFieldValue(result.id_number || result.idNumber || result.document_number || result.documentNumber)
      const cleanName = cleanFieldValue(result.full_name || result.fullName || result.name)
      const cleanDob = cleanFieldValue(result.date_of_birth || result.dateOfBirth || result.dob)
      const numericConfidence = mapConfidenceToNumeric(result.confidence?.overall || (result.confidence && typeof result.confidence === 'string' ? result.confidence : 'medium'))
      
      const isGovtId = mappedDocType !== 'UNKNOWN'
      const suspicious = numericConfidence < 0.40
      
      normalizedResult = {
        is_government_id: isGovtId,
        document_type: mappedDocType,
        document_number: cleanNum,
        full_name: cleanName,
        date_of_birth: cleanDob,
        confidence: numericConfidence,
        suspicious: suspicious,
        reason: result.confidence?.notes || '',
        raw_ocr_text: aiResponseText
      }
    }

    console.log('[VERIFY-FRONT] AI Result:', normalizedResult.document_type, 'Confidence:', normalizedResult.confidence)

    // 4. Validation
    let status = 'MANUAL_REVIEW'
    let finalReason = normalizedResult.reason

    if (parseFailed) {
      status = 'MANUAL_REVIEW'
      finalReason = normalizedResult.reason || 'AI extraction failed. Saved for manual review.'
    } else if (normalizedResult.suspicious || !normalizedResult.is_government_id) {
      status = 'MANUAL_REVIEW'
      finalReason = normalizedResult.reason || 'Document flagged or type unrecognized. Saved for manual review.'
    } else {
      const num = normalizedResult.document_number?.trim().replace(/[\s-]/g, '')
      let validFormat = true

      if (normalizedResult.document_type === 'AADHAAR') {
        if (!num || !/^\d{12}$/.test(num)) validFormat = false
      } else if (normalizedResult.document_type === 'PAN') {
        if (!num || !/^[A-Z]{5}\d{4}[A-Z]$/i.test(num)) validFormat = false
      } else if (normalizedResult.document_type === 'PASSPORT') {
        const isIndian = /^[A-Z]\d{7}$/i.test(num)
        const isGeneral = /^[A-Z0-9]{6,12}$/i.test(num)
        if (!num || (!isIndian && !isGeneral)) validFormat = false
      } else if (normalizedResult.document_type === 'DRIVING_LICENSE') {
        const cleanDl = num.replace(/[\s-/]/g, '')
        const modernFormat = /^[A-Z]{2}\d{13}$/i.test(cleanDl)
        const genericFormat = /^[A-Z]{2}[A-Z0-9]{9,15}$/i.test(cleanDl)
        if (!cleanDl || (!modernFormat && !genericFormat)) validFormat = false
      } else if (normalizedResult.document_type === 'VOTER_ID') {
        const cleanVoter = num.replace(/[\s-/]/g, '')
        const modernFormat = /^[A-Z]{3}\d{7}$/i.test(cleanVoter)
        const legacyFormat = /^[A-Z]{2}\/\d{2}\/\d{3}\/\d{6}$/i.test(normalizedResult.document_number?.trim().replace(/[\s]/g, '') || '')
        const genericFormat = /^[A-Z]{2,3}[A-Z0-9]{6,12}$/i.test(cleanVoter)
        if (!cleanVoter || (!modernFormat && !legacyFormat && !genericFormat)) validFormat = false
      }

      if (!validFormat) {
        status = 'MANUAL_REVIEW'
        finalReason = `Document number for ${normalizedResult.document_type || 'ID'} does not match expected format. Saved for manual review.`
      } else {
        if (normalizedResult.confidence >= 0.40) {
          status = 'VERIFIED'
        } else {
          status = 'MANUAL_REVIEW'
          finalReason = 'Image quality too poor or confidence too low. Saved for manual review.'
        }
      }
    }

    // 5. Save to guest_identity (front only, back_image_url will be updated later)
    const supabaseAdmin = createAdminClient()
    const identityRecord = {
      document_type: normalizedResult.document_type || 'UNKNOWN',
      document_number: normalizedResult.document_number,
      full_name: normalizedResult.full_name,
      date_of_birth: normalizedResult.date_of_birth,
      document_confidence: normalizedResult.confidence || 0,
      is_verified: status === 'VERIFIED',
      verification_status: status,
      document_image_url: imageUrl,    // front image
      back_image_url: null,            // will be filled by uploadBackImage
      raw_ocr_text: normalizedResult.raw_ocr_text || aiResponseText || '',
      ocr_json: result,
      verification_reason: finalReason
    }

    console.log(`[VERIFY-FRONT] Inserting identity record. Status: ${status}`)
    const { data: inserted, error: dbError } = await supabaseAdmin
      .from('guest_identity')
      .insert([identityRecord])
      .select('id, verification_status')
      .single()

    if (dbError) {
      console.error('[VERIFY-FRONT] DB Insert failed:', dbError)
      return { success: false, error: 'Database error while saving identity.' }
    }

    return {
      success: true,
      guest_identity_id: inserted.id,
      status: inserted.verification_status,
      reason: finalReason
    }
  } catch (err: any) {
    console.error('[VERIFY-FRONT] Uncaught exception:', err)
    return { success: false, error: 'Internal system error during front ID verification.' }
  }
}

// ─── Action 2: Upload BACK ID → update the existing guest_identity record ──────
export async function uploadBackImage(formData: FormData) {
  console.log('[VERIFY-BACK] Uploading back ID image...')

  try {
    const file = formData.get('image') as File
    const identityId = formData.get('identityId') as string

    if (!file || file.size === 0) return { success: false, error: 'No image provided.' }
    if (!identityId) return { success: false, error: 'No identity ID provided.' }

    // Upload back image to storage
    const backUrl = await uploadToStorage(file, 'temp_verification')
    if (!backUrl) return { success: false, error: 'Failed to upload back image.' }

    // OCR with Gemini for back image
    console.log('[VERIFY-BACK] Analyzing back image with Gemini AI...')
    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    let aiResponseText = '{}'
    try {
      const response = await generateContentWithRetry({
        model: MODEL_NAME,
        contents: [
          BACK_SYSTEM_PROMPT,
          { inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } }
        ],
        config: { temperature: 0.0, responseMimeType: 'application/json' }
      });

      aiResponseText = response?.text || '{}'
    } catch (aiError: any) {
      console.error('[VERIFY-BACK] AI call failed:', aiError)
    }

    const supabaseAdmin = createAdminClient()
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('guest_identity')
      .select('*')
      .eq('id', identityId)
      .single()

    if (fetchError) {
      console.warn('[VERIFY-BACK] Could not fetch existing identity record:', fetchError)
    }

    let address = ''
    let rawOcrTextBack = aiResponseText
    let confidence = 0
    let suspicious = false
    let isGovtId = true
    
    let backFullName = ''
    let backIdNumber = ''
    let backIdType = 'UNKNOWN'
    let backDob = ''

    try {
      const firstBrace = aiResponseText.indexOf('{')
      const lastBrace = aiResponseText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = aiResponseText.substring(firstBrace, lastBrace + 1)
        const result = JSON.parse(jsonStr)
        address = cleanFieldValue(result.address)
        rawOcrTextBack = aiResponseText
        confidence = mapConfidenceToNumeric(result.confidence?.overall)
        suspicious = confidence < 0.40
        isGovtId = mapIdType(result.id_type) !== 'UNKNOWN'

        backFullName = cleanFieldValue(result.full_name || result.fullName || result.name)
        backIdNumber = cleanFieldValue(result.id_number || result.idNumber || result.document_number || result.documentNumber)
        backIdType = mapIdType(result.id_type || result.idType)
        backDob = cleanFieldValue(result.date_of_birth || result.dateOfBirth || result.dob)
      } else {
        console.warn('[VERIFY-BACK] No JSON found in response. Skipping address extraction.')
      }
    } catch (e) {
      console.warn('[VERIFY-BACK] Failed to parse AI JSON response. Skipping address extraction.')
    }

    // We intentionally don't block on back image validation to avoid friction.
    // If it's blurry or unrecognizable, we still save the image.

    // Merge strategy: update the existing guest_identity record with back image, address, and any fields that were missing/empty from the front side.
    const updates: any = { 
      back_image_url: backUrl,
      address: address || (existingRecord ? existingRecord.address : ''),
      raw_ocr_text_back: rawOcrTextBack
    }

    if (existingRecord) {
      if ((!existingRecord.full_name || existingRecord.full_name.trim() === '') && backFullName) {
        updates.full_name = backFullName
      }
      if ((!existingRecord.document_number || existingRecord.document_number.trim() === '') && backIdNumber) {
        updates.document_number = backIdNumber
      }
      if ((!existingRecord.document_type || existingRecord.document_type === 'UNKNOWN') && backIdType !== 'UNKNOWN') {
        updates.document_type = backIdType
      }
      if ((!existingRecord.date_of_birth || existingRecord.date_of_birth.trim() === '') && backDob) {
        updates.date_of_birth = backDob
      }

      // Re-evaluate verification status on combined fields
      const docType = updates.document_type || existingRecord.document_type
      const docNum = updates.document_number || existingRecord.document_number
      const name = updates.full_name || existingRecord.full_name

      if (docType && docType !== 'UNKNOWN' && docNum) {
        const num = docNum.trim().replace(/[\s-]/g, '')
        let validFormat = true

        if (docType === 'AADHAAR') {
          if (!num || !/^\d{12}$/.test(num)) validFormat = false
        } else if (docType === 'PAN') {
          if (!num || !/^[A-Z]{5}\d{4}[A-Z]$/i.test(num)) validFormat = false
        } else if (docType === 'PASSPORT') {
          const isIndian = /^[A-Z]\d{7}$/i.test(num)
          const isGeneral = /^[A-Z0-9]{6,12}$/i.test(num)
          if (!num || (!isIndian && !isGeneral)) validFormat = false
        } else if (docType === 'DRIVING_LICENSE') {
          const cleanDl = num.replace(/[\s-/]/g, '')
          const modernFormat = /^[A-Z]{2}\d{13}$/i.test(cleanDl)
          const genericFormat = /^[A-Z]{2}[A-Z0-9]{9,15}$/i.test(cleanDl)
          if (!cleanDl || (!modernFormat && !genericFormat)) validFormat = false
        } else if (docType === 'VOTER_ID') {
          const cleanVoter = num.replace(/[\s-/]/g, '')
          const modernFormat = /^[A-Z]{3}\d{7}$/i.test(cleanVoter)
          const legacyFormat = /^[A-Z]{2}\/\d{2}\/\d{3}\/\d{6}$/i.test(docNum.trim().replace(/[\s]/g, '') || '')
          const genericFormat = /^[A-Z]{2,3}[A-Z0-9]{6,12}$/i.test(cleanVoter)
          if (!cleanVoter || (!modernFormat && !legacyFormat && !genericFormat)) validFormat = false
        }

        let newStatus = existingRecord.verification_status
        let newReason = existingRecord.verification_reason

        if (!validFormat) {
          newStatus = 'MANUAL_REVIEW'
          newReason = `Document number for ${docType} does not match expected format. Saved for manual review.`
        } else {
          const combinedConfidence = Math.max(Number(existingRecord.document_confidence) || 0, confidence || 0)
          if (combinedConfidence >= 0.40 && name && name.trim() !== '') {
            newStatus = 'VERIFIED'
            newReason = 'Verified via combined front/back OCR.'
          } else {
            newStatus = 'MANUAL_REVIEW'
            newReason = 'Review needed (low confidence or missing name).'
          }
        }

        updates.verification_status = newStatus
        updates.verification_reason = newReason
        updates.is_verified = newStatus === 'VERIFIED'
      }
    }

    const { error } = await supabaseAdmin
      .from('guest_identity')
      .update(updates)
      .eq('id', identityId)

    if (error) {
      console.error('[VERIFY-BACK] Failed to update record:', error)
      return { success: false, error: 'Failed to save back image to database.' }
    }

    console.log('[VERIFY-BACK] Back image saved successfully for identity:', identityId)
    return { success: true, back_image_url: backUrl, address }
  } catch (err: any) {
    console.error('[VERIFY-BACK] Uncaught exception:', err)
    return { success: false, error: 'Internal error during back image upload.' }
  }
}

// Keep old name as alias for backward compatibility
export async function uploadAndVerifyDocument(formData: FormData) {
  return uploadAndVerifyFront(formData)
}
