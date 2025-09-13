const axios = require('axios');

const ngrokUrl = 'https://4437b86b8b95.ngrok-free.app';
const tenantId = 'cmfi4b1y900006lnrnwolekcy';

// Test webhook payloads
const testWebhooks = [
  {
    topic: 'products/create',
    payload: {
      id: 12345,
      title: 'Test Product',
      handle: 'test-product',
      vendor: 'Test Vendor',
      product_type: 'Test Type',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    topic: 'customers/create',
    payload: {
      id: 67890,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'Customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    topic: 'orders/create',
    payload: {
      id: 11111,
      order_number: '#TEST001',
      email: 'test@example.com',
      total_price: '29.99',
      currency: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
];

async function runWebhookTest() {
  console.log('🧪 Testing webhook endpoints...\n');
  
  for (const webhook of testWebhooks) {
    try {
      console.log(`Testing ${webhook.topic}...`);
      
      const response = await axios.post(
        `${ngrokUrl}/api/webhooks/shopify/${webhook.topic.split('/')[0]}`,
        webhook.payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Topic': webhook.topic,
            'X-Shopify-Shop-Domain': 'xeno-fde-test1.myshopify.com'
          }
        }
      );
      
      console.log(`✅ ${webhook.topic} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${webhook.topic} - Error: ${error.response?.status || error.message}`);
    }
  }
  
  console.log('\n🔍 Checking webhook events...');
  
  try {
    const response = await axios.get(
      `${ngrokUrl}/api/webhook-management/events/${tenantId}?page=1&limit=10`
    );
    
    const events = response.data.data.events;
    console.log(`\n📊 Found ${events.length} webhook events:`);
    
    events.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.topic} - Processed: ${event.processed} - ${event.createdAt}`);
    });
    
  } catch (error) {
    console.log(`❌ Error checking events: ${error.message}`);
  }
}

runWebhookTest();
