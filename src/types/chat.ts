import type { Prisma } from '../generated/prisma/client'

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

export type InventoryProduct = Prisma.ProductGetPayload<{
  include: {
    seller: {
      select: {
        sellerId: true
        businessName: true
        address: true
        city: true
        region: true
      }
    }
  }
}>

export type InventoryProductResponse = Omit<InventoryProduct, 'media'> & {
  imageUrls: string[]
}

export interface ChatApiResponse {
  textResponse: string
  layoutType: ChatLayoutType
  data: InventoryProductResponse[]
}
