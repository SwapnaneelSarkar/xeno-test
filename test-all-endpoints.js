#!/usr/bin/env node

const axios = require('axios')
const { PrismaClient } = require('@prisma/client')

const BASE_URL = 'http://localhost:3000'
const prisma = new PrismaClient()

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
}

// Helper function to run a test
async function runTest(name, testFunction) {
  testResults.total++
  try {
    const result = await testFunction()
    testResults.passed++
    testResults.details.push({ name, status: 'PASS', result })
    console.log(`✅ ${name}`)
    return result
  } catch (error) {
    testResults.failed++
    testResults.details.push({ name, status: 'FAIL', error: error.message })
    console.log(`❌ ${name}: ${error.message}`)
    return null
  }
}

// Test 1: Health Endpoints
async function testHealthEndpoints() {
  console.log('\n🏥 Testing Health Endpoints...')
  
  // Basic health check
  await runTest('GET /health', async () => {
    const response = await axios.get(`${BASE_URL}/health`)
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (!response.data.checks) throw new Error('Missing checks object')
    if (response.data.checks.database?.status !== 'UP') throw new Error('Database not UP')
    if (response.data.checks.redis?.status !== 'UP') throw new Error('Redis not UP')
    return response.data
  })

  // Readiness check
  await runTest('GET /ready', async () => {
    const response = await axios.get(`${BASE_URL}/ready`)
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (!response.data.status) throw new Error('Missing status field')
    return response.data
  })

  // Liveness check
  await runTest('GET /live', async () => {
    const response = await axios.get(`${BASE_URL}/live`)
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (!response.data.status) throw new Error('Missing status field')
    return response.data
  })
}

// Test 2: Authentication Endpoints
async function testAuthEndpoints() {
  console.log('\n🔐 Testing Authentication Endpoints...')
  
  // Test login endpoint (should return 400 for missing data)
  await runTest('POST /api/auth/login (missing data)', async () => {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {})
      throw new Error('Expected 400, got 200')
    } catch (error) {
      if (error.response?.status === 400) return 'Correctly returned 400 for missing data'
      throw error
    }
  })

  // Test register endpoint (should return 400 for missing data)
  await runTest('POST /api/auth/register (missing data)', async () => {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {})
      throw new Error('Expected 400, got 200')
    } catch (error) {
      if (error.response?.status === 400) return 'Correctly returned 400 for missing data'
      throw error
    }
  })
}

// Test 3: Shopify Resource Endpoints
async function testShopifyEndpoints() {
  console.log('\n🛍️ Testing Shopify Resource Endpoints...')
  
  // Test orders endpoint (should return 401 for missing auth)
  await runTest('GET /api/shopify/orders (no auth)', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/shopify/orders`)
      throw new Error('Expected 401, got 200')
    } catch (error) {
      if (error.response?.status === 401) return 'Correctly returned 401 for missing auth'
      throw error
    }
  })

  // Test products endpoint (should return 401 for missing auth)
  await runTest('GET /api/shopify/products (no auth)', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/shopify/products`)
      throw new Error('Expected 401, got 200')
    } catch (error) {
      if (error.response?.status === 401) return 'Correctly returned 401 for missing auth'
      throw error
    }
  })

  // Test customers endpoint (should return 401 for missing auth)
  await runTest('GET /api/shopify/customers (no auth)', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/shopify/customers`)
      throw new Error('Expected 401, got 200')
    } catch (error) {
      if (error.response?.status === 401) return 'Correctly returned 401 for missing auth'
      throw error
    }
  })
}

// Test 4: Metrics Endpoints
async function testMetricsEndpoints() {
  console.log('\n📊 Testing Metrics Endpoints...')
  
  // Test dashboard endpoint (should return 401 for missing auth)
  await runTest('GET /api/metrics/dashboard (no auth)', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/metrics/dashboard`)
      throw new Error('Expected 401, got 200')
    } catch (error) {
      if (error.response?.status === 401) return 'Correctly returned 401 for missing auth'
      throw error
    }
  })

  // Test Prometheus metrics endpoint (should be accessible)
  await runTest('GET /api/metrics/metrics', async () => {
    const response = await axios.get(`${BASE_URL}/api/metrics/metrics`)
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (typeof response.data !== 'string') throw new Error('Expected string response for Prometheus metrics')
    return 'Prometheus metrics endpoint working'
  })
}

// Test 5: Webhook Endpoints
async function testWebhookEndpoints() {
  console.log('\n🔗 Testing Webhook Endpoints...')
  
  // Test webhook processing
  await runTest('POST /api/webhooks (valid webhook)', async () => {
    const webhookData = {
      id: Math.floor(Math.random() * 1000000),
      order_number: 'TEST-ENDPOINT-001',
      email: 'test@endpoint.com',
      total_price: '199.99',
      currency: 'USD',
      financial_status: 'paid',
      created_at: new Date().toISOString(),
      customer: {
        id: 12345,
        email: 'test@endpoint.com',
        first_name: 'Test',
        last_name: 'User'
      }
    }

    const response = await axios.post(`${BASE_URL}/api/webhooks`, webhookData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': 'orders/create',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com',
        'X-Shopify-Hmac-Sha256': 'test-hmac'
      }
    })

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (!response.data.success) throw new Error('Webhook processing failed')
    return response.data
  })

  // Test webhook idempotency
  await runTest('POST /api/webhooks (idempotency test)', async () => {
    const webhookId = Math.floor(Math.random() * 1000000)
    const webhookData = {
      id: webhookId,
      order_number: 'IDEMPOTENCY-TEST',
      email: 'idempotency@test.com',
      total_price: '99.99',
      currency: 'USD'
    }

    // First request
    const response1 = await axios.post(`${BASE_URL}/api/webhooks`, webhookData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': 'orders/create',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com',
        'X-Shopify-Hmac-Sha256': 'test-hmac'
      }
    })

    if (response1.status !== 200) throw new Error(`First request failed: ${response1.status}`)

    // Second identical request
    const response2 = await axios.post(`${BASE_URL}/api/webhooks`, webhookData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': 'orders/create',
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com',
        'X-Shopify-Hmac-Sha256': 'test-hmac'
      }
    })

    if (response2.status !== 200) throw new Error(`Second request failed: ${response2.status}`)
    if (!response2.data.data?.idempotent) throw new Error('Idempotency not working')
    return 'Idempotency working correctly'
  })
}

// Test 6: Webhook Management Endpoints
async function testWebhookManagementEndpoints() {
  console.log('\n⚙️ Testing Webhook Management Endpoints...')
  
  // Test webhook events endpoint (should return 401 for missing auth)
  await runTest('GET /api/webhook-management/events (no auth)', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/webhook-management/events`)
      throw new Error('Expected 401, got 200')
    } catch (error) {
      if (error.response?.status === 401) return 'Correctly returned 401 for missing auth'
      throw error
    }
  })

  // Test webhook stats endpoint (should return 401 for missing auth)
  await runTest('GET /api/webhook-management/stats (no auth)', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/webhook-management/stats/test-tenant`)
      throw new Error('Expected 401, got 200')
    } catch (error) {
      if (error.response?.status === 401) return 'Correctly returned 401 for missing auth'
      throw error
    }
  })
}

// Test 7: Rate Limiting
async function testRateLimiting() {
  console.log('\n🚦 Testing Rate Limiting...')
  
  // Test rate limit headers
  await runTest('Rate limit headers present', async () => {
    const response = await axios.get(`${BASE_URL}/api/metrics/dashboard`, {
      headers: { 'Authorization': 'Bearer test-token' }
    }).catch(err => err.response)

    if (!response.headers['x-ratelimit-limit']) throw new Error('Missing X-RateLimit-Limit header')
    if (!response.headers['x-ratelimit-remaining']) throw new Error('Missing X-RateLimit-Remaining header')
    if (!response.headers['x-ratelimit-reset']) throw new Error('Missing X-RateLimit-Reset header')
    
    const limit = parseInt(response.headers['x-ratelimit-limit'])
    if (limit !== 1500) throw new Error(`Expected limit 1500, got ${limit}`)
    
    return `Rate limiting working: ${response.headers['x-ratelimit-remaining']}/${response.headers['x-ratelimit-limit']} remaining`
  })
}

// Test 8: Database Connectivity
async function testDatabaseConnectivity() {
  console.log('\n🗄️ Testing Database Connectivity...')
  
  // Test database connection
  await runTest('Database connection', async () => {
    await prisma.$queryRaw`SELECT 1`
    return 'Database connected successfully'
  })

  // Test all models are accessible
  const models = ['tenant', 'order', 'product', 'customer', 'webhookEvent']
  for (const model of models) {
    await runTest(`Database model: ${model}`, async () => {
      await prisma[model].findMany({ take: 1 })
      return `${model} model accessible`
    })
  }
}

// Test 9: Error Handling
async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling...')
  
  // Test 404 for non-existent endpoint
  await runTest('404 for non-existent endpoint', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/non-existent`)
      throw new Error('Expected 404, got 200')
    } catch (error) {
      if (error.response?.status === 404) return 'Correctly returned 404 for non-existent endpoint'
      throw error
    }
  })

  // Test invalid JSON
  await runTest('Invalid JSON handling', async () => {
    try {
      const response = await axios.post(`${BASE_URL}/api/webhooks`, 'invalid json', {
        headers: { 'Content-Type': 'application/json' }
      })
      throw new Error('Expected 400, got 200')
    } catch (error) {
      if (error.response?.status === 400) return 'Correctly handled invalid JSON'
      throw error
    }
  })
}

// Main test function
async function runAllTests() {
  console.log('🧪 Starting Comprehensive Endpoint Testing...\n')
  
  try {
    await testHealthEndpoints()
    await testAuthEndpoints()
    await testShopifyEndpoints()
    await testMetricsEndpoints()
    await testWebhookEndpoints()
    await testWebhookManagementEndpoints()
    await testRateLimiting()
    await testDatabaseConnectivity()
    await testErrorHandling()
    
    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Passed: ${testResults.passed}`)
    console.log(`❌ Failed: ${testResults.failed}`)
    console.log(`📈 Total: ${testResults.total}`)
    console.log(`🎯 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`)
    
    if (testResults.failed === 0) {
      console.log('\n🎉 ALL ENDPOINTS WORKING PERFECTLY!')
    } else {
      console.log('\n⚠️ Some endpoints need attention:')
      testResults.details
        .filter(test => test.status === 'FAIL')
        .forEach(test => console.log(`   - ${test.name}: ${test.error}`))
    }
    
  } catch (error) {
    console.error('Test suite failed:', error)
  } finally {
    await prisma.$disconnect()
    process.exit(testResults.failed === 0 ? 0 : 1)
  }
}

// Run the tests
runAllTests()
