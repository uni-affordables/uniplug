import { randomUUID } from 'node:crypto'
import { Prisma } from '../generated/prisma/client'
import { type NextFunction, type Request, type Response } from 'express'
import { getGoogleGenAI } from '../lib/gemini'
import { getPrismaClient } from '../lib/prisma'

class HttpError extends Error {
  constructor (
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

type AsyncHandler<TRequest extends Request = Request, TResponse extends Response = Response> = (
  req: TRequest,
  res: TResponse,
  next: NextFunction
) => Promise<void>

const asyncHandler = <
  TRequest extends Request = Request,
  TResponse extends Response = Response
>(handler: AsyncHandler<TRequest, TResponse>) => (
  req: TRequest,
  res: TResponse,
  next: NextFunction
): void => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

interface ProductSyncRequestBody {
  product_id: string
  seller_id: string
  product_name: string
  product_description?: string
  product_price: number
}

interface SyncSuccessResponse {
  success: true
}

const EMBEDDING_MODEL = 'text-embedding-004'
const EMBEDDING_DIMENSIONS = 768

const isProductSyncRequestBody = (value: unknown): value is ProductSyncRequestBody => {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.product_id === 'string' &&
    typeof candidate.seller_id === 'string' &&
    typeof candidate.product_name === 'string' &&
    (candidate.product_description === undefined || typeof candidate.product_description === 'string') &&
    typeof candidate.product_price === 'number' &&
    Number.isFinite(candidate.product_price)
  )
}

const buildLocationString = (seller: {
  address: string | null
  city: string | null
  region: string | null
}): string => (
  [seller.address, seller.city, seller.region]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .join(', ')
)

const toVectorLiteral = (values: number[]): string => JSON.stringify(values)

const assertEmbeddingSize = (values: number[]): void => {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS} embedding dimensions, received ${values.length}.`
    )
  }
}

export const syncProduct = asyncHandler(async (
  req: Request<Record<string, never>, SyncSuccessResponse, ProductSyncRequestBody>,
  res: Response<SyncSuccessResponse>
) => {
  const sharedSecret = process.env.INTERNAL_SHARED_SECRET

  if (!sharedSecret) {
    throw new HttpError(500, 'INTERNAL_SHARED_SECRET is not configured.')
  }

  if (req.headers['x-internal-secret'] !== sharedSecret) {
    throw new HttpError(401, 'Unauthorized.')
  }

  if (!isProductSyncRequestBody(req.body)) {
    throw new HttpError(
      400,
      'Invalid request body. Expected { product_id, seller_id, product_name, product_description?, product_price }.'
    )
  }

  const {
    product_id: productId,
    seller_id: sellerId,
    product_name: productName,
    product_description: productDescription,
    product_price: productPrice
  } = req.body

  if (productId.trim().length === 0 || sellerId.trim().length === 0) {
    throw new HttpError(400, 'product_id and seller_id are required.')
  }

  const prisma = getPrismaClient()
  const seller = await prisma.seller.findUnique({
    where: { sellerId },
    select: {
      address: true,
      city: true,
      region: true
    }
  })

  if (!seller) {
    throw new HttpError(404, `Seller ${sellerId} was not found.`)
  }

  const locationString = buildLocationString(seller)
  const textPayload = [
    `Product: ${productName}.`,
    `Details: ${productDescription ?? ''}.`,
    `Price: ${productPrice} GHS.`,
    `Location: ${locationString}.`
  ].join(' ')

  const embeddingResponse = await getGoogleGenAI().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: textPayload
  })

  const embeddingValues = embeddingResponse.embeddings?.[0]?.values

  if (!embeddingValues || embeddingValues.length === 0) {
    throw new Error('Gemini embedding response did not include vector values.')
  }

  assertEmbeddingSize(embeddingValues)
  const vectorString = toVectorLiteral(embeddingValues)

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO public.product_vectors (vector_id, product_id, embedding)
      VALUES (${randomUUID()}, ${productId}, CAST(${vectorString} AS vector))
      ON CONFLICT (product_id)
      DO UPDATE SET embedding = EXCLUDED.embedding
    `
  )

  console.log('[product-sync] vector upserted', {
    productId,
    sellerId
  })

  res.status(200).json({ success: true })
})
