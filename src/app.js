const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
require("dotenv").config()

// Import Railway configuration
const railwayConfig = require("./config/railway")

// Import security middleware
const {
  helmetConfig,
  corsOptions,
  generalRateLimit,
  webhookRateLimit,
  authRateLimit,
  sanitizeLogData
} = require("./middleware/security")

// Import routes
const authRoutes = require("./routes/auth")
const shopifyRoutes = require("./routes/shopify")
const webhookRoutes = require("./routes/webhooks")
const webhookManagementRoutes = require("./routes/webhookManagement")
const metricsRoutes = require("./routes/metrics")
const healthRoutes = require("./routes/health")
const migrateRoutes = require("./routes/migrate")
const debugRoutes = require("./routes/debug")
const demoRoutes = require("./routes/demo")

const app = express()
const PORT = railwayConfig.app.port

// Log Railway environment info
if (railwayConfig.isRailway) {
  console.log(`🚀 Running on Railway (${railwayConfig.environment})`)
  console.log(`📊 Project ID: ${railwayConfig.projectId}`)
  console.log(`🔧 Service ID: ${railwayConfig.serviceId}`)
  console.log(`🌐 Port: ${PORT}`)
}

// Security middleware
app.use(helmetConfig)
app.use(cors(corsOptions))

// Rate limiting
app.use(generalRateLimit)

// Logging with sanitization
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    return JSON.stringify(sanitizeLogData(req.body))
  }
  return ''
})

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))

// Body parsing
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// HTTPS redirection in production (but not on Railway as it handles this)
if (process.env.NODE_ENV === 'production' && !railwayConfig.isRailway) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`)
    } else {
      next()
    }
  })
}

// Health endpoints (no rate limiting)
app.use("/", healthRoutes)

// Route mounting with specific rate limiting
app.use("/api/auth", authRateLimit, authRoutes)
app.use("/api/shopify", shopifyRoutes)
app.use("/api/webhooks", webhookRateLimit, webhookRoutes)
app.use("/webhooks/shopify", webhookRateLimit, webhookRoutes)
app.use("/api/webhook-management", webhookManagementRoutes)
app.use("/api/metrics", metricsRoutes)
app.use("/api/migrate", migrateRoutes)
app.use("/api/debug", debugRoutes)
app.use("/api/demo", demoRoutes)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: "Invalid JSON format" })
  }
  
  // Handle Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({ error: "Invalid data format", details: err.message })
  }
  
  res.status(500).json({ error: "Something went wrong!" })
})

// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

module.exports = app
