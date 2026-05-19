'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Using Gemini 2.5 Flash as requested (fastest multimodal model)
const MODEL_NAME = 'gemini-2.5-flash';

// Basic prompt to enforce structure and detect fake/meme/suspicious images
const SYSTEM_PROMPT = `
You are an expert Government ID verification AI for a hotel check-in system.
Analyze the provided image and extract information strictly in JSON format.
Your task is to identify if it is a real government ID, extract fields if legible, and detect abuse.

Allowed document_type values: AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID, UNKNOWN.

Rules for abuse detection (set suspicious: true if any are met):
- It is a selfie, meme, cartoon, or random picture of a wall.
- It is a photo of a screen displaying a document.
- It is clearly a handwritten note or forged text.
- It only contains random numbers without the structural layout of a real ID.

Calculate confidence score (0.0 to 1.0) based on:
- 0.80-1.0: Good clarity, standard format matches.
- 0.50-0.79: Blurry, low light, or lower quality camera, but still looks like a real ID and main text is somewhat discernible.
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

If a field cannot be read, leave it as an empty string "".
`;

export async function uploadAndVerifyDocument(formData: FormData) {
  console.log('[VERIFY] Starting document verification...');
  
  try {
    const file = formData.get('image') as File;
    if (!file || file.size === 0) {
      return { success: false, error: 'No image provided.' };
    }

    const supabaseAdmin = createAdminClient();
    
    // 1. Upload to temporary storage
    const fileExt = file.name.split('.').pop() || 'jpg';
    const randomStr = Math.random().toString(36).substring(2, 7);
    const fileName = `temp-${Date.now()}-${randomStr}.${fileExt}`;
    
    console.log('[VERIFY] Uploading to temp storage...', fileName);
    const { error: uploadError } = await supabaseAdmin.storage
      .from('property_images')
      .upload(`temp_verification/${fileName}`, file, {
        contentType: file.type,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('[VERIFY] Upload failed:', uploadError);
      return { success: false, error: 'Failed to upload document for verification.' };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('property_images')
      .getPublicUrl(`temp_verification/${fileName}`);
      
    const imageUrl = publicUrlData.publicUrl;

    // 2. Prepare file for Gemini
    console.log('[VERIFY] Analyzing with Gemini AI...');
    
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    let aiResponseText = "";
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          SYSTEM_PROMPT,
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type || 'image/jpeg'
            }
          }
        ],
        config: {
          temperature: 0.0, // strict facts only
          responseMimeType: "application/json",
        }
      });
      
      aiResponseText = response.text || "{}";
    } catch (aiError: any) {
      console.error('[VERIFY] AI call failed:', aiError);
      return { success: false, error: 'AI verification service temporarily unavailable.' };
    }

    // 3. Parse JSON
    let result;
    try {
      // Handle potential markdown wrapping
      const cleaned = aiResponseText.replace(/^```json/g, '').replace(/```$/g, '').trim();
      result = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[VERIFY] Failed to parse AI response:', aiResponseText);
      result = {
        is_government_id: false,
        document_type: 'UNKNOWN',
        confidence: 0,
        suspicious: true,
        reason: 'AI failed to format output',
        raw_ocr_text: ''
      };
    }

    console.log('[VERIFY] AI Result:', result.document_type, 'Confidence:', result.confidence);

    // 4. Validation Layer
    let status = 'FAILED';
    let finalReason = result.reason;

    if (result.suspicious || !result.is_government_id) {
      status = 'FAILED';
      finalReason = result.reason || 'Document flagged as non-ID or suspicious.';
    } else {
      // Basic format validation
      let validFormat = true;
      const num = result.document_number?.trim().replace(/\s/g, ''); // remove spaces for regex check
      
      if (result.document_type === 'AADHAAR') {
        if (!num || !/^\d{12}$/.test(num)) validFormat = false;
      } else if (result.document_type === 'PAN') {
        if (!num || !/^[A-Z]{5}\d{4}[A-Z]$/i.test(num)) validFormat = false;
      }
      
      if (!validFormat && result.confidence > 0.40) {
        // If AI is confident but format fails, maybe OCR missed a digit. Downgrade to manual review.
        status = 'MANUAL_REVIEW';
        finalReason = 'Format validation failed. Document number does not match expected pattern.';
      } else if (validFormat) {
        if (result.confidence >= 0.50) {
          status = 'VERIFIED';
        } else if (result.confidence >= 0.30) {
          status = 'MANUAL_REVIEW';
          finalReason = 'Image quality too poor for automatic verification. Requires manual review.';
        } else {
          status = 'FAILED';
          finalReason = 'Confidence too low. Please upload a clearer image.';
        }
      } else {
         status = 'FAILED';
         finalReason = 'Extracted data invalid.';
      }
    }

    // 5. Save to guest_identity table
    const identityRecord = {
      document_type: result.document_type || 'UNKNOWN',
      document_number: result.document_number,
      full_name: result.full_name,
      date_of_birth: result.date_of_birth,
      document_confidence: result.confidence || 0,
      is_verified: status === 'VERIFIED',
      verification_status: status,
      document_image_url: imageUrl,
      raw_ocr_text: result.raw_ocr_text || '',
      ocr_json: result,
      verification_reason: finalReason
    };

    console.log(`[VERIFY] Inserting identity record. Status: ${status}`);
    const { data: inserted, error: dbError } = await supabaseAdmin
      .from('guest_identity')
      .insert([identityRecord])
      .select('id, verification_status')
      .single();

    if (dbError) {
      console.error('[VERIFY] DB Insert failed:', dbError);
      return { success: false, error: 'Database error while saving identity.' };
    }

    return { 
      success: true, 
      guest_identity_id: inserted.id,
      status: inserted.verification_status,
      reason: finalReason
    };

  } catch (err: any) {
    console.error('[VERIFY] Uncaught exception:', err);
    return { success: false, error: 'Internal system error during verification.' };
  }
}
