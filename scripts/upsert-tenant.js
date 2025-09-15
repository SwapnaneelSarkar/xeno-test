const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const shopDomain = 'xeno-fde-test1.myshopify.com';
    const email = 'xeno-fde-test1@shopify.com';
    const name = 'xeno-fde-test1';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
    const tenant = await prisma.tenant.upsert({
      where: { shopDomain },
      update: { accessToken, active: true },
      create: { name, email, password: 'placeholder', shopDomain, accessToken, active: true }
    });
    console.log('Upserted tenant:', { id: tenant.id, shopDomain: tenant.shopDomain, email: tenant.email });
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
