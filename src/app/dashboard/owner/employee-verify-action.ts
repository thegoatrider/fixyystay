'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL_NAME = 'gemini-2.5-flash'

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

    // Upload
    const frontUrl = await uploadToStorage(file, 'employee_ids')
    if (!frontUrl) return { success: false, error: 'Failed to upload image.' }

    // OCR
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    let aiText = '{}'
    try {
      const res = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{
          role: 'user',
          parts: [{ inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } }]
        }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.0,
          responseMimeType: 'application/json'
        }
      })
      aiText = res.text || '{}'
    } catch (err) {
      console.error('[EMP-VERIFY] Gemini error:', err)
      return { success: false, error: 'AI verification temporarily unavailable.' }
    }

    // Parse
    let result: any = {}
    try {
      result = JSON.parse(aiText.replace(/^```json/g, '').replace(/```$/g, '').trim())
    } catch {
      result = { is_government_id: false, document_type: 'UNKNOWN', confidence: 0, suspicious: true, reason: 'Parse error', raw_ocr_text: '' }
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
    const backUrl = await uploadToStorage(file, 'employee_ids')
    if (!backUrl) return { success: false, error: 'Upload failed.' }

    // OCR
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    let aiText = '{}'
    try {
      const res = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{
          role: 'user',
          parts: [{ inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } }]
        }],
        config: {
          systemInstruction: BACK_SYSTEM_PROMPT,
          temperature: 0.0,
          responseMimeType: 'application/json'
        }
      })
      aiText = res.text || '{}'
    } catch (err) {
      console.error('[EMP-VERIFY] Gemini error for back image:', err)
    }

    let address = ''
    let rawOcrTextBack = aiText
    let confidence = 0
    let suspicious = false
    let isGovtId = true
    try {
      const firstBrace = aiText.indexOf('{')
      const lastBrace = aiText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = aiText.substring(firstBrace, lastBrace + 1)
        const result = JSON.parse(jsonStr)
        address = result.address || ''
        rawOcrTextBack = result.raw_ocr_text_back || aiText
        confidence = result.confidence || 0
        suspicious = result.suspicious || false
        isGovtId = result.is_government_id !== false
      } else {
        return { success: false, error: 'Back image is not clear enough. Please re-upload.' }
      }
    } catch (e) {
      console.warn('[EMP-VERIFY] Failed to parse AI JSON response for back image.')
      return { success: false, error: 'Failed to process back image. Please re-upload.' }
    }

    if (suspicious || !isGovtId || confidence < 0.50) {
      return { success: false, error: 'Back image is not clear enough or suspicious. Please re-upload a clear photo.' }
    }

    return { success: true, backUrl, address, raw_ocr_text_back: rawOcrTextBack }
  } catch (err: any) {
    return { success: false, error: 'Internal error during back image upload.' }
  }
}
