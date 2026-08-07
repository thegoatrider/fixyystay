'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { GoogleGenAI } from '@google/genai'
import crypto from 'crypto'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL_NAME = 'gemini-2.5-flash'

const EMP_FRONT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_government_id: { type: 'BOOLEAN' },
    document_type: { type: 'STRING' },
    document_number: { type: 'STRING' },
    full_name: { type: 'STRING' },
    date_of_birth: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    suspicious: { type: 'BOOLEAN' },
    reason: { type: 'STRING' },
    raw_ocr_text: { type: 'STRING' }
  },
  required: ['is_government_id']
}

const BACK_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_government_id: { type: 'BOOLEAN' },
    confidence: { type: 'NUMBER' },
    suspicious: { type: 'BOOLEAN' },
    reason: { type: 'STRING' },
    address: { type: 'STRING' },
    raw_ocr_text_back: { type: 'STRING' }
  },
  required: ['is_government_id', 'confidence', 'suspicious', 'address']
}

function safeJsonParse(str: string): any {
  let cleanStr = str.replace(/^```json/gi, '').replace(/```$/g, '').trim()
  const firstBrace = cleanStr.indexOf('{')
  const lastBrace = cleanStr.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found')
  }
  cleanStr = cleanStr.substring(firstBrace, lastBrace + 1)

  try {
    return JSON.parse(cleanStr)
  } catch (e) {
    try {
      const sanitized = cleanStr.replace(/"([^"\\]|\\.)*"/g, (match) => {
        return match
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
      })
      return JSON.parse(sanitized)
    } catch (e2) {
      throw e2
    }
  }
}

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

const SYSTEM_PROMPT = `
You are an expert Government ID verification AI.
Analyze the provided image and extract information strictly in JSON format.

Allowed document_type values: AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID, UNKNOWN.

Rules for abuse detection (set suspicious: true if any are met):
- It is a selfie, meme, cartoon, or random picture.
- It is clearly a handwritten note or forged text.
- It only contains random numbers without the structural layout of a real ID.

Guidelines for cropped digital layouts and photographed physical cards:
- Direct screenshots of digital IDs, electronic card printouts (like PDF e-Aadhaar downloads), cropped electronic documents, or DigiLocker cards are COMPLETELY VALID government IDs. Do NOT flag them as suspicious or as "photo of a screen" just because they are clean digital images.
- Laminated physical cards photographed under ambient light often have reflection, glare, or a visible desk/hand background. This is standard physical photography. Do NOT flag them as suspicious or as a "photo of a screen" unless you literally see the bezel and screen pixels of another phone or computer monitor displaying the card.
- If the document is valid and the text is legible and readable, set the confidence to at least 0.85. Only set confidence below 0.50 if the text is completely unreadable, blurry beyond recognition, or obviously fake.

Calculate confidence score (0.0 to 1.0):
- 0.80-1.0: Good clarity, standard format matches, text is legible.
- 0.50-0.79: Blurry or lower quality but recognisable and text is mostly legible.
- Below 0.50: Unrecognisable, blank, or obviously fake.

Return STRICTLY this JSON (no markdown, just raw JSON):
{
  "is_government_id": boolean,
  "document_type": string,
  "document_number": string,
  "full_name": string,
  "date_of_birth": string,
  "confidence": number,
  "suspicious": boolean,
  "reason": string,
  "raw_ocr_text": string
}
`

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
        
        if (response?.usageMetadata) {
          const usage = response.usageMetadata;
          console.log(`[GEMINI-USAGE] Model: ${model}. Input Tokens: ${usage.promptTokenCount}, Output Tokens: ${usage.candidatesTokenCount}, Total: ${usage.totalTokenCount}`);
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || String(error);
        console.warn(`[GEMINI] Model ${model} attempt ${i + 1} failed:`, errMsg);

        const isRateLimit = errMsg.includes('429') || errMsg.includes('TooManyRequests') || errMsg.includes('Quota');
        const isServerError = errMsg.includes('500') || errMsg.includes('503') || errMsg.includes('Unavailable');
        const isTimeout = errMsg === 'AI_TIMEOUT';

        const shouldRetry = isRateLimit || isServerError || isTimeout;
        if (!shouldRetry) {
          console.log(`[GEMINI] Non-retryable error: ${errMsg}. Proceeding to next model.`);
          break;
        }

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

async function uploadToStorage(file: File, folder: string): Promise<string | null> {
  const admin = createAdminClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await admin.storage
    .from('property_images')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' })
  if (error) { console.error('[EMP-VERIFY] Upload failed:', error); return null }
  const { data } = admin.storage.from('property_images').getPublicUrl(path)
  return data.publicUrl
}

// ─── Action 1: Upload front ID → OCR → return extracted data ─────────────────
export async function verifyEmployeeFrontId(formData: FormData) {
  try {
    const file = formData.get('image') as File
    if (!file || file.size === 0) return { success: false, error: 'No image provided.' }

    // Hash file
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log(`[EMP-VERIFY-FRONT] File size: ${fileBuffer.length} bytes, SHA-256: ${imageHash}`)

    // 1. Cache Check
    const cachedResult = await getCachedOcr(imageHash)

    // Upload
    const frontUrl = await uploadToStorage(file, 'employee_ids')
    if (!frontUrl) return { success: false, error: 'Failed to upload image.' }

    let result: any = null
    let aiText = '{}'
    let isFromCache = false

    if (cachedResult) {
      result = cachedResult
      aiText = JSON.stringify(cachedResult)
      isFromCache = true
      console.log('[EMP-VERIFY-FRONT] Using cached OCR result.')
    } else {
      console.log('[EMP-VERIFY-FRONT] Cache MISS. Calling Gemini AI...')
      // Request deduplication
      let activePromise = inFlightRequests.get(imageHash)
      if (!activePromise) {
        activePromise = (async () => {
          const base64 = fileBuffer.toString('base64')
          const res = await generateContentWithRetry({
            contents: [{
              role: 'user',
              parts: [{ inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } }]
            }],
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.0,
              responseMimeType: 'application/json',
              maxOutputTokens: 1500
            }
          })
          return res?.text || '{}'
        })()

        inFlightRequests.set(imageHash, activePromise)
        activePromise.finally(() => inFlightRequests.delete(imageHash))
      } else {
        console.log('[EMP-VERIFY-FRONT] Coalescing identical concurrent request...')
      }

      try {
        aiText = await activePromise
      } catch (err: any) {
        console.error('[EMP-VERIFY] Gemini error:', err)
        aiText = `GEMINI_FAILED: ${err.message || String(err)}`
      }

      if (aiText.startsWith('GEMINI_FAILED')) {
        const status = 'MANUAL_REVIEW'
        const reason = `AI offline (${aiText.replace('GEMINI_FAILED: ', '')}), saved for manual review.`
        return {
          success: true,
          status,
          reason,
          frontUrl,
          extracted: {
            full_name:       'Employee (Manual Review)',
            date_of_birth:   '01/01/1990',
            document_type:   'UNKNOWN',
            document_number: 'PENDING_REVIEW',
            confidence:      0,
            raw_ocr_text:    '',
            ocr_json:        {}
          }
        }
      }

      // Parse
      let parseFailed = false
      try {
        result = safeJsonParse(aiText)
      } catch {
        parseFailed = true
        result = { is_government_id: false, document_type: 'UNKNOWN', confidence: 0, suspicious: true, reason: 'Parse error', raw_ocr_text: '' }
      }

      // Cache
      if (!parseFailed && result && result.is_government_id !== false) {
        await saveCachedOcr(imageHash, result, result.document_type || 'UNKNOWN')
      }
    }

    // Validate
    let status = 'VERIFIED'
    let reason = result.reason || ''

    if (result.is_government_id === false) {
      status = 'FAILED'
      reason = result.reason || 'Not a valid government ID.'
    } else {
      const num = (result.document_number || '').trim().replace(/\s/g, '')
      let validFormat = true
      if (result.document_type === 'AADHAAR' && (!/^\d{12}$/.test(num))) validFormat = false
      if (result.document_type === 'PAN'    && (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(num))) validFormat = false

      const isHighQuality = !result.suspicious && result.confidence >= 0.50

      if (!validFormat || !isHighQuality || result.document_type === 'UNKNOWN') {
        status = 'MANUAL_REVIEW'
        reason = !isHighQuality 
          ? 'Image text is blurry or low confidence. Saved for manual review.' 
          : (!validFormat ? 'Document number format is invalid. Saved for manual review.' : 'Document type unrecognized. Saved for manual review.')
      }
    }

    return {
      success: true,
      status,
      reason,
      frontUrl,
      extracted: {
        full_name:       result.full_name       || '',
        date_of_birth:   result.date_of_birth   || '',
        document_type:   result.document_type   || 'UNKNOWN',
        document_number: result.document_number || '',
        confidence:      result.confidence      || 0,
        raw_ocr_text:    result.raw_ocr_text    || '',
        ocr_json:        result
      }
    }
  } catch (err: any) {
    console.error('[EMP-VERIFY] Uncaught:', err)
    return { success: false, error: 'Internal error during verification.' }
  }
}

// ─── Action 2: Upload back ID → run OCR → just store URL & address ────────────
export async function uploadEmployeeBackId(formData: FormData) {
  try {
    const file = formData.get('image') as File
    if (!file || file.size === 0) return { success: false, error: 'No image provided.' }

    // Hash file
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log(`[EMP-VERIFY-BACK] File size: ${fileBuffer.length} bytes, SHA-256: ${imageHash}`)

    // 1. Cache Check
    const cachedResult = await getCachedOcr(imageHash)

    const backUrl = await uploadToStorage(file, 'employee_ids')
    if (!backUrl) return { success: false, error: 'Upload failed.' }

    let resultParsed: any = null
    let aiText = '{}'
    let isFromCache = false

    if (cachedResult) {
      resultParsed = cachedResult
      aiText = JSON.stringify(cachedResult)
      isFromCache = true
      console.log('[EMP-VERIFY-BACK] Using cached OCR result.')
    } else {
      console.log('[EMP-VERIFY-BACK] Cache MISS. Calling Gemini AI...')
      // Request deduplication
      let activePromise = inFlightRequests.get(imageHash)
      if (!activePromise) {
        activePromise = (async () => {
          const base64 = fileBuffer.toString('base64')
          const res = await generateContentWithRetry({
            contents: [{
              role: 'user',
              parts: [{ inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } }]
            }],
            config: {
              systemInstruction: BACK_SYSTEM_PROMPT,
              temperature: 0.0,
              responseMimeType: 'application/json',
              maxOutputTokens: 1500
            }
          })
          return res?.text || '{}'
        })()

        inFlightRequests.set(imageHash, activePromise)
        activePromise.finally(() => inFlightRequests.delete(imageHash))
      } else {
        console.log('[EMP-VERIFY-BACK] Coalescing identical concurrent request...')
      }

      try {
        aiText = await activePromise
       } catch (err: any) {
        console.error('[EMP-VERIFY] Gemini error for back image:', err)
        aiText = `GEMINI_FAILED: ${err.message || String(err)}`
      }
    }

    if (aiText.startsWith('GEMINI_FAILED')) {
      return { success: true, backUrl, address: 'Pending manual review', raw_ocr_text_back: '' }
    }

    let address = ''
    let rawOcrTextBack = aiText
    let confidence = 0
    let suspicious = false
    let isGovtId = true

    if (isFromCache) {
      address = resultParsed.address || ''
      rawOcrTextBack = resultParsed.raw_ocr_text_back || aiText
      confidence = resultParsed.confidence || 0
      suspicious = resultParsed.suspicious || false
      isGovtId = resultParsed.is_government_id !== false
    } else {
      try {
        const parsed = safeJsonParse(aiText)
        address = parsed.address || ''
        rawOcrTextBack = parsed.raw_ocr_text_back || aiText
        confidence = parsed.confidence || 0
        suspicious = parsed.suspicious || false
        isGovtId = parsed.is_government_id !== false
        
        // Cache
        if (parsed && parsed.is_government_id !== false) {
          await saveCachedOcr(imageHash, parsed, 'EMPLOYEE_BACK')
        }
      } catch (e) {
        console.warn('[EMP-VERIFY] Failed to parse AI JSON response for back image.')
        return { success: true, backUrl, address: 'Pending manual review', raw_ocr_text_back: '' }
      }
    }

    if (suspicious || !isGovtId || confidence < 0.50) {
      return { success: true, backUrl, address: 'Pending manual review', raw_ocr_text_back: rawOcrTextBack }
    }

    return { success: true, backUrl, address, raw_ocr_text_back: rawOcrTextBack }
  } catch (err: any) {
    return { success: false, error: 'Internal error during back image upload.' }
  }
}
