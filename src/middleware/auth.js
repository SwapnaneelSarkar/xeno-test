const jwt = require("jsonwebtoken")
const prisma = require("../lib/prisma")

// JWT authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ error: "Access token required" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const tenant = await prisma.tenant.findUnique({
      where: { id: decoded.tenantId },
    })

    if (!tenant) {
      return res.status(401).json({ error: "Invalid token" })
    }

    req.tenant = tenant
    next()
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" })
  }
}

// Tenant isolation middleware
const tenantIsolation = (req, res, next) => {
  if (!req.tenant) {
    return res.status(401).json({ error: "Authentication required" })
  }

  // Add tenant context to all database queries
  req.tenantId = req.tenant.id
  next()
}

module.exports = {
  authenticateToken,
  tenantIsolation,
}
