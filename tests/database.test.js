const { PrismaClient } = require('@prisma/client')

describe('Database Connection Tests', () => {
  let prisma

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/xeno_test'
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    })
    
    // Connect to database
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should connect to test database', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow()
  })

  test('should be able to query tenants table', async () => {
    const tenants = await prisma.tenant.findMany()
    expect(Array.isArray(tenants)).toBe(true)
  })

  test('should be able to query customers table', async () => {
    const customers = await prisma.customer.findMany()
    expect(Array.isArray(customers)).toBe(true)
  })

  test('should be able to query products table', async () => {
    const products = await prisma.product.findMany()
    expect(Array.isArray(products)).toBe(true)
  })

  test('should be able to query orders table', async () => {
    const orders = await prisma.order.findMany()
    expect(Array.isArray(orders)).toBe(true)
  })
})
