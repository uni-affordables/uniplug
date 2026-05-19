import { Prisma } from '../generated/prisma/client'
import { getPrismaClient } from '../lib/prisma'
import { generateTextEmbedding } from './vectorSync.service'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20
const MIN_SIMILARITY = 0.45

interface ProductSearchHit {
  productId: string
  similarity: number
}

type ProductWithSeller = Prisma.ProductGetPayload<{
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

const clampLimit = (limit?: number): number => {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT
  }

  return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT)
}

const toVectorLiteral = (values: number[]): string => `[${values.join(',')}]`

export const executeSemanticSearch = async (
  query: string,
  limit?: number
): Promise<ProductWithSeller[]> => {
  const prisma = getPrismaClient()
  const normalizedQuery = query.trim()

  if (normalizedQuery.length === 0) {
    return []
  }

  const embedding = await generateTextEmbedding(normalizedQuery)
  const vectorLiteral = toVectorLiteral(embedding)
  const take = clampLimit(limit)

  const hits = await prisma.$queryRaw<ProductSearchHit[]>(
    Prisma.sql`
      SELECT
        pv.product_id AS "productId",
        1 - (pv.embedding <=> CAST(${vectorLiteral} AS vector)) AS "similarity"
      FROM public.product_vectors pv
      WHERE 1 - (pv.embedding <=> CAST(${vectorLiteral} AS vector)) >= ${MIN_SIMILARITY}
      ORDER BY pv.embedding <=> CAST(${vectorLiteral} AS vector) ASC
      LIMIT ${take}
    `
  )

  if (hits.length === 0) {
    return []
  }

  const productIds = hits.map((hit) => hit.productId)
  const products = await prisma.product.findMany({
    where: {
      productId: {
        in: productIds
      },
      productAvailability: true
    },
    include: {
      seller: {
        select: {
          sellerId: true,
          businessName: true,
          address: true,
          city: true,
          region: true
        }
      }
    }
  })

  const productMap = new Map(products.map((product) => [product.productId, product]))

  return productIds
    .map((id) => productMap.get(id))
    .filter((product): product is ProductWithSeller => product !== undefined)
}
