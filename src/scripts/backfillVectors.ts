import { getPrismaClient } from '../lib/prisma'
import { syncProductEmbedding } from '../services/vectorSync.service'

// Control chunk sizes to respect Gemini API rate limits
const BATCH_SIZE = 20
const DELAY_BETWEEN_BATCHES = 1000
const prisma = getPrismaClient()

async function backfillExistingProducts() {
  console.log('Starting UNIA marketplace vector backfill...')

  const unvectorizedProducts = await prisma.product.findMany({
    where: {
      productAvailability: true,
      vectorRecord: null
    },
    select: {
      productId: true
    }
  })

  const totalCount = unvectorizedProducts.length
  console.log(`Found ${totalCount} existing products that need vectorization.`)

  if (totalCount === 0) {
    console.log('Everything is already fully vectorized.')
    return
  }

  for (let i = 0; i < totalCount; i += BATCH_SIZE) {
    const chunk = unvectorizedProducts.slice(i, i + BATCH_SIZE)
    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (items ${i + 1} to ${Math.min(i + BATCH_SIZE, totalCount)})...`
    )

    await Promise.all(chunk.map(async (product) => {
      try {
        await syncProductEmbedding(product.productId)
      } catch (itemError) {
        console.error(`Failed to vectorize product ID ${product.productId}:`, itemError)
      }
    }))

    if (i + BATCH_SIZE < totalCount) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
    }
  }

  console.log('All existing UNIA items successfully vectorized inside Supabase.')
}

backfillExistingProducts()
  .catch((error) => console.error('Critical script failure:', error))
  .finally(async () => prisma.$disconnect())
