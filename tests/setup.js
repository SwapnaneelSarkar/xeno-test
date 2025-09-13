const { PrismaClient } = require("@prisma/client")
const { beforeAll, afterAll, beforeEach } = require("@jest/globals")

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || "postgresql://postgres:postgres@localhost:5432/xeno_fde_test",
    },
  },
})

beforeAll(async () => {
  // Setup test database
  await prisma.$connect()
})

afterAll(async () => {
  // Cleanup test database
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Clean up data before each test
  await prisma.webhookEvent.deleteMany()
  await prisma.syncLog.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.store.deleteMany()
  await prisma.tenant.deleteMany()
})

module.exports = { prisma }
