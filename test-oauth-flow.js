const { PrismaClient } = require('@prisma/client');

async function testOAuthFlow() {
  const prisma = new PrismaClient();
  
  console.log('🧪 Testing OAuth Flow...\n');
  
  try {
    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { shopDomain: 'xeno-fde-test1.myshopify.com' }
    });
    
    if (tenant) {
      console.log('✅ Tenant found:');
      console.log(`   Shop Domain: ${tenant.shopDomain}`);
      console.log(`   Active: ${tenant.active}`);
      console.log(`   Has Access Token: ${!!tenant.accessToken}`);
      console.log(`   Created: ${tenant.createdAt}`);
      
      if (tenant.active && tenant.accessToken) {
        console.log('\n🎉 OAuth Flow: SUCCESS');
        console.log('   - Tenant created and active');
        console.log('   - Access token present');
        console.log('   - Ready for webhook processing');
      } else {
        console.log('\n⚠️  OAuth Flow: PARTIAL');
        console.log('   - Tenant exists but may need re-authentication');
      }
    } else {
      console.log('❌ No tenant found');
      console.log('\n🔗 To test OAuth flow, visit:');
      console.log('https://b9bec17b2a59.ngrok-free.app/api/shopify/install?shop=xeno-fde-test1.myshopify.com');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testOAuthFlow();
