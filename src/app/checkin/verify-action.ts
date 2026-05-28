'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL_NAME = 'gemini-2.5-flash'

const SYSTEM_PROMPT = `
You are an expert Government ID verification AI for a hotel check-in system.
Analyze the provided image and extract information strictly in JSON format.
Your task is to identify if it is a real government ID, extract fields if legible, and detect abuse.

Note: E-Aadhaar or long-format printouts are valid Aadhaar cards. Scan the whole document to find the ID card section, usually at the bottom.

Allowed document_type values: AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID, UNKNOWN.

Rules for abuse detection (set suspicious: true if any are met):
- It is a selfie, meme, cartoon, or random picture of a wall.
- It is a photo of a screen displaying a document.
- It is clearly a handwritten note or forged text.
- It only contains random numbers without the structural layout of a real ID.

Calculate confidence score (0.0 to 1.0) based on:
- 0.80-1.0: Good clarity, standard format matches.
- 0.50-0.79: Blurry, low light, or lower quality camera, but still looks like a real ID.
- Below 0.50: Completely unrecognizable, totally blank, or obviously fake.

Return STRICTLY this JSON format (no markdown code blocks, just raw JSON):
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
You are an expert Government ID verification AI for a hotel check-in system.
Analyze the back side of the provided ID image and extract information strictly in JSON format.
Your task is to identify and extract the address.

Return STRICTLY this JSON format (no markdown code blocks, just raw JSON):
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
- It is a photo of a screen displaying a document.
- It is clearly a handwritten note or forged text.

Calculate confidence score (0.0 to 1.0) based on how clear and readable the text is.
If a field cannot be read, leave it as an empty string "".
`

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
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 25000)
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
    let result: any
    let parseFailed = false
    try {
      if (aiUnavailableError) throw new Error('AI Unavailable')
      const firstBrace = aiResponseText.indexOf('{')
      const lastBrace = aiResponseText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = aiResponseText.substring(firstBrace, lastBrace + 1)
        result = JSON.parse(jsonStr)
      } else {
        throw new Error('No JSON object found')
      }
    } catch {
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

    console.log('[VERIFY-FRONT] AI Result:', result.document_type, 'Confidence:', result.confidence)

    // 4. Validation
    let status = 'MANUAL_REVIEW'
    let finalReason = result.reason

    if (parseFailed) {
      status = 'MANUAL_REVIEW'
      finalReason = result.reason || 'AI extraction failed. Saved for manual review.'
    } else if (result.suspicious || !result.is_government_id) {
      status = 'MANUAL_REVIEW'
      finalReason = result.reason || 'Document flagged. Saved for manual review.'
    } else {
      const num = result.document_number?.trim().replace(/\s/g, '')
      let validFormat = true

      if (result.document_type === 'AADHAAR') {
        if (!num || !/\d{12}/.test(num)) validFormat = false
      } else if (result.document_type === 'PAN') {
        if (!num || !/[A-Z]{5}\d{4}[A-Z]/i.test(num)) validFormat = false
      }

      if (!validFormat) {
        status = 'MANUAL_REVIEW'
        finalReason = 'Document number does not match expected format. Saved for manual review.'
      } else {
        if (result.confidence >= 0.40) {
          status = 'VERIFIED'
        } else {
          status = 'MANUAL_REVIEW'
          finalReason = 'Image quality too poor. Saved for manual review.'
        }
      }
    }

    // 5. Save to guest_identity (front only, back_image_url will be updated later)
    const supabaseAdmin = createAdminClient()
    const identityRecord = {
      document_type: result.document_type || 'UNKNOWN',
      document_number: result.document_number,
      full_name: result.full_name,
      date_of_birth: result.date_of_birth,
      document_confidence: result.confidence || 0,
      is_verified: status === 'VERIFIED',
      verification_status: status,
      document_image_url: imageUrl,    // front image
      back_image_url: null,            // will be filled by uploadBackImage
      raw_ocr_text: result.raw_ocr_text || '',
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

    let address = ''
    let rawOcrTextBack = aiResponseText
    let confidence = 0
    let suspicious = false
    let isGovtId = true
    try {
      const firstBrace = aiResponseText.indexOf('{')
      const lastBrace = aiResponseText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = aiResponseText.substring(firstBrace, lastBrace + 1)
        const result = JSON.parse(jsonStr)
        address = result.address || ''
        rawOcrTextBack = result.raw_ocr_text_back || aiResponseText
        confidence = result.confidence || 0
        suspicious = result.suspicious || false
        isGovtId = result.is_government_id !== false
      } else {
        console.warn('[VERIFY-BACK] No JSON found in response. Skipping address extraction.')
      }
    } catch (e) {
      console.warn('[VERIFY-BACK] Failed to parse AI JSON response. Skipping address extraction.')
    }

    // We intentionally don't block on back image validation to avoid friction.
    // If it's blurry or unrecognizable, we still save the image.

    // Update the existing guest_identity record with back_image_url and address
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('guest_identity')
      .update({ 
        back_image_url: backUrl,
        address: address,
        raw_ocr_text_back: rawOcrTextBack
      })
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
