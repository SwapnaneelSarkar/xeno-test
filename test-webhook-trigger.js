const axios = require('axios');

async function testWebhookTrigger() {
  console.log('🧪 Testing Webhook Trigger...\n');
  
  const webhookUrl = 'https://b9bec17b2a59.ngrok-free.app/api/webhooks/shopify';
  
  // Test webhook payload
  const testPayload = {
    id: Date.now().toString(),
    title: 'Test Product for Webhook',
    handle: 'test-product-webhook',
    body_html: '<p>Test product description</p>',
    vendor: 'Test Vendor',
    product_type: 'Test Type',
    tags: 'test,webhook',
    variants: [{
      id: Date.now() + 1,
      price: '19.99',
      sku: 'TEST-SKU-001'
    }]
  };
  
  const headers = {
    'X-Shopify-Topic': 'products/create',
    'X-Shopify-Shop-Domain': 'xeno-fde-test1.myshopify.com',
    'X-Shopify-Hmac-Sha256': 'test-hmac', // This will fail verification but we can see the flow
    'Content-Type': 'application/json'
  };
  
  try {
    console.log('📤 Sending test webhook...');
    const response = await axios.post(webhookUrl, testPayload, { headers });
    console.log('✅ Webhook sent successfully');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('⚠️  Webhook sent but got response:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.error('❌ Error sending webhook:', error.message);
    }
  }
  
  console.log('\n🔗 To test real webhooks:');
  console.log('1. Go to: https://xeno-fde-test1.myshopify.com/admin/products');
  console.log('2. Create a new product');
  console.log('3. Check the logs: tail -f logs/combined.log');
  console.log('4. Run: node test-webhook-processing.js');
}

testWebhookTrigger();
