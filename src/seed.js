import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create DeFi pools
  console.log('Creating DeFi pools...');
  const midenPool = await prisma.deFiPool.upsert({
  where: { poolId: 'miden-pool' },
  update: {},
  create: {
    poolId: 'miden-pool',
    name: 'MIDEN Lending Pool',
    asset: 'MIDEN',
      apy: 5.2,
      totalDeposited: 1000000,
      isActive: true,
      appId: 123456789,
    },
  });

  const usdcPool = await prisma.deFiPool.upsert({
    where: { poolId: 'usdc-pool' },
    update: {},
    create: {
      poolId: 'usdc-pool',
      name: 'USDC Lending Pool',
      asset: 'USDC',
      apy: 8.7,
      totalDeposited: 500000,
      isActive: true,
      appId: 123456790,
    },
  });

  console.log('✅ DeFi pools created:', { midenPool, usdcPool });

  // Create sample users
  console.log('Creating sample users...');
  const user1 = await prisma.user.upsert({
    where: { walletAddress: 'mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw' },
    update: {},
    create: {
      walletAddress: 'mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+62812345678',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { walletAddress: 'mtst1qxyz123456789abcdefghijklmnopqrstuvwxyz' },
    update: {},
    create: {
      walletAddress: 'mtst1qxyz123456789abcdefghijklmnopqrstuvwxyz',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+62887654321',
    },
  });

  console.log('✅ Sample users created:', { user1, user2 });

  // Create sample stores
  console.log('Creating sample stores...');
  const store1 = await prisma.store.upsert({
    where: { walletAddress: 'mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw' },
    update: {},
    create: {
      storeId: 'mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw',
      walletAddress: 'mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw',
      name: 'Warung Pak John',
      address: 'Jl. Merdeka No. 123, Jakarta',
      phone: '+62812345678',
      whatsappNumber: '+62812345678',
      currency: 'IDR',
      language: 'INDONESIAN',
      userId: user1.id,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { walletAddress: 'mtst1qxyz123456789abcdefghijklmnopqrstuvwxyz' },
    update: {},
    create: {
      storeId: 'mtst1qxyz123456789abcdefghijklmnopqrstuvwxyz',
      walletAddress: 'mtst1qxyz123456789abcdefghijklmnopqrstuvwxyz',
      name: 'Toko Bu Jane',
      address: 'Jl. Sudirman No. 456, Jakarta',
      phone: '+62887654321',
      whatsappNumber: '+62887654321',
      currency: 'IDR',
      language: 'INDONESIAN',
      userId: user2.id,
    },
  });

  console.log('✅ Sample stores created:', { store1, store2 });

  // Create sample products
  console.log('Creating sample products...');
  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: 'prod-1' },
      update: {},
      create: {
        id: 'prod-1',
        name: 'Beras 5kg',
        nameEn: 'Rice 5kg',
        price: 65000,
        category: 'Sembako',
        stock: 50,
        barcode: '1234567890123',
        storeId: store1.id,
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-2' },
      update: {},
      create: {
        id: 'prod-2',
        name: 'Minyak Goreng 1L',
        nameEn: 'Cooking Oil 1L',
        price: 18000,
        category: 'Sembako',
        stock: 30,
        barcode: '1234567890124',
        storeId: store1.id,
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-3' },
      update: {},
      create: {
        id: 'prod-3',
        name: 'Gula Pasir 1kg',
        nameEn: 'Sugar 1kg',
        price: 14000,
        category: 'Sembako',
        stock: 25,
        barcode: '1234567890125',
        storeId: store1.id,
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-4' },
      update: {},
      create: {
        id: 'prod-4',
        name: 'Indomie Goreng',
        nameEn: 'Indomie Fried Noodles',
        price: 3500,
        category: 'Makanan',
        stock: 100,
        barcode: '1234567890126',
        storeId: store1.id,
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-5' },
      update: {},
      create: {
        id: 'prod-5',
        name: 'Aqua 600ml',
        nameEn: 'Aqua Water 600ml',
        price: 3000,
        category: 'Minuman',
        stock: 80,
        barcode: '1234567890127',
        storeId: store1.id,
      },
    }),
    // Products for store 2
    prisma.product.upsert({
      where: { id: 'prod-6' },
      update: {},
      create: {
        id: 'prod-6',
        name: 'Rokok Filter',
        nameEn: 'Filter Cigarettes',
        price: 25000,
        category: 'Rokok',
        stock: 200,
        barcode: '1234567890128',
        storeId: store2.id,
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-7' },
      update: {},
      create: {
        id: 'prod-7',
        name: 'Kopi Hitam',
        nameEn: 'Black Coffee',
        price: 5000,
        category: 'Minuman',
        stock: 60,
        barcode: '1234567890129',
        storeId: store2.id,
      },
    }),
  ]);

  console.log('✅ Sample products created:', products.length, 'products');

  // Create sample customers
  console.log('Creating sample customers...');
  const customer1 = await prisma.customer.upsert({
    where: { phone: '+62811111111' },
    update: {},
    create: {
      name: 'Ahmad',
      phone: '+62811111111',
      email: 'ahmad@example.com',
      preferredNotification: 'WHATSAPP',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { phone: '+62822222222' },
    update: {},
    create: {
      name: 'Siti',
      phone: '+62822222222',
      email: 'siti@example.com',
      preferredNotification: 'TELEGRAM',
    },
  });

  console.log('✅ Sample customers created:', { customer1, customer2 });

  // Create sample transactions
  console.log('Creating sample transactions...');
  const transaction1 = await prisma.transaction.create({
    data: {
      total: 83000,
      paymentMethod: 'CASH',
      paymentStatus: 'COMPLETED',
      change: 17000,
      storeId: store1.id,
      userId: user1.id,
      customerId: customer1.id,
      items: {
        create: [
          {
            quantity: 1,
            price: 65000,
            subtotal: 65000,
            productId: 'prod-1',
          },
          {
            quantity: 1,
            price: 18000,
            subtotal: 18000,
            productId: 'prod-2',
          },
        ],
      },
    },
  });

  const transaction2 = await prisma.transaction.create({
    data: {
      total: 3500,
      paymentMethod: 'CRYPTO',
      paymentStatus: 'COMPLETED',
      cryptoCurrency: 'MIDEN',
      cryptoAmount: 0.14,
      txHash: 'ABC123DEF456',
      storeId: store1.id,
      userId: user1.id,
      items: {
        create: [
          {
            quantity: 1,
            price: 3500,
            subtotal: 3500,
            productId: 'prod-4',
          },
        ],
      },
    },
  });

  const transaction3 = await prisma.transaction.create({
    data: {
      total: 30000,
      paymentMethod: 'CARD',
      paymentStatus: 'COMPLETED',
      storeId: store2.id,
      userId: user2.id,
      customerId: customer2.id,
      items: {
        create: [
          {
            quantity: 1,
            price: 25000,
            subtotal: 25000,
            productId: 'prod-6',
          },
          {
            quantity: 1,
            price: 5000,
            subtotal: 5000,
            productId: 'prod-7',
          },
        ],
      },
    },
  });

  console.log('✅ Sample transactions created:', { transaction1, transaction2, transaction3 });

  // Create sample DeFi positions
  console.log('Creating sample DeFi positions...');
  const defiPosition1 = await prisma.deFiPosition.create({
    data: {
      poolId: 'miden-pool',
      amount: 100,
      value: 25,
      rewards: 1.2,
      txHash: 'DEF456GHI789',
      storeId: store1.id,
      userId: user1.id,
    },
  });

  const defiPosition2 = await prisma.deFiPosition.create({
    data: {
      poolId: 'usdc-pool',
      amount: 500,
      value: 500,
      rewards: 8.7,
      txHash: 'GHI789JKL012',
      storeId: store2.id,
      userId: user2.id,
    },
  });

  console.log('✅ Sample DeFi positions created:', { defiPosition1, defiPosition2 });

  // Create marketplace stats
  console.log('Creating marketplace stats...');
  const marketplaceStats = await prisma.marketplaceStats.create({
    data: {
      totalStores: 2,
      totalTransactions: 3,
      totalVolume: 116500,
      totalDefiValue: 525,
      activeStores: 2,
      lastUpdated: new Date(),
    },
  });

  console.log('✅ Marketplace stats created:', marketplaceStats);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 