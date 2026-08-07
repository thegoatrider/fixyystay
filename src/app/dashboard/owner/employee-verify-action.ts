'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { GoogleGenAI } from '@google/genai'
import crypto from 'crypto'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL_NAME = 'gemini-2.5-flash'

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

const SYSTEM_PROMPT = `Analyze government ID image (Aadhaar/PAN/Passport/VoterID/DL). Return ONLY JSON:
{
  "is_government_id": boolean,
  "document_type": "AADHAAR | PAN | PASSPORT | DRIVING_LICENSE | VOTER_ID | UNKNOWN",
  "document_number": "string",
  "full_name": "string",
  "date_of_birth": "string",
  "confidence": number (0.0 to 1.0),
  "suspicious": boolean,
  "reason": "string",
  "raw_ocr_text": "string"
}
Rules:
1. Reject selfies, screenshots, receipts (is_government_id: false).
2. Set suspicious: true if suspicious or fake.
3. No prose/markdown.`

const BACK_SYSTEM_PROMPT = `Analyze back of government ID. Return ONLY JSON:
{
  "is_government_id": boolean,
  "confidence": number (0.0 to 1.0),
  "suspicious": boolean,
  "reason": "string",
  "address": "string",
  "raw_ocr_text_back": "string"
}
Rules:
1. Reject non-ID images.
2. Extract full address.
3. No prose/markdown.`

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
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI_TIMEOUT')), 15000)
        );
        
        const response = await Promise.race([generatePromise, timeoutPromise]) as any;
        
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
          console.log(`[GEMINI] Non-retryable error: ${errMsg}. Failing immediately.`);
          throw error;
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
              maxOutputTokens: 600
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
      } catch (err) {
        console.error('[EMP-VERIFY] Gemini error:', err)
        return { success: false, error: 'AI verification temporarily unavailable.' }
      }

      // Parse
      let parseFailed = false
      try {
        result = JSON.parse(aiText.replace(/^```json/g, '').replace(/```$/g, '').trim())
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
    let status = 'FAILED'
    let reason = result.reason || ''

    if (result.suspicious || !result.is_government_id) {
      status = 'FAILED'
      reason = result.reason || 'Not a valid government ID.'
    } else {
      const num = (result.document_number || '').trim().replace(/\s/g, '')
      let validFormat = true
      if (result.document_type === 'AADHAAR' && (!/^\d{12}$/.test(num))) validFormat = false
      if (result.document_type === 'PAN'    && (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(num))) validFormat = false

      if (!validFormat) {
        status = 'FAILED'
        reason = 'Document number does not match expected format or image is not clear enough. Please re-upload.'
      } else {
        if (result.confidence >= 0.50) {
          status = 'VERIFIED'
        } else {
          status = 'FAILED'
          reason = 'Confidence too low. Please upload a clearer image.'
        }
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
              maxOutputTokens: 600
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
      } catch (err) {
        console.error('[EMP-VERIFY] Gemini error for back image:', err)
      }
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
        const firstBrace = aiText.indexOf('{')
        const lastBrace = aiText.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonStr = aiText.substring(firstBrace, lastBrace + 1)
          const parsed = JSON.parse(jsonStr)
          address = parsed.address || ''
          rawOcrTextBack = parsed.raw_ocr_text_back || aiText
          confidence = parsed.confidence || 0
          suspicious = parsed.suspicious || false
          isGovtId = parsed.is_government_id !== false
          
          // Cache
          if (parsed && parsed.is_government_id !== false) {
            await saveCachedOcr(imageHash, parsed, 'EMPLOYEE_BACK')
          }
        } else {
          return { success: false, error: 'Back image is not clear enough. Please re-upload.' }
        }
      } catch (e) {
        console.warn('[EMP-VERIFY] Failed to parse AI JSON response for back image.')
        return { success: false, error: 'Failed to process back image. Please re-upload.' }
      }
    }

    if (suspicious || !isGovtId || confidence < 0.50) {
      return { success: false, error: 'Back image is not clear enough or suspicious. Please re-upload a clear photo.' }
    }

    return { success: true, backUrl, address, raw_ocr_text_back: rawOcrTextBack }
  } catch (err: any) {
    return { success: false, error: 'Internal error during back image upload.' }
  }
}
