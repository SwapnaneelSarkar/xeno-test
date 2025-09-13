const { PrismaClient } = require('@prisma/client');

async function testAppUninstall() {
  const prisma = new PrismaClient();
  
  console.log('🧪 Testing App Uninstall...\n');
  
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { shopDomain: 'xeno-fde-test1.myshopify.com' }
    });
    
    if (!tenant) {
      console.log('❌ No tenant found for xeno-fde-test1.myshopify.com');
      return;
    }
    
    console.log('📊 Current Tenant Status:');
    console.log(`   Shop Domain: ${tenant.shopDomain}`);
    console.log(`   Active: ${tenant.active}`);
    console.log(`   Has Access Token: ${!!tenant.accessToken}`);
    console.log(`   Last Updated: ${tenant.createdAt}`);
    
    if (!tenant.active && !tenant.accessToken) {
      console.log('\n🎉 App Uninstall: SUCCESS');
      console.log('   - Tenant is inactive');
      console.log('   - Access token removed');
      console.log('   - App successfully uninstalled');
    } else if (tenant.active && tenant.accessToken) {
      console.log('\n⚠️  App Uninstall: NOT TESTED');
      console.log('   - Tenant is still active');
      console.log('   - Access token present');
      console.log('\n🔗 To test app uninstall:');
      console.log('1. Go to: https://xeno-fde-test1.myshopify.com/admin/apps');
      console.log('2. Find your app and click "Uninstall"');
      console.log('3. Confirm the uninstall');
      console.log('4. Run this test again');
    } else {
      console.log('\n⚠️  App Uninstall: PARTIAL');
      console.log('   - Tenant status unclear');
    }
    
    // Check for app/uninstalled webhook events
    const uninstallWebhooks = await prisma.webhookEvent.findMany({
      where: { 
        tenantId: tenant.id,
        topic: 'app/uninstalled'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (uninstallWebhooks.length > 0) {
      console.log(`\n📨 Found ${uninstallWebhooks.length} app/uninstalled webhook(s)`);
      uninstallWebhooks.forEach((webhook, index) => {
        const status = webhook.processed ? '✅' : '❌';
        console.log(`   ${index + 1}. ${status} ${webhook.createdAt.toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAppUninstall();
