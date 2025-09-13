const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5433/xeno_test'
  
  // Run database migrations for test database
  try {
    console.log('Running database migrations for test...')
    execSync('npx prisma migrate deploy', { 
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit'
    })
    console.log('Database migrations completed')
  } catch (error) {
    console.error('Failed to run migrations:', error.message)
    // Continue anyway - migrations might already be up to date
  }
  
  // Initialize test database connection with explicit URL
  const testDatabaseUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5433/xeno_test'
  console.log('Creating Prisma client with URL:', testDatabaseUrl)
  
  global.prisma = new PrismaClient({
    datasources: {
      db: {
        url: testDatabaseUrl
      }
    }
  })
  
  // Connect to database
  await global.prisma.$connect()
  console.log('Global Prisma client connected to:', testDatabaseUrl)
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
    try {
      // Clean up in reverse order of dependencies
      await global.prisma.webhookEvent.deleteMany().catch(() => {})
      await global.prisma.order.deleteMany().catch(() => {})
      await global.prisma.product.deleteMany().catch(() => {})
      await global.prisma.customer.deleteMany().catch(() => {})
      await global.prisma.tenant.deleteMany().catch(() => {})
    } catch (error) {
      // Ignore cleanup errors - tables might not exist yet
      console.warn('Cleanup warning:', error.message)
    }
  }
})

// Temporarily disable console mocking for debugging
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn()
// }
