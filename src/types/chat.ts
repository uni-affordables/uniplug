import type { Product } from '../generated/prisma/client'

export type ChatRole = 'user' | 'model'

export interface ChatPart {
  text: string
}

export interface ChatHistoryEntry {
  role: ChatRole
  parts: ChatPart[]
}

export interface ChatRequestBody {
  message: string
  chatHistory: ChatHistoryEntry[]
}

export type ChatLayoutType = 'STANDARD_TEXT' | 'PRODUCT_CAROUSEL'

export interface ChatApiResponse {
  textResponse: string
  layoutType: ChatLayoutType
  data: Product[]
}
