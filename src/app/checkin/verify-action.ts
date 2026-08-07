'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { GoogleGenAI } from '@google/genai'
import crypto from 'crypto'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL_NAME = 'gemini-2.0-flash'

// Global map for in-flight requests to deduplicate concurrent uploads of identical files
const inFlightRequests = new Map<string, Promise<any>>();

async function getCachedOcr(imageHash: string): Promise<any | null> {
  try {
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from('ocr_cache')
      .select('ocr_json')
      .eq('image_hash', imageHash)
      .maybeSingle()

    if (error) {
      console.error('[CACHE-DB] Error querying OCR cache:', error)
      return null
    }
    
    if (data) {
      console.log(`[CACHE-DB] Cache HIT for image hash: ${imageHash}`)
      return data.ocr_json
    }
  } catch (e) {
    console.error('[CACHE-DB] Failed to query cache:', e)
  }
  return null
}

async function saveCachedOcr(imageHash: string, ocrJson: any, docType: string): Promise<void> {
  try {
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('ocr_cache')
      .insert([{
        image_hash: imageHash,
        ocr_json: ocrJson,
        document_type: docType
      }])

    if (error) {
      console.error('[CACHE-DB] Error saving to OCR cache:', error)
    } else {
      console.log(`[CACHE-DB] Cache SAVED for image hash: ${imageHash}`)
    }
  } catch (e) {
    console.error('[CACHE-DB] Failed to save cache:', e)
  }
}

const OCR_PROMPT = `
You are a strict government ID verification engine. Your FIRST task is to determine whether the uploaded image is a genuine, government-issued identity document. You must REJECT any image that is not a government ID.

STEP 1 — DOCUMENT CLASSIFICATION (mandatory, do this first):
Examine the image carefully. A valid government ID must:
- Be an official identity document issued by a government authority.
- Contain at least TWO of: a person's name, a unique ID number, a date of birth or expiry, and an official emblem/logo.
- Be one of these accepted types: Aadhaar Card, PAN Card, Passport, Voter ID / EPIC Card, Driving Licence.

REJECT the image (set is_government_id: false) if it is any of the following:
- A selfie, portrait, or photo of a person without an ID document.
- A random photograph (nature, objects, food, buildings, etc.).
- A screenshot of a website, app, or digital content.
- A business card, loyalty card, gym card, or any non-government card.
- A receipt, invoice, bill, or any financial document.
- A bank statement, utility bill, or address proof only (without photo ID).
- A blank image, solid colour, or image with no readable text.
- Anything that does not look like an official government-issued photo ID.

STEP 2 — EXTRACTION (only if STEP 1 passes):
If and only if the image IS a government ID, extract the following fields using these strict rules:
- full_name: Extract the full name of the person. Do not miss it.
- id_number: Extract the unique ID number. If it is a masked Aadhaar card (e.g. showing 'xxxx xxxx 1234' or 'XXXX-XXXX-5678'), extract it exactly as printed. If the number is partially blacked out or masked, extract the visible last 4 digits (e.g., 'XXXX-XXXX-1234' or '1234'). If it cannot be read at all, return null.
- date_of_birth: Extract the date of birth (DOB) or year of birth (YOB) (e.g. 'DD/MM/YYYY' or 'YYYY').
- address: Extract the full address if present (this is usually on the back side of the card). Look for labels like 'Address', 'S/O', 'D/O', 'W/O', 'C/O'.
- gender: Extract the gender (Male/Female/Transgender). Look for labels like 'Gender', 'Sex', 'MALE', 'FEMALE', 'M/F', or symbols.
- expiry_date: Extract the expiry date of the document if present.

JSON Output structure:
{
  "is_government_id": true,
  "rejection_reason": null,
  "full_name": "",
  "date_of_birth": "",
  "id_number": "",
  "id_type": "Aadhaar | PAN | Passport | Voter ID | Driving Licence",
  "address": "",
  "gender": "",
  "expiry_date": "",
  "confidence": {
    "overall": "high | medium | low",
    "notes": "any field-level uncertainty notes here"
  }
}

If the image is NOT a government ID, return ONLY this JSON and nothing else:
{
  "is_government_id": false,
  "rejection_reason": "<one sentence describing why this image was rejected, e.g. 'This appears to be a selfie, not a government ID.' or 'This is a random photograph, not an identity document.'"
}

FALLBACK BEHAVIOR (only when is_government_id is true):
- If a field cannot be read at all: use null.
- If text is partially readable: extract the readable portion and add "[partial]" suffix.
- If you are guessing: add "[inferred]" suffix to that field's value.

Return ONLY the JSON. No explanations, no preamble, no markdown.
`

const SYSTEM_PROMPT = OCR_PROMPT

const BACK_SYSTEM_PROMPT = `
You are an expert Government ID verification AI.
Analyze the back side of the provided ID image and extract information strictly in JSON format.
Your task is to identify and extract the address.

Guidelines for cropped digital layouts and photographed physical cards:
- Cropped electronic back-sides, screenshots of electronic documents, or DigiLocker cards are COMPLETELY VALID. Do NOT flag them as suspicious or as "photo of a screen" just because they are clean digital images.
- Laminated physical cards photographed under ambient light often have reflection, glare, or a visible desk/hand background. This is standard physical photography. Do NOT flag them as suspicious or as a "photo of a screen" unless you literally see the bezel and screen pixels of another phone or computer monitor displaying the card.
- If the document is valid and the text/address is legible, set the confidence to at least 0.85. Only set confidence below 0.50 if it is completely unreadable or blurry beyond recognition.

Return STRICTLY this JSON (no markdown, just raw JSON):
{
  "is_government_id": boolean,
  "confidence": number,
  "suspicious": boolean,
  "reason": string,
  "address": string,
  "raw_ocr_text_back": string
}

Rules for abuse detection (set suspicious: true if any are met):
- It is a selfie, meme, cartoon, or random picture.
- It is clearly a handwritten note or forged text.

Calculate confidence score (0.0 to 1.0) based on how clear and readable the text is.
If a field cannot be read, use empty string "".
`

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

// ─── Helper: Retry wrapper for Gemini API with model fallbacks to prevent failures ────────
async function generateContentWithRetry(contents: any, maxRetries = 2) {
  const modelsToTry = [
    MODEL_NAME,
    'gemini-1.5-flash'
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[GEMINI] Attempting content generation with model: ${model} (attempt ${i + 1}/${maxRetries})...`)
        const generatePromise = ai.models.generateContent({
          ...contents,
          model: model
        });
        
        // Timeout after 15 seconds
        let timeoutId: any;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('AI_TIMEOUT')), 15000);
        });
        
        let response: any;
        try {
          response = await Promise.race([generatePromise, timeoutPromise]);
          clearTimeout(timeoutId);
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
        
        // Log token usage!
        if (response?.usageMetadata) {
          const usage = response.usageMetadata;
          console.log(`[GEMINI-USAGE] Model: ${model}. Input Tokens: ${usage.promptTokenCount}, Output Tokens: ${usage.candidatesTokenCount}, Total: ${usage.totalTokenCount}`);
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || String(error);
        console.warn(`[GEMINI] Model ${model} attempt ${i + 1} failed:`, errMsg);

        // Determine if we should retry this error
        const isRateLimit = errMsg.includes('429') || errMsg.includes('TooManyRequests') || errMsg.includes('Quota');
        const isServerError = errMsg.includes('500') || errMsg.includes('503') || errMsg.includes('Unavailable');
        const isTimeout = errMsg === 'AI_TIMEOUT';

        const shouldRetry = isRateLimit || isServerError || isTimeout;
        if (!shouldRetry) {
          console.log(`[GEMINI] Non-retryable error: ${errMsg}. Failing immediately.`);
          throw error;
        }

        // If it's a rate limit or server error, wait with exponential backoff
        if (i < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, i);
          console.log(`[GEMINI] Retryable error. Waiting ${delay}ms before next attempt.`);
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// ─── Action 1: Upload FRONT ID → run OCR → create guest_identity record ────────
export async function uploadAndVerifyFront(formData: FormData) {
  console.log('[VERIFY-FRONT] Starting front ID verification...')

  try {
    const file = formData.get('image') as File
    if (!file || file.size === 0) return { success: false, error: 'No image provided.' }

    // Calculate SHA-256 hash of image file
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log(`[VERIFY-FRONT] File size: ${fileBuffer.length} bytes, SHA-256: ${imageHash}`)

    // 1. Check persistent cache
    const cachedResult = await getCachedOcr(imageHash)

    // 2. Upload front image to storage (we always do this so we have the public URL)
    const imageUrl = await uploadToStorage(file, 'temp_verification')
    if (!imageUrl) return { success: false, error: 'Failed to upload front image.' }

    let result: any = null
    let aiResponseText = '{}'
    let aiUnavailableError = ''
    let isFromCache = false

    if (cachedResult) {
      result = cachedResult
      aiResponseText = JSON.stringify(cachedResult)
      isFromCache = true
      console.log('[VERIFY-FRONT] Using cached OCR result.')
    } else {
      console.log('[VERIFY-FRONT] Cache MISS. Calling Gemini AI...')
      // Request deduplication
      let activePromise = inFlightRequests.get(imageHash)
      if (!activePromise) {
        activePromise = (async () => {
          const base64Data = fileBuffer.toString('base64')
          const response = await generateContentWithRetry({
            contents: [
              {
                role: 'user',
                parts: [{ inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } }]
              }
            ],
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.0,
              responseMimeType: 'application/json',
              maxOutputTokens: 600
            }
          });
          return response?.text || '{}';
        })();

        inFlightRequests.set(imageHash, activePromise)
        activePromise.finally(() => inFlightRequests.delete(imageHash))
      } else {
        console.log('[VERIFY-FRONT] Coalescing identical concurrent request...')
      }

      try {
        aiResponseText = await activePromise
      } catch (aiError: any) {
        console.error('[VERIFY-FRONT] AI call failed:', aiError)
        if (aiError.message === 'AI_TIMEOUT') {
          aiUnavailableError = 'Scanning timed out. Please try again with a clearer, well-lit image.'
        } else {
          aiUnavailableError = 'AI verification service temporarily unavailable. Please try again.'
        }
      }
    }

    // 3. Parse JSON
    let resultParsed: any = {}
    let parseFailed = false
    
    if (aiUnavailableError) {
      // Bypassed or failed: Save to guest_identity directly as MANUAL_REVIEW
      const status = 'MANUAL_REVIEW'
      const finalReason = `AI Offline: ${aiUnavailableError}. Saved for manual review.`;

      const supabaseAdmin = createAdminClient()
      const identityRecord = {
        document_type: 'UNKNOWN',
        document_number: 'PENDING_REVIEW',
        full_name: 'Guest (Manual Review)',
        date_of_birth: '01/01/1990',
        document_confidence: 0,
        is_verified: true,
        verification_status: status,
        document_image_url: imageUrl,    // front image
        back_image_url: null,
        raw_ocr_text: '',
        ocr_json: {},
        verification_reason: finalReason
      }

      console.log(`[VERIFY-FRONT] Bypassed/Failed. Saving for manual review. Status: ${status}`)
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
    } else if (isFromCache) {
      resultParsed = result
    } else {
      try {
        resultParsed = JSON.parse(aiResponseText.replace(/^```json/gi, '').replace(/```$/g, '').trim())
      } catch {
        try {
          const firstBrace = aiResponseText.indexOf('{')
          const lastBrace = aiResponseText.lastIndexOf('}')
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            resultParsed = JSON.parse(aiResponseText.substring(firstBrace, lastBrace + 1))
          } else {
            throw new Error('No JSON object found')
          }
        } catch (fallbackErr) {
          parseFailed = true
          resultParsed = { 
            is_government_id: false, 
            document_type: 'UNKNOWN', 
            confidence: 0, 
            suspicious: false, 
            reason: 'AI could not format data correctly. Manual review required.', 
            raw_ocr_text: aiResponseText 
          }
        }
      }

      // Save to cache if it was newly fetched and parsed successfully
      if (!parseFailed && resultParsed && resultParsed.is_government_id !== false) {
        await saveCachedOcr(imageHash, resultParsed, resultParsed.id_type || 'UNKNOWN')
      }
    }

    result = resultParsed

    // 3.5 Normalize and map the fields if parsing succeeded
    let normalizedResult: any = {}
    if (parseFailed) {
      normalizedResult = result
    } else {
      // If the AI explicitly flagged is_government_id: false, propagate that immediately
      if (result.is_government_id === false) {
        normalizedResult = {
          is_government_id: false,
          rejection_reason: result.rejection_reason || null,
          document_type: 'UNKNOWN',
          document_number: '',
          full_name: '',
          date_of_birth: '',
          confidence: 0,
          suspicious: true,
          reason: result.rejection_reason || '',
          raw_ocr_text: aiResponseText
        }
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
          rejection_reason: null,
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
    }

    console.log('[VERIFY-FRONT] AI Result:', normalizedResult.document_type, 'Confidence:', normalizedResult.confidence)

    // 4. Validation and strict rejection
    if (parseFailed) {
      return { 
        success: false, 
        error: normalizedResult.reason || 'AI verification service temporarily unavailable or timed out. Please try again with a clearer, well-lit image.' 
      }
    }

    if (normalizedResult.is_government_id === false) {
      const rejectionMsg = normalizedResult.rejection_reason ||
        'This does not appear to be a government-issued ID. Please upload a valid document such as Aadhaar, PAN, Passport, Voter ID, or Driving Licence.'
      return { success: false, error: rejectionMsg }
    }

    if (normalizedResult.document_type === 'UNKNOWN') {
      return { 
        success: false, 
        error: 'The document type could not be recognized. Please upload a valid government ID (Aadhaar, PAN, Passport, Voter ID, or Driving Licence).' 
      }
    }

    if (!normalizedResult.full_name || normalizedResult.full_name.trim() === '') {
      return { 
        success: false, 
        error: 'Could not extract your name from the ID. Please ensure the front side is completely visible, glare-free, and try again.' 
      }
    }

    if (!normalizedResult.date_of_birth || normalizedResult.date_of_birth.trim() === '') {
      return { 
        success: false, 
        error: 'Could not extract your date of birth from the ID. Please ensure your date of birth is clearly visible on the document.' 
      }
    }

    const docNumStr = normalizedResult.document_number || '';
    const cleanNum = docNumStr.trim().replace(/[\s-]/g, '');

    if (normalizedResult.document_type !== 'AADHAAR') {
      if (!docNumStr || docNumStr.trim() === '') {
        return { 
          success: false, 
          error: `Could not extract the document number from your ${normalizedResult.document_type || 'ID'}. Please ensure the number is clearly visible.` 
        }
      }
    }

    if (normalizedResult.suspicious || normalizedResult.confidence < 0.40) {
      return { 
        success: false, 
        error: 'Image quality is too poor or text is blurry. Please upload a sharper, glare-free photo of your ID.' 
      }
    }

    let validFormat = true

    if (normalizedResult.document_type === 'AADHAAR') {
      // Accept 12 digits, masked formats (with x, X, *), 4 digits (last 4), or empty
      const is12Digit = /^\d{12}$/.test(cleanNum)
      const isMasked = /^[xX*\d]{12}$/.test(cleanNum) && /[xX*]/.test(cleanNum)
      const isLast4 = /^\d{4}$/.test(cleanNum)
      const isEmpty = cleanNum === ''
      
      if (!is12Digit && !isMasked && !isLast4 && !isEmpty) {
        validFormat = false
      }
    } else if (normalizedResult.document_type === 'PAN') {
      if (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(cleanNum)) validFormat = false
    } else if (normalizedResult.document_type === 'PASSPORT') {
      const isIndian = /^[A-Z]\d{7}$/i.test(cleanNum)
      const isGeneral = /^[A-Z0-9]{6,12}$/i.test(cleanNum)
      if (!isIndian && !isGeneral) validFormat = false
    } else if (normalizedResult.document_type === 'DRIVING_LICENSE') {
      const cleanDl = cleanNum.replace(/[\s-/]/g, '')
      const modernFormat = /^[A-Z]{2}\d{13}$/i.test(cleanDl)
      const genericFormat = /^[A-Z]{2}[A-Z0-9]{9,15}$/i.test(cleanDl)
      if (!modernFormat && !genericFormat) validFormat = false
    } else if (normalizedResult.document_type === 'VOTER_ID') {
      const cleanVoter = cleanNum.replace(/[\s-/]/g, '')
      const modernFormat = /^[A-Z]{3}\d{7}$/i.test(cleanVoter)
      const legacyFormat = /^[A-Z]{2}\/\d{2}\/\d{3}\/\d{6}$/i.test(docNumStr.trim().replace(/[\s]/g, '') || '')
      const genericFormat = /^[A-Z]{2,3}[A-Z0-9]{6,12}$/i.test(cleanVoter)
      if (!modernFormat && !legacyFormat && !genericFormat) validFormat = false
    }

    if (!validFormat) {
      return {
        success: false,
        error: `The extracted ${normalizedResult.document_type || 'ID'} number "${normalizedResult.document_number}" does not match the expected format. Please ensure the card is clear and fully visible.`
      }
    }

    // If we passed all checks, the status is VERIFIED
    const status = 'VERIFIED'
    const finalReason = 'Verified via automated OCR scan.'

    // 5. Save to guest_identity (front only, back_image_url will be updated later)
    const supabaseAdmin = createAdminClient()
    const identityRecord = {
      document_type: normalizedResult.document_type || 'UNKNOWN',
      document_number: normalizedResult.document_number,
      full_name: normalizedResult.full_name,
      date_of_birth: normalizedResult.date_of_birth,
      document_confidence: normalizedResult.confidence || 0,
      is_verified: true,
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

    // Calculate SHA-256 hash of back image file
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log(`[VERIFY-BACK] File size: ${fileBuffer.length} bytes, SHA-256: ${imageHash}`)

    // 1. Check persistent cache
    const cachedResult = await getCachedOcr(imageHash)

    // Upload back image to storage
    const backUrl = await uploadToStorage(file, 'temp_verification')
    if (!backUrl) return { success: false, error: 'Failed to upload back image.' }

    let result: any = null
    let aiResponseText = '{}'
    let aiUnavailableError = ''
    let isFromCache = false

    if (cachedResult) {
      result = cachedResult
      aiResponseText = JSON.stringify(cachedResult)
      isFromCache = true
      console.log('[VERIFY-BACK] Using cached OCR result.')
    } else {
      console.log('[VERIFY-BACK] Cache MISS. Calling Gemini AI...')
      // Request deduplication
      let activePromise = inFlightRequests.get(imageHash)
      if (!activePromise) {
        activePromise = (async () => {
          const base64Data = fileBuffer.toString('base64')
          const response = await generateContentWithRetry({
            contents: [
              {
                role: 'user',
                parts: [{ inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } }]
              }
            ],
            config: {
              systemInstruction: BACK_SYSTEM_PROMPT,
              temperature: 0.0,
              responseMimeType: 'application/json',
              maxOutputTokens: 600
            }
          });
          return response?.text || '{}';
        })();

        inFlightRequests.set(imageHash, activePromise)
        activePromise.finally(() => inFlightRequests.delete(imageHash))
      } else {
        console.log('[VERIFY-BACK] Coalescing identical concurrent request...')
      }

      try {
        aiResponseText = await activePromise
      } catch (aiError: any) {
        console.error('[VERIFY-BACK] AI call failed:', aiError)
        if (aiError.message === 'AI_TIMEOUT') {
          aiUnavailableError = 'Back side scanning timed out. Please try again with a clearer image.'
        } else {
          aiUnavailableError = 'AI verification service temporarily unavailable. Please try again.'
        }
      }
    }

    if (aiUnavailableError) {
      const supabaseAdmin = createAdminClient()
      const { error: updateError } = await supabaseAdmin
        .from('guest_identity')
        .update({ back_image_url: backUrl })
        .eq('id', identityId)

      if (updateError) {
        console.error('[VERIFY-BACK] DB update failed:', updateError)
      }

      return { success: true, backUrl, address: 'Pending manual review', raw_ocr_text_back: '' }
    }

    if (!isFromCache) {
      let parseFailed = false
      try {
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
        }
      }

      if (parseFailed) {
        return { success: false, error: 'AI could not read the back side image. Please ensure the image is clear and try again.' }
      }

      // Cache it!
      if (result && result.is_government_id !== false) {
        await saveCachedOcr(imageHash, result, result.id_type || 'UNKNOWN')
      }
    }

    if (result.is_government_id === false) {
      return {
        success: false,
        error: result.rejection_reason || 'This back side image does not appear to be a valid government ID. Please upload the back side of your ID.'
      }
    }

    const supabaseAdmin = createAdminClient()
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('guest_identity')
      .select('*')
      .eq('id', identityId)
      .single()

    if (fetchError || !existingRecord) {
      console.warn('[VERIFY-BACK] Could not fetch existing identity record:', fetchError)
      return { success: false, error: 'Could not find the corresponding front ID record. Please upload the front ID first.' }
    }

    const backIdType = mapIdType(result.id_type || result.idType)
    const frontIdType = existingRecord.document_type

    if (backIdType !== 'UNKNOWN' && frontIdType !== 'UNKNOWN' && backIdType !== frontIdType) {
      return {
        success: false,
        error: `The back side document type (${backIdType}) does not match the front side document type (${frontIdType}). Please upload the back side of the same ID.`
      }
    }

    const backIdNumber = cleanFieldValue(result.id_number || result.idNumber || result.document_number || result.documentNumber)
    if (backIdNumber && existingRecord.document_number) {
      const cleanBackNum = backIdNumber.trim().replace(/[\s-]/g, '')
      const cleanFrontNum = existingRecord.document_number.trim().replace(/[\s-]/g, '')
      
      const getDigitsOnly = (s: string) => s.replace(/\D/g, '')
      const digitsBack = getDigitsOnly(cleanBackNum)
      const digitsFront = getDigitsOnly(cleanFrontNum)

      if (digitsBack && digitsFront) {
        if (digitsBack.length === 12 && digitsFront.length === 12 && digitsBack !== digitsFront) {
          return {
            success: false,
            error: 'The Aadhaar number on the back side does not match the front side. Please upload the back side of the same ID.'
          }
        }
        
        const last4Back = digitsBack.slice(-4)
        const last4Front = digitsFront.slice(-4)
        if (last4Back.length === 4 && last4Front.length === 4 && last4Back !== last4Front) {
          return {
            success: false,
            error: 'The document number on the back side does not match the front side. Please upload the back side of the same ID.'
          }
        }
      }
    }

    const confidence = mapConfidenceToNumeric(result.confidence?.overall || (result.confidence && typeof result.confidence === 'string' ? result.confidence : 'medium'))
    if (confidence < 0.40) {
      return {
        success: false,
        error: 'The back side image quality is too poor or text is blurry. Please upload a sharper, glare-free photo.'
      }
    }

    const address = cleanFieldValue(result.address)
    if (frontIdType !== 'PAN') {
      if (!address || address.trim() === '') {
        return {
          success: false,
          error: 'Could not extract the address from the back side of your ID. Please ensure the address text is clear, glare-free, and try again.'
        }
      }
    }

    const updates: any = { 
      back_image_url: backUrl,
      address: address || existingRecord.address,
      raw_ocr_text_back: aiResponseText,
      verification_status: 'VERIFIED',
      is_verified: true
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

// ─── Action 3: Upload Register Page → run handwritten OCR via Gemini ────────
export async function verifyRegisterOCR(formData: FormData) {
  console.log('[VERIFY-REGISTER-OCR] Starting register page OCR...')

  try {
    const file = formData.get('image') as File
    if (!file || file.size === 0) return { success: false, error: 'No image provided.' }

    // Calculate SHA-256 hash of register image file
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log(`[VERIFY-REGISTER-OCR] File size: ${fileBuffer.length} bytes, SHA-256: ${imageHash}`)

    // 1. Check persistent cache
    const cachedResult = await getCachedOcr(imageHash)

    // Upload register page image to storage
    const imageUrl = await uploadToStorage(file, 'temp_registers')
    if (!imageUrl) return { success: false, error: 'Failed to upload register image.' }

    const prompt = `Extract handwritten guest records. Return ONLY JSON:
{
  "guests": [
    {
      "guest_name": "Name",
      "mobile_number": "10-digit number or null",
      "id_type": "Aadhaar Card | Driving Licence | Voter ID | Passport | Other | None",
      "id_number": "ID or null",
      "checkin_date": "YYYY-MM-DD",
      "checkout_date": "YYYY-MM-DD or null",
      "confidence": "high | medium | low",
      "uncertain_fields": ["field_name"]
    }
  ]
}`;

    let result: any = null
    let aiResponseText = '{}'
    let aiUnavailableError = ''
    let isFromCache = false

    if (cachedResult) {
      result = cachedResult
      aiResponseText = JSON.stringify(cachedResult)
      isFromCache = true
      console.log('[VERIFY-REGISTER-OCR] Using cached OCR result.')
    } else {
      console.log('[VERIFY-REGISTER-OCR] Cache MISS. Calling Gemini AI...')
      // Request deduplication
      let activePromise = inFlightRequests.get(imageHash)
      if (!activePromise) {
        activePromise = (async () => {
          const base64Data = fileBuffer.toString('base64')
          const response = await generateContentWithRetry({
            contents: [
              {
                role: 'user',
                parts: [{ inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } }]
              }
            ],
            config: {
              systemInstruction: prompt,
              temperature: 0.0,
              responseMimeType: 'application/json',
              maxOutputTokens: 1500
            }
          });
          return response?.text || '{}';
        })();

        inFlightRequests.set(imageHash, activePromise)
        activePromise.finally(() => inFlightRequests.delete(imageHash))
      } else {
        console.log('[VERIFY-REGISTER-OCR] Coalescing identical concurrent request...')
      }

      try {
        aiResponseText = await activePromise
      } catch (aiError: any) {
        console.error('[VERIFY-REGISTER-OCR] AI call failed:', aiError)
        if (aiError.message === 'AI_TIMEOUT') {
          aiUnavailableError = 'Scanning timed out. Please try again with a clearer, well-lit image.'
        } else {
          aiUnavailableError = 'AI verification service temporarily unavailable. Please try again.'
        }
      }
    }

    if (aiUnavailableError) {
      return { success: false, error: aiUnavailableError }
    }

    if (!isFromCache) {
      try {
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
          return { success: false, error: 'AI could not format register data correctly. Please upload a clearer image.' }
        }
      }

      // Cache it!
      if (result && result.guests && result.guests.length > 0) {
        await saveCachedOcr(imageHash, result, 'REGISTER')
      }
    }

    const guests = result.guests || []
    return {
      success: true,
      imageUrl,
      guests
    }
  } catch (err: any) {
    console.error('[VERIFY-REGISTER-OCR] Uncaught exception:', err)
    return { success: false, error: 'Internal system error during register OCR.' }
  }
}

