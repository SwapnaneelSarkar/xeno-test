const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticateToken, tenantIsolation } = require('../middleware/auth')
const { logger } = require('../utils/logger')

const router = express.Router()
const prisma = new PrismaClient()

// Prometheus-style metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = []
    
    // System metrics
    const memUsage = process.memoryUsage()
    metrics.push(`# HELP nodejs_memory_usage_bytes Memory usage in bytes`)
    metrics.push(`# TYPE nodejs_memory_usage_bytes gauge`)
    metrics.push(`nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}`)
    metrics.push(`nodejs_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}`)
    metrics.push(`nodejs_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}`)
    metrics.push(`nodejs_memory_usage_bytes{type="external"} ${memUsage.external}`)
    
    // Uptime
    metrics.push(`# HELP nodejs_uptime_seconds Uptime in seconds`)
    metrics.push(`# TYPE nodejs_uptime_seconds counter`)
    metrics.push(`nodejs_uptime_seconds ${process.uptime()}`)
    
    // Database metrics
    const dbStats = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
    `
    
    metrics.push(`# HELP database_table_operations Database table operations`)
    metrics.push(`# TYPE database_table_operations counter`)
    
    dbStats.forEach(table => {
      metrics.push(`database_table_operations{table="${table.tablename}",operation="inserts"} ${table.inserts}`)
      metrics.push(`database_table_operations{table="${table.tablename}",operation="updates"} ${table.updates}`)
      metrics.push(`database_table_operations{table="${table.tablename}",operation="deletes"} ${table.deletes}`)
    })
    
    // Webhook metrics
    const webhookStats = await prisma.webhookEvent.groupBy({
      by: ['topic', 'processed'],
      _count: { id: true },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })
    
    metrics.push(`# HELP webhook_events_total Total webhook events processed`)
    metrics.push(`# TYPE webhook_events_total counter`)
    
    webhookStats.forEach(stat => {
      const processed = stat.processed ? 'true' : 'false'
      metrics.push(`webhook_events_total{topic="${stat.topic}",processed="${processed}"} ${stat._count.id}`)
    })
    
    // Tenant metrics
    const tenantCount = await prisma.tenant.count({ where: { active: true } })
    metrics.push(`# HELP tenants_active_total Active tenants count`)
    metrics.push(`# TYPE tenants_active_total gauge`)
    metrics.push(`tenants_active_total ${tenantCount}`)
    
    res.set('Content-Type', 'text/plain')
    res.send(metrics.join('\n'))
  } catch (error) {
    logger.error('Metrics collection failed', { error: error.message })
    res.status(500).json({ error: 'Failed to collect metrics' })
  }
})

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

    // Orders by day
    const ordersByDay = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as day, 
        COUNT(*) as orders, 
        SUM(CAST(total_price AS DECIMAL)) as revenue
      FROM "Order"
      WHERE tenant_id = ${tenantId} 
        AND created_at BETWEEN ${fromDate} AND ${toDate}
      GROUP BY day 
      ORDER BY day
    `

    // Top customers by spend
    const topCustomers = await prisma.$queryRaw`
      SELECT 
        c.email, 
        c.first_name, 
        c.last_name, 
        SUM(CAST(o.total_price AS DECIMAL)) as total_spend
      FROM "Customer" c 
      JOIN "Order" o ON c.shopify_id = o.customer_shopify_id
      WHERE c.tenant_id = ${tenantId} 
        AND o.created_at BETWEEN ${fromDate} AND ${toDate}
      GROUP BY c.email, c.first_name, c.last_name 
      ORDER BY total_spend DESC 
      LIMIT 5
    `

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
      ordersByDay,
      topCustomers,
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

module.exports = router