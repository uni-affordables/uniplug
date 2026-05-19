import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

let prismaClient: PrismaClient | undefined

export const getPrismaClient = (): PrismaClient => {
  if (prismaClient !== undefined) {
    return prismaClient
  }

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.')
  }

  prismaClient = new PrismaClient({
    adapter: new PrismaPg(databaseUrl)
  })

  return prismaClient
}
