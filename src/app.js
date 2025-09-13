const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
require("dotenv").config()

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

const app = express()
const PORT = process.env.PORT || 3000

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

// HTTPS redirection in production
if (process.env.NODE_ENV === 'production') {
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
app.use("/api/webhook-management", webhookManagementRoutes)
app.use("/api/metrics", metricsRoutes)

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
