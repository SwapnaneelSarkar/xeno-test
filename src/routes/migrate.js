const express = require("express")
const { PrismaClient } = require("@prisma/client")
const router = express.Router()

// POST /api/migrate - Run database migrations
router.post("/", async (req, res) => {
  try {
    const prisma = new PrismaClient()
    
    // Test database connection
    await prisma.$connect()
    
    // Create tables using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "shopDomain" TEXT NOT NULL UNIQUE,
        "accessToken" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastOrderSync" TIMESTAMP(3),
        "lastProductSync" TIMESTAMP(3),
        "lastCustomerSync" TIMESTAMP(3)
      )
    `
    
    // Add password column if it doesn't exist (for existing tables)
    await prisma.$executeRaw`
      ALTER TABLE "tenants" 
      ADD COLUMN IF NOT EXISTS "password" TEXT
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "webhook_events" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT,
        "shopifyId" TEXT NOT NULL,
        "topic" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "processed" BOOLEAN NOT NULL DEFAULT false,
        "processedAt" TIMESTAMP(3),
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("tenantId", "topic", "shopifyId")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shopifyId" TEXT NOT NULL,
        "customerShopifyId" TEXT,
        "orderNumber" TEXT,
        "email" TEXT,
        "totalPrice" DECIMAL NOT NULL,
        "subtotalPrice" DECIMAL,
        "taxPrice" DECIMAL,
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "financialStatus" TEXT,
        "fulfillmentStatus" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "tenantId" TEXT NOT NULL,
        "customerId" TEXT,
        UNIQUE("tenantId", "shopifyId")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shopifyId" TEXT NOT NULL,
        "title" TEXT,
        "sku" TEXT,
        "price" DECIMAL,
        "handle" TEXT,
        "description" TEXT,
        "vendor" TEXT,
        "productType" TEXT,
        "tags" TEXT[],
        "status" TEXT NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "tenantId" TEXT NOT NULL,
        UNIQUE("tenantId", "shopifyId")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shopifyId" TEXT NOT NULL,
        "email" TEXT,
        "firstName" TEXT,
        "lastName" TEXT,
        "phone" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "tenantId" TEXT NOT NULL,
        UNIQUE("tenantId", "shopifyId")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "stores" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shopDomain" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "tenantId" TEXT NOT NULL,
        UNIQUE("tenantId", "shopDomain")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "sync_logs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "operation" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      )
    `
    
    await prisma.$disconnect()
    
    res.json({
      success: true,
      message: "Database migrations completed successfully"
    })
  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

module.exports = router
