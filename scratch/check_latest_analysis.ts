
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const result = await prisma.signalTarget.deleteMany({
    where: { identifier: 'expressjs/express' }
  })
  const analysisResult = await prisma.analysis.deleteMany({
    where: { rawInput: 'expressjs/express' }
  })
  console.log('Deleted targets:', result)
  console.log('Deleted analyses:', analysisResult)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
