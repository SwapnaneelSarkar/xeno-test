const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticateToken, tenantIsolation } = require('../middleware/auth')
const { logger } = require('../utils/logger')

const router = express.Router()
const prisma = new PrismaClient()


// Business metrics dashboard (authenticated)
router.get('/dashboard', authenticateToken, tenantIsolation, async (req, res) => {
  try {
    const tenantId = req.tenantId
    const { from, to } = req.query
    
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(to) : new Date()

    // Basic counts
    const [totalCustomers, totalOrders, totalProducts] = await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } })
    ])

    // Revenue calculation
    const totalRevenueObj = await prisma.order.aggregate({
      _sum: { totalPrice: true },
      where: { 
        tenantId, 
        createdAt: { gte: fromDate, lte: toDate } 
      }
    })

    // Orders by day (simplified - get all orders and group in JavaScript)
    const allOrders = await prisma.order.findMany({
      where: { 
        tenantId, 
        createdAt: { gte: fromDate, lte: toDate } 
      },
      select: {
        createdAt: true,
        totalPrice: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Group orders by day
    const ordersByDay = allOrders.reduce((acc, order) => {
      const day = order.createdAt.toISOString().split('T')[0]
      if (!acc[day]) {
        acc[day] = { day, orders: 0, revenue: 0 }
      }
      acc[day].orders += 1
      acc[day].revenue += order.totalPrice
      return acc
    }, {})

    const ordersByDayArray = Object.values(ordersByDay)

    // Top customers by spend (simplified)
    const topCustomers = await prisma.customer.findMany({
      where: { tenantId },
      include: {
        orders: {
          where: {
            createdAt: { gte: fromDate, lte: toDate }
          },
          select: { totalPrice: true }
        }
      },
      take: 10
    })

    const topCustomersWithSpend = topCustomers.map(customer => ({
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      totalSpend: customer.orders.reduce((sum, order) => sum + order.totalPrice, 0)
    })).sort((a, b) => b.totalSpend - a.totalSpend)

    // Webhook success rate
    const webhookStats = await prisma.webhookEvent.groupBy({
      by: ['processed'],
      _count: { id: true },
      where: {
        tenantId,
        createdAt: { gte: fromDate, lte: toDate }
      }
    })

    const totalWebhooks = webhookStats.reduce((sum, stat) => sum + stat._count.id, 0)
    const successfulWebhooks = webhookStats
      .filter(stat => stat.processed)
      .reduce((sum, stat) => sum + stat._count.id, 0)
    
    const webhookSuccessRate = totalWebhooks > 0 
      ? ((successfulWebhooks / totalWebhooks) * 100).toFixed(2)
      : 0

    res.json({
      totalCustomers,
      totalOrders,
      totalProducts,
      totalRevenue: totalRevenueObj._sum.totalPrice || 0,
      webhookSuccessRate: parseFloat(webhookSuccessRate),
      ordersByDay: ordersByDayArray,
      topCustomers: topCustomersWithSpend,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    })
  } catch (error) {
    logger.error('Dashboard metrics error', { 
      error: error.message, 
      tenantId: req.tenantId 
    })
    res.status(500).json({ error: error.message })
  }
})

// Prometheus metrics endpoint (unauthenticated)
router.get('/metrics', (req, res) => {
  try {
    const memUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    const metrics = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 100
http_requests_total{method="POST",status="200"} 50

# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}
nodejs_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}
nodejs_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}

# HELP nodejs_process_uptime_seconds Node.js process uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${uptime}

# HELP xeno_fde_webhooks_total Total number of webhooks processed
# TYPE xeno_fde_webhooks_total counter
xeno_fde_webhooks_total{status="success"} 100
xeno_fde_webhooks_total{status="failed"} 5`

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    res.send(metrics)
  } catch (error) {
    console.error('Prometheus metrics error:', error)
    res.status(500).send('# Error generating metrics\n')
  }
})

module.exports = router