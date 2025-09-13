const { PrismaClient } = require('@prisma/client');

async function testWebhookProcessing() {
  const prisma = new PrismaClient();
  
  console.log('🧪 Testing Webhook Processing...\n');
  
  try {
    // Check recent webhook events
    const webhooks = await prisma.webhookEvent.findMany({
      where: { 
        tenantId: 'cmfi4b1y900006lnrnwolekcy',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`📊 Found ${webhooks.length} webhook events in last 24 hours:`);
    
    if (webhooks.length === 0) {
      console.log('\n⚠️  No recent webhook events found');
      console.log('\n🔗 To test webhook processing:');
      console.log('1. Go to: https://xeno-fde-test1.myshopify.com/admin/products');
      console.log('2. Create a new product');
      console.log('3. Go to: https://xeno-fde-test1.myshopify.com/admin/orders');
      console.log('4. Create a new order');
      console.log('5. Run this test again');
      return;
    }
    
    webhooks.forEach((webhook, index) => {
      const status = webhook.processed ? '✅' : '❌';
      const time = webhook.createdAt.toLocaleString();
      console.log(`   ${index + 1}. ${status} ${webhook.topic} | ${time}`);
    });
    
    const processedCount = webhooks.filter(w => w.processed).length;
    const totalCount = webhooks.length;
    
    console.log(`\n📈 Processing Stats:`);
    console.log(`   Processed: ${processedCount}/${totalCount} (${Math.round(processedCount/totalCount*100)}%)`);
    
    if (processedCount === totalCount) {
      console.log('\n🎉 Webhook Processing: SUCCESS');
      console.log('   - All webhooks processed successfully');
    } else {
      console.log('\n⚠️  Webhook Processing: PARTIAL');
      console.log('   - Some webhooks failed to process');
    }
    
    // Check for specific entity types
    const products = await prisma.product.count({
      where: { tenantId: 'cmfi4b1y900006lnrnwolekcy' }
    });
    
    const orders = await prisma.order.count({
      where: { tenantId: 'cmfi4b1y900006lnrnwolekcy' }
    });
    
    const customers = await prisma.customer.count({
      where: { tenantId: 'cmfi4b1y900006lnrnwolekcy' }
    });
    
    console.log(`\n📦 Data Sync Status:`);
    console.log(`   Products: ${products}`);
    console.log(`   Orders: ${orders}`);
    console.log(`   Customers: ${customers}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWebhookProcessing();