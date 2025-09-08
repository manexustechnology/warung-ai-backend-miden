import express from 'express';
import { prisma } from '../index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all stores for marketplace
router.get('/stores', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      sortBy = 'lastActive',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { walletAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && category !== 'all') {
      where.products = {
        some: {
          category,
          isActive: true,
        },
      };
    }

    // Build order by
    let orderBy = {};
    switch (sortBy) {
      case 'name':
        orderBy.name = sortOrder;
        break;
      case 'lastActive':
        orderBy.lastActive = sortOrder;
        break;
      case 'createdAt':
        orderBy.createdAt = sortOrder;
        break;
      default:
        orderBy.lastActive = 'desc';
    }

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          _count: {
            select: {
              products: {
                where: { isActive: true },
              },
              transactions: true,
              defiPositions: true,
            },
          },
          products: {
            where: { isActive: true },
            take: 5,
            orderBy: { name: 'asc' },
          },
          transactions: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              total: true,
              paymentStatus: true,
              createdAt: true,
            },
          },
        },
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.store.count({ where }),
    ]);

    // Calculate additional stats for each store
    const storesWithStats = stores.map(store => {
      const totalEarnings = store.transactions
        .filter(t => t.paymentStatus === 'COMPLETED')
        .reduce((sum, t) => sum + Number(t.total), 0);

      const totalDefiValue = 0; // This would be calculated from defiPositions if needed

      return {
        ...store,
        totalEarnings,
        totalDefiValue,
        averageTransactionValue: store.transactions.length > 0 
          ? totalEarnings / store.transactions.length 
          : 0,
      };
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      stores: storesWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error('Get marketplace stores error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get marketplace stores',
    });
  }
});

// Get marketplace statistics
router.get('/stats', async (req, res) => {
  try {
    // Get or create marketplace stats
    let stats = await prisma.marketplaceStats.findFirst({
      orderBy: { lastUpdated: 'desc' },
    });

    if (!stats) {
      // Calculate stats from actual data
      const [stores, transactions, defiPositions] = await Promise.all([
        prisma.store.findMany({
          where: { isActive: true },
          include: {
            _count: {
              select: {
                transactions: true,
                defiPositions: true,
              },
            },
            transactions: {
              where: { paymentStatus: 'COMPLETED' },
              select: { total: true },
            },
            defiPositions: {
              select: { value: true },
            },
          },
        }),
        prisma.transaction.findMany({
          where: { paymentStatus: 'COMPLETED' },
          select: { total: true },
        }),
        prisma.deFiPosition.findMany({
          select: { value: true },
        }),
      ]);

      const totalStores = stores.length;
      const totalTransactions = transactions.length;
      const totalVolume = transactions.reduce((sum, t) => sum + Number(t.total), 0);
      const totalDefiValue = defiPositions.reduce((sum, p) => sum + Number(p.value), 0);
      
      // Count active stores (active in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeStores = stores.filter(store => 
        store.lastActive > sevenDaysAgo
      ).length;

      stats = await prisma.marketplaceStats.create({
        data: {
          totalStores,
          totalTransactions,
          totalVolume,
          totalDefiValue,
          activeStores,
          lastUpdated: new Date(),
        },
      });
    }

    res.json({
      stats,
    });
  } catch (error) {
    console.error('Get marketplace stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get marketplace statistics',
    });
  }
});

// Get store details for marketplace
router.get('/stores/:storeId', optionalAuth, async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        transactions: {
          where: { paymentStatus: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            total: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
        defiPositions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
            transactions: true,
            defiPositions: true,
          },
        },
      },
    });

    if (!store || !store.isActive) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Store not found or inactive',
      });
    }

    // Calculate store statistics
    const totalEarnings = store.transactions.reduce((sum, t) => sum + Number(t.total), 0);
    const totalDefiValue = store.defiPositions.reduce((sum, p) => sum + Number(p.value), 0);
    const averageTransactionValue = store.transactions.length > 0 
      ? totalEarnings / store.transactions.length 
      : 0;

    // Get product categories
    const categories = await prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
      },
      select: { category: true },
      distinct: ['category'],
    });

    const storeWithStats = {
      ...store,
      totalEarnings,
      totalDefiValue,
      averageTransactionValue,
      categories: categories.map(c => c.category),
    };

    res.json({
      store: storeWithStats,
    });
  } catch (error) {
    console.error('Get store details error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get store details',
    });
  }
});

// Get store products for marketplace
router.get('/stores/:storeId/products', optionalAuth, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search, 
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify store exists and is active
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, isActive: true },
    });

    if (!store || !store.isActive) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Store not found or inactive',
      });
    }

    // Build where clause
    const where = {
      storeId,
      isActive: true,
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build order by
    let orderBy = {};
    switch (sortBy) {
      case 'name':
        orderBy.name = sortOrder;
        break;
      case 'price':
        orderBy.price = sortOrder;
        break;
      case 'category':
        orderBy.category = sortOrder;
        break;
      default:
        orderBy.name = 'asc';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error('Get store products error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get store products',
    });
  }
});

// Get product categories for marketplace
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.product.findMany({
      where: {
        isActive: true,
        store: {
          isActive: true,
        },
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    const categoryList = categories.map(c => c.category);

    res.json({
      categories: categoryList,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get categories',
    });
  }
});

// Search stores and products
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Search query is required',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchTerm = q.trim();

    let results = {};

    if (type === 'all' || type === 'stores') {
      const stores = await prisma.store.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { walletAddress: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          _count: {
            select: {
              products: {
                where: { isActive: true },
              },
              transactions: true,
            },
          },
        },
        orderBy: { lastActive: 'desc' },
        skip,
        take: parseInt(limit),
      });

      results.stores = stores;
    }

    if (type === 'all' || type === 'products') {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          store: {
            isActive: true,
          },
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { nameEn: { contains: searchTerm, mode: 'insensitive' } },
            { category: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              walletAddress: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit),
      });

      results.products = products;
    }

    res.json({
      results,
      query: searchTerm,
      type,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to perform search',
    });
  }
});

// Get trending stores (most active in last 30 days)
router.get('/trending', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const trendingStores = await prisma.store.findMany({
      where: {
        isActive: true,
        lastActive: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        _count: {
          select: {
            transactions: {
              where: {
                createdAt: {
                  gte: thirtyDaysAgo,
                },
              },
            },
            products: {
              where: { isActive: true },
            },
          },
        },
        transactions: {
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
            paymentStatus: 'COMPLETED',
          },
          select: { total: true },
        },
      },
      orderBy: {
        transactions: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    const storesWithStats = trendingStores.map(store => {
      const recentEarnings = store.transactions.reduce((sum, t) => sum + Number(t.total), 0);
      return {
        ...store,
        recentEarnings,
        averageTransactionValue: store.transactions.length > 0 
          ? recentEarnings / store.transactions.length 
          : 0,
      };
    });

    res.json({
      trendingStores: storesWithStats,
    });
  } catch (error) {
    console.error('Get trending stores error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get trending stores',
    });
  }
});

export default router; 