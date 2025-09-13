const { PrismaClient } = require('@prisma/client')

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5432/xeno_test'
  
  // Initialize test database connection
  global.prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
})

afterAll(async () => {
  // Clean up database connection
  if (global.prisma) {
    await global.prisma.$disconnect()
  }
})

beforeEach(async () => {
  // Clean up test data before each test
  if (global.prisma) {
    await global.prisma.webhookEvent.deleteMany()
    await global.prisma.order.deleteMany()
    await global.prisma.product.deleteMany()
    await global.prisma.customer.deleteMany()
    await global.prisma.tenant.deleteMany()
  }
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}
