const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Create test tenant
  const tenant = await prisma.tenant.upsert({
    where: { email: "test@xeno-fde.com" },
    update: {},
    create: {
      name: "Xeno FDE Test Store",
      email: "test@xeno-fde.com",
      shopDomain: "xeno-fde-test1.myshopify.com",
      accessToken: "your-shopify-access-token-here",
    },
  })

  console.log("✅ Created tenant:", tenant.name)

  // Create test store
  const store = await prisma.store.upsert({
    where: {
      tenantId_shopDomain: {
        tenantId: tenant.id,
        shopDomain: tenant.shopDomain,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      shopDomain: tenant.shopDomain,
      accessToken: tenant.accessToken,
    },
  })

  console.log("✅ Created store:", store.shopDomain)

  // Create test customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId: tenant.id,
          shopifyId: "1001",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        shopifyId: "1001",
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
      },
    }),
    prisma.customer.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId: tenant.id,
          shopifyId: "1002",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        shopifyId: "1002",
        email: "jane.smith@example.com",
        firstName: "Jane",
        lastName: "Smith",
      },
    }),
  ])

  console.log("✅ Created customers:", customers.length)

  // Create test products
  const products = await Promise.all([
    prisma.product.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId: tenant.id,
          shopifyId: "2001",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        shopifyId: "2001",
        title: "Premium T-Shirt",
        sku: "TSHIRT-001",
        price: 29.99,
        vendor: "Xeno Apparel",
        productType: "Clothing",
        tags: ["apparel", "cotton", "premium"],
      },
    }),
    prisma.product.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId: tenant.id,
          shopifyId: "2002",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        shopifyId: "2002",
        title: "Wireless Headphones",
        sku: "HEADPHONES-001",
        price: 149.99,
        vendor: "Xeno Electronics",
        productType: "Electronics",
        tags: ["electronics", "wireless", "audio"],
      },
    }),
  ])

  console.log("✅ Created products:", products.length)

  // Create test orders
  const orders = await Promise.all([
    prisma.order.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId: tenant.id,
          shopifyId: "3001",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        shopifyId: "3001",
        customerShopifyId: "1001",
        customerId: customers[0].id,
        orderNumber: "#1001",
        email: "john.doe@example.com",
        totalPrice: 32.99,
        subtotalPrice: 29.99,
        taxPrice: 3.0,
        currency: "USD",
        financialStatus: "paid",
        fulfillmentStatus: "fulfilled",
      },
    }),
    prisma.order.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId: tenant.id,
          shopifyId: "3002",
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        shopifyId: "3002",
        customerShopifyId: "1002",
        customerId: customers[1].id,
        orderNumber: "#1002",
        email: "jane.smith@example.com",
        totalPrice: 164.99,
        subtotalPrice: 149.99,
        taxPrice: 15.0,
        currency: "USD",
        financialStatus: "paid",
        fulfillmentStatus: "pending",
      },
    }),
  ])

  console.log("✅ Created orders:", orders.length)

  console.log("🎉 Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
