const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function runTest(testName, testFile) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ${testName}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const { stdout, stderr } = await execAsync(`node ${testFile}`);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error(`❌ Error running ${testName}:`, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Running Complete Test Suite');
  console.log('Testing OAuth Flow, Webhook Processing, and App Uninstall');
  
  await runTest('OAuth Flow Test', 'test-oauth-flow.js');
  await runTest('Webhook Processing Test', 'test-webhook-processing.js');
  await runTest('App Uninstall Test', 'test-app-uninstall.js');
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ All tests completed!');
  console.log(`${'='.repeat(60)}`);
  
  console.log('\n📋 Next Steps:');
  console.log('1. If OAuth test failed, visit the install URL');
  console.log('2. If webhook test failed, create products/orders in Shopify');
  console.log('3. If uninstall test failed, uninstall the app in Shopify');
  console.log('4. Run individual tests as needed');
}

runAllTests().catch(console.error);
