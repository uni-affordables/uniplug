import { randomUUID } from 'node:crypto'
import { Prisma } from '../generated/prisma/client'
import { getGoogleGenAI } from '../lib/gemini'
import { getPrismaClient } from '../lib/prisma'

const EMBEDDING_MODEL = 'text-embedding-004'
const EMBEDDING_DIMENSIONS = 768

const toVectorLiteral = (values: number[]): string => `[${values.join(',')}]`

const assertEmbeddingSize = (values: number[]): void => {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS} embedding dimensions, received ${values.length}.`
    )
  }
}

type ProductWithSeller = Prisma.ProductGetPayload<{
  include: {
    seller: {
      select: {
        address: true
        city: true
        region: true
      }
    }
  }
}>

const buildLocationString = (product: ProductWithSeller): string => {
  const locationParts = [
    product.seller?.address,
    product.seller?.city,
    product.seller?.region
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())

  return locationParts.join(', ')
}

const buildProductEmbeddingPayload = (product: ProductWithSeller): string => {
  const locationString = buildLocationString(product)

  return [
    `Product: ${product.productName}.`,
    `Details: ${product.productDescription ?? ''}.`,
    `Price: ${product.productPrice.toString()} GHS.`,
    `Location: ${locationString}.`
  ].join(' ')
}

export const generateTextEmbedding = async (textPayload: string): Promise<number[]> => {
  const response = await getGoogleGenAI().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: textPayload
  })

  const values = response.embeddings?.[0]?.values

  if (!values || values.length === 0) {
    throw new Error('Gemini embedding response did not include vector values.')
  }

  assertEmbeddingSize(values)
  return values
}

export const syncProductEmbedding = async (productId: string): Promise<void> => {
  const prisma = getPrismaClient()
  const product = await prisma.product.findUnique({
    where: { productId },
    include: {
      seller: {
        select: {
          address: true,
          city: true,
          region: true
        }
      }
    }
  })

  if (!product) {
    throw new Error(`Product ${productId} was not found.`)
  }

  const textPayload = buildProductEmbeddingPayload(product)
  const embedding = await generateTextEmbedding(textPayload)
  const vectorLiteral = toVectorLiteral(embedding)

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "public"."product_vectors" ("vector_id", "product_id", "embedding")
      VALUES (${randomUUID()}, ${product.productId}, CAST(${vectorLiteral} AS vector))
      ON CONFLICT ("product_id")
      DO UPDATE SET "embedding" = EXCLUDED."embedding"
    `
  )
}
