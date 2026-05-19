import { GoogleGenAI } from '@google/genai'

let aiClient: GoogleGenAI | undefined

export const getGoogleGenAI = (): GoogleGenAI => {
  if (aiClient !== undefined) {
    return aiClient
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.')
  }

  aiClient = new GoogleGenAI({ apiKey })
  return aiClient
}
