import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'GEMINI_API_KEY is not defined in process.env' 
    })
  }

  const ai = new GoogleGenAI({ apiKey })

  try {
    console.log('[DEBUG-GEMINI] Testing basic text generation...')
    const textResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hello, respond with success.' }] }]
    })

    console.log('[DEBUG-GEMINI] Testing text generation with system instruction...')
    const systemResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      config: {
        systemInstruction: 'You are a test helper. Respond only with the word OK.'
      }
    })

    return NextResponse.json({
      success: true,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.slice(0, 5) + '...',
      basicResponse: textResponse.text,
      systemResponse: systemResponse.text
    })
  } catch (err: any) {
    console.error('[DEBUG-GEMINI] Gemini call failed:', err)
    return NextResponse.json({
      success: false,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.slice(0, 5) + '...',
      error: err.message || String(err),
      stack: err.stack || null
    })
  }
}
