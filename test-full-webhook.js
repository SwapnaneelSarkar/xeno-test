const { PrismaClient } = require('@prisma/client');
const webhookService = require('./src/services/webhookService');

const prisma = new PrismaClient();

async function testFullWebhookFlow() {
  console.log('🧪 Testing full webhook flow...\n');
  
  const tenantId = 'cmfi4b1y900006lnrnwolekcy';
  
  // Test webhook payloads
  const testWebhooks = [
    {
      topic: 'products/create',
      payload: {
        id: 99991,
        title: 'Full Test Product',
        handle: 'full-test-product',
        vendor: 'Test Vendor',
        product_type: 'Test Type',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    },
    {
      topic: 'customers/create',
      payload: {
        id: 99992,
        email: 'fulltest@example.com',
        first_name: 'Full',
        last_name: 'Test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    },
    {
      topic: 'orders/create',
      payload: {
        id: 99993,
        order_number: '#FULLTEST001',
        email: 'fulltest@example.com',
        total_price: '99.99',
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  ];
  
  for (const webhook of testWebhooks) {
    try {
      console.log(`Processing ${webhook.topic}...`);
      
      // Log webhook event (simulating what the webhook route does)
      await webhookService.logWebhookEvent(
        tenantId,
        webhook.payload.id.toString(),
        webhook.topic,
        webhook.payload
      );
      
      // Process webhook
      const result = await webhookService.processWebhook(
        webhook.topic,
        webhook.payload,
        tenantId
      );
      
      if (result.success) {
        // Mark as processed
        await webhookService.logWebhookEvent(
          tenantId,
          webhook.payload.id.toString(),
          webhook.topic,
          webhook.payload,
          true
        );
        console.log(`✅ ${webhook.topic} - Success`);
      } else {
        console.log(`❌ ${webhook.topic} - Failed: ${result.message}`);
      }
      
    } catch (error) {
      console.log(`❌ ${webhook.topic} - Error: ${error.message}`);
    }
  }
  
  console.log('\n🔍 Checking webhook events in database...');
  
  try {
    const events = await prisma.webhookEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`\n📊 Found ${events.length} webhook events:`);
    
    events.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.topic} - Processed: ${event.processed} - ${event.createdAt}`);
    });
    
    // Check synced data
    console.log('\n🔍 Checking synced data...');
    
    const [products, customers, orders] = await Promise.all([
      prisma.product.findMany({ where: { tenantId } }),
      prisma.customer.findMany({ where: { tenantId } }),
      prisma.order.findMany({ where: { tenantId } })
    ]);
    
    console.log(`  Products: ${products.length}`);
    console.log(`  Customers: ${customers.length}`);
    console.log(`  Orders: ${orders.length}`);
    
  } catch (error) {
    console.log(`❌ Error checking database: ${error.message}`);
  }
  
  await prisma.$disconnect();
}

testFullWebhookFlow();
