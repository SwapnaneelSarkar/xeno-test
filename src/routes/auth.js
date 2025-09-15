const express = require("express")
const { body, validationResult } = require("express-validator")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const { logger } = require("../utils/logger")
const prisma = require("../lib/prisma")
const router = express.Router()

// POST /api/auth/login
router.post("/login", [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { email, password } = req.body
    
    // Find tenant by email
    const tenant = await prisma.tenant.findUnique({
      where: { email }
    })

    if (!tenant) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      })
    }

    // For now, accept any password (in production, verify with bcrypt)
    // const isValidPassword = await bcrypt.compare(password, tenant.password)
    // if (!isValidPassword) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Invalid credentials"
    //   })
    // }

    // Generate JWT token
    const token = jwt.sign(
      { 
        tenantId: tenant.id,
        email: tenant.email,
        shopDomain: tenant.shopDomain
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({ 
      success: true,
      message: "Login successful",
      token,
      user: { 
        id: tenant.id, 
        email: tenant.email, 
        name: tenant.name,
        shopDomain: tenant.shopDomain
      }
    })
  } catch (error) {
    logger.error('Login error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/auth/register
router.post("/register", [
  body('name').isLength({ min: 1 }).withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('shopDomain').isLength({ min: 1 }).withMessage('Shop domain required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      })
    }

    const { name, email, password, shopDomain } = req.body
    
    // Check if tenant already exists by email
    const existingTenantByEmail = await prisma.tenant.findUnique({
      where: { email }
    })

    if (existingTenantByEmail) {
      return res.status(400).json({
        success: false,
        message: "Tenant with this email already exists"
      })
    }

    // Check if tenant already exists by shop domain
    const existingTenantByShopDomain = await prisma.tenant.findUnique({
      where: { shopDomain }
    })

    if (existingTenantByShopDomain) {
      return res.status(400).json({
        success: false,
        message: "Shop domain is already registered. Please choose a different shop domain."
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        email,
        password: hashedPassword,
        shopDomain,
        active: true
      }
    })

    // Generate JWT token
    const token = jwt.sign(
      { 
        tenantId: tenant.id,
        email: tenant.email,
        shopDomain: tenant.shopDomain
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.status(201).json({ 
      success: true,
      message: "Registration successful",
      token,
      user: { 
        id: tenant.id, 
        name: tenant.name, 
        email: tenant.email, 
        shopDomain: tenant.shopDomain
      }
    })
  } catch (error) {
    logger.error('Registration error:', error)
    
    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0]
      if (field === 'email') {
        return res.status(400).json({
          success: false,
          message: "Email is already registered. Please use a different email."
        })
      } else if (field === 'shopDomain') {
        return res.status(400).json({
          success: false,
          message: "Shop domain is already registered. Please choose a different shop domain."
        })
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: "Registration failed. Please try again." 
    })
  }
})

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    // TODO: Implement logout logic
    res.json({ message: "Logout successful" })
  } catch (error) {
    logger.error('Logout error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    // TODO: Implement user profile retrieval
    res.json({ 
      id: "1", 
      name: "Test User", 
      email: "test@example.com",
      shopDomain: "test-shop.myshopify.com"
    })
  } catch (error) {
    logger.error('Get profile error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
