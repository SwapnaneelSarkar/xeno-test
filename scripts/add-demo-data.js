const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Demo data for test7@gmail.co account
const DEMO_DATA = {
  tenant: {
    email: 'test7@gmail.co',
    shopDomain: 'xeno-shop-3'
  },
  customers: [
    {
      shopifyId: '1001',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1-555-0101'
    },
    {
      shopifyId: '1002',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1-555-0102'
    },
    {
      shopifyId: '1003',
      email: 'mike.johnson@example.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      phone: '+1-555-0103'
    },
    {
      shopifyId: '1004',
      email: 'sarah.wilson@example.com',
      firstName: 'Sarah',
      lastName: 'Wilson',
      phone: '+1-555-0104'
    },
    {
      shopifyId: '1005',
      email: 'david.brown@example.com',
      firstName: 'David',
      lastName: 'Brown',
      phone: '+1-555-0105'
    },
    {
      shopifyId: '1006',
      email: 'lisa.garcia@example.com',
      firstName: 'Lisa',
      lastName: 'Garcia',
      phone: '+1-555-0106'
    },
    {
      shopifyId: '1007',
      email: 'robert.miller@example.com',
      firstName: 'Robert',
      lastName: 'Miller',
      phone: '+1-555-0107'
    },
    {
      shopifyId: '1008',
      email: 'emily.davis@example.com',
      firstName: 'Emily',
      lastName: 'Davis',
      phone: '+1-555-0108'
    }
  ],
  products: [
    {
      shopifyId: '2001',
      title: 'Premium Wireless Headphones',
      sku: 'WH-001',
      price: 299.99,
      handle: 'premium-wireless-headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      vendor: 'TechBrand',
      productType: 'Electronics',
      tags: ['electronics', 'audio', 'wireless', 'premium']
    },
    {
      shopifyId: '2002',
      title: 'Smart Fitness Watch',
      sku: 'SFW-002',
      price: 199.99,
      handle: 'smart-fitness-watch',
      description: 'Advanced fitness tracking with heart rate monitoring',
      vendor: 'TechBrand',
      productType: 'Wearables',
      tags: ['fitness', 'smartwatch', 'health', 'tracking']
    },
    {
      shopifyId: '2003',
      title: 'Organic Cotton T-Shirt',
      sku: 'OCT-003',
      price: 29.99,
      handle: 'organic-cotton-t-shirt',
      description: 'Comfortable organic cotton t-shirt in various colors',
      vendor: 'EcoWear',
      productType: 'Clothing',
      tags: ['clothing', 'organic', 'cotton', 'sustainable']
    },
    {
      shopifyId: '2004',
      title: 'Bluetooth Speaker',
      sku: 'BTS-004',
      price: 79.99,
      handle: 'bluetooth-speaker',
      description: 'Portable Bluetooth speaker with 360-degree sound',
      vendor: 'AudioTech',
      productType: 'Electronics',
      tags: ['electronics', 'audio', 'bluetooth', 'portable']
    },
    {
      shopifyId: '2005',
      title: 'Yoga Mat Pro',
      sku: 'YMP-005',
      price: 49.99,
      handle: 'yoga-mat-pro',
      description: 'Professional-grade yoga mat with superior grip',
      vendor: 'FitLife',
      productType: 'Fitness',
      tags: ['fitness', 'yoga', 'exercise', 'wellness']
    },
    {
      shopifyId: '2006',
      title: 'Coffee Maker Deluxe',
      sku: 'CMD-006',
      price: 149.99,
      handle: 'coffee-maker-deluxe',
      description: 'Programmable coffee maker with built-in grinder',
      vendor: 'KitchenPro',
      productType: 'Appliances',
      tags: ['kitchen', 'coffee', 'appliance', 'programmable']
    },
    {
      shopifyId: '2007',
      title: 'Leather Wallet',
      sku: 'LW-007',
      price: 89.99,
      handle: 'leather-wallet',
      description: 'Genuine leather wallet with RFID protection',
      vendor: 'LeatherCraft',
      productType: 'Accessories',
      tags: ['accessories', 'leather', 'wallet', 'rfid']
    },
    {
      shopifyId: '2008',
      title: 'Wireless Charging Pad',
      sku: 'WCP-008',
      price: 39.99,
      handle: 'wireless-charging-pad',
      description: 'Fast wireless charging pad for smartphones',
      vendor: 'TechBrand',
      productType: 'Electronics',
      tags: ['electronics', 'charging', 'wireless', 'smartphone']
    }
  ],
  orders: [
    {
      shopifyId: '3001',
      customerShopifyId: '1001',
      orderNumber: '1001',
      email: 'john.doe@example.com',
      totalPrice: 329.98,
      subtotalPrice: 299.99,
      taxPrice: 29.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: new Date('2024-09-01T10:30:00Z')
    },
    {
      shopifyId: '3002',
      customerShopifyId: '1002',
      orderNumber: '1002',
      email: 'jane.smith@example.com',
      totalPrice: 229.98,
      subtotalPrice: 199.99,
      taxPrice: 29.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: new Date('2024-09-02T14:15:00Z')
    },
    {
      shopifyId: '3003',
      customerShopifyId: '1003',
      orderNumber: '1003',
      email: 'mike.johnson@example.com',
      totalPrice: 59.98,
      subtotalPrice: 29.99,
      taxPrice: 29.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'pending',
      createdAt: new Date('2024-09-03T09:45:00Z')
    },
    {
      shopifyId: '3004',
      customerShopifyId: '1004',
      orderNumber: '1004',
      email: 'sarah.wilson@example.com',
      totalPrice: 109.98,
      subtotalPrice: 79.99,
      taxPrice: 29.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: new Date('2024-09-04T16:20:00Z')
    },
    {
      shopifyId: '3005',
      customerShopifyId: '1005',
      orderNumber: '1005',
      email: 'david.brown@example.com',
      totalPrice: 79.98,
      subtotalPrice: 49.99,
      taxPrice: 29.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: new Date('2024-09-05T11:30:00Z')
    },
    {
      shopifyId: '3006',
      customerShopifyId: '1006',
      orderNumber: '1006',
      email: 'lisa.garcia@example.com',
      totalPrice: 179.98,
      subtotalPrice: 149.99,
      taxPrice: 29.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: new Date('2024-09-06T13:45:00Z')
    },
    {
      shopifyId: '3007',
      customerShopifyId: '1007',
      orderNumber: '1007',
      email: 'robert.miller@example.com',
      totalPrice: 119.98,
      subtotalPrice: 89.99,
      taxPrice: 29.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: new Date('2024-09-07T08:15:00Z')
    },
    {
      shopifyId: '3008',
      customerShopifyId: '1008',
      orderNumber: '1008',
      email: 'emily.davis@example.com',
      totalPrice: 69.98,
      subtotalPrice: 39.99,
      taxPrice: 29.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: new Date('2024-09-08T15:30:00Z')
    },
    {
      shopifyId: '3009',
      customerShopifyId: '1001',
      orderNumber: '1009',
      email: 'john.doe@example.com',
      totalPrice: 199.98,
      subtotalPrice: 199.99,
      taxPrice: 0.00,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: new Date('2024-09-09T12:00:00Z')
    },
    {
      shopifyId: '3010',
      customerShopifyId: '1002',
      orderNumber: '1010',
      email: 'jane.smith@example.com',
      totalPrice: 89.98,
      subtotalPrice: 49.99,
      taxPrice: 39.99,
      currency: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: new Date('2024-09-10T17:45:00Z')
    }
  ]
};

async function addDemoData() {
  try {
    console.log('🚀 Starting demo data insertion...');

    // Find the tenant
    const tenant = await prisma.tenant.findUnique({
      where: { email: DEMO_DATA.tenant.email }
    });

    if (!tenant) {
      console.error('❌ Tenant not found. Please register the account first.');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.name} (${tenant.email})`);

    // Add customers
    console.log('👥 Adding customers...');
    for (const customerData of DEMO_DATA.customers) {
      await prisma.customer.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId: tenant.id,
            shopifyId: customerData.shopifyId
          }
        },
        update: customerData,
        create: {
          ...customerData,
          tenantId: tenant.id
        }
      });
    }
    console.log(`✅ Added ${DEMO_DATA.customers.length} customers`);

    // Add products
    console.log('📦 Adding products...');
    for (const productData of DEMO_DATA.products) {
      await prisma.product.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId: tenant.id,
            shopifyId: productData.shopifyId
          }
        },
        update: productData,
        create: {
          ...productData,
          tenantId: tenant.id
        }
      });
    }
    console.log(`✅ Added ${DEMO_DATA.products.length} products`);

    // Add orders
    console.log('🛒 Adding orders...');
    for (const orderData of DEMO_DATA.orders) {
      // Find the customer for this order
      const customer = await prisma.customer.findFirst({
        where: {
          tenantId: tenant.id,
          shopifyId: orderData.customerShopifyId
        }
      });

      await prisma.order.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId: tenant.id,
            shopifyId: orderData.shopifyId
          }
        },
        update: {
          ...orderData,
          customerId: customer?.id
        },
        create: {
          ...orderData,
          tenantId: tenant.id,
          customerId: customer?.id
        }
      });
    }
    console.log(`✅ Added ${DEMO_DATA.orders.length} orders`);

    // Update tenant sync timestamps
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        lastCustomerSync: new Date(),
        lastProductSync: new Date(),
        lastOrderSync: new Date()
      }
    });

    console.log('🎉 Demo data insertion completed successfully!');
    
    // Display summary
    const summary = await prisma.tenant.findUnique({
      where: { id: tenant.id },
      include: {
        customers: true,
        products: true,
        orders: true
      }
    });

    console.log('\n📊 Data Summary:');
    console.log(`- Customers: ${summary.customers.length}`);
    console.log(`- Products: ${summary.products.length}`);
    console.log(`- Orders: ${summary.orders.length}`);
    
    const totalRevenue = summary.orders.reduce((sum, order) => sum + Number(order.totalPrice), 0);
    console.log(`- Total Revenue: $${totalRevenue.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error adding demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addDemoData();
