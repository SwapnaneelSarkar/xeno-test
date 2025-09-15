const express = require("express")
const { PrismaClient } = require("@prisma/client")
const router = express.Router()

// GET /api/debug/test-db - Test database connection and tables
router.get("/test-db", async (req, res) => {
  try {
    const prisma = new PrismaClient()
    
    // Test basic connection
    await prisma.$connect()
    
    // Test if tables exist by trying to query them
    const tenantCount = await prisma.tenant.count()
    
    await prisma.$disconnect()
    
    res.json({
      success: true,
      message: "Database connection successful",
      tenantCount: tenantCount
    })
  } catch (error) {
    console.error('Debug error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
})

module.exports = router
