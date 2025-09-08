import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index.js';
import { authenticateJWT, verifyStoreOwnership } from '../middleware/auth.js';

const router = express.Router();

// Get all stores for current user
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        products: {
          where: { isActive: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        defiPositions: true,
        _count: {
          select: {
            products: true,
            transactions: true,
            defiPositions: true,
          },
        },
      },
      orderBy: { lastActive: 'desc' },
    });

    res.json({
      stores,
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get stores',
    });
  }
});

// Get single store by ID or wallet address
router.get('/:storeId', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /stores/:storeId - Request received');
    console.log('storeId parameter:', req.params.storeId);
    console.log('User:', req.user?.id);
    
    // Try to find store by ID first, then by wallet address
    let store = await prisma.store.findUnique({
      where: { id: req.params.storeId },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            customer: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        defiPositions: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            products: true,
            transactions: true,
            defiPositions: true,
          },
        },
      },
    });

    console.log('Store found by ID:', store ? { id: store.id, walletAddress: store.walletAddress } : 'Not found');

    // If not found by ID, try by wallet address
    if (!store) {
      store = await prisma.store.findUnique({
        where: { walletAddress: req.params.storeId },
        include: {
          products: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
            include: {
              customer: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
          defiPositions: {
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              products: true,
              transactions: true,
              defiPositions: true,
            },
          },
        },
      });
    }

    console.log('Store found by wallet address:', store ? { id: store.id, walletAddress: store.walletAddress } : 'Not found');

    if (!store) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Store not found',
      });
    }

    console.log('Returning store data for:', { id: store.id, walletAddress: store.walletAddress, name: store.name });

    res.json({
      store,
    });
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get store',
    });
  }
});

// Create new store
router.post('/', [
  body('name').isString().notEmpty(),
  body('walletAddress').isString().notEmpty(),
  body('address').optional().isString(),
  body('phone').optional().isString(),
  body('whatsappNumber').optional().isString(),
  body('telegramBotToken').optional().isString(),
  body('currency').optional().isIn(['IDR', 'USD']),
  body('language').optional().isIn(['INDONESIAN', 'ENGLISH']),
], authenticateJWT, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: errors.array(),
      });
    }

    const {
      name,
      walletAddress,
      address,
      phone,
      whatsappNumber,
      telegramBotToken,
      currency = 'IDR',
      language = 'INDONESIAN',
    } = req.body;

    // Check if store with this wallet address already exists
    const existingStore = await prisma.store.findUnique({
      where: { walletAddress },
    });

    if (existingStore) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Store with this wallet address already exists',
      });
    }

    // Create store
    const store = await prisma.store.create({
      data: {
        storeId: walletAddress, // Use wallet address as store ID
        walletAddress,
        name,
        address,
        phone,
        whatsappNumber,
        telegramBotToken,
        currency,
        language,
        userId: req.user.id,
      },
      include: {
        products: true,
        transactions: true,
        defiPositions: true,
      },
    });

    res.status(201).json({
      message: 'Store created successfully',
      store,
    });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create store',
    });
  }
});

// Update store
router.put('/:storeId', [
  body('name').optional().isString().notEmpty(),
  body('address').optional().isString(),
  body('phone').optional().isString(),
  body('whatsappNumber').optional().isString(),
  body('telegramBotToken').optional().isString(),
  body('currency').optional().isIn(['IDR', 'USD']),
  body('language').optional().isIn(['INDONESIAN', 'ENGLISH']),
  body('isActive').optional().isBoolean(),
], authenticateJWT, async (req, res) => {
  try {
    console.log('PUT /stores/:storeId - Request received');
    console.log('storeId parameter:', req.params.storeId);
    console.log('Request body:', req.body);
    console.log('User:', req.user?.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body that failed validation:', req.body);
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: errors.array(),
      });
    }

    const {
      name,
      address,
      phone,
      whatsappNumber,
      telegramBotToken,
      currency,
      language,
      isActive,
    } = req.body;

    // Try to find store by ID first, then by wallet address
    let store = await prisma.store.findFirst({
      where: {
        OR: [
          { id: req.params.storeId },
          { walletAddress: req.params.storeId }
        ]
      }
    });

    console.log('Store found:', store ? { id: store.id, walletAddress: store.walletAddress } : 'Not found');

    if (!store) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Store not found',
      });
    }

    // Verify ownership
    if (store.userId !== req.user.id) {
      console.log('Ownership verification failed:', { storeUserId: store.userId, reqUserId: req.user.id });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied',
      });
    }

    // Update the store
    store = await prisma.store.update({
      where: { id: store.id },
      data: {
        name,
        address,
        phone,
        whatsappNumber,
        telegramBotToken,
        currency,
        language,
        isActive,
        lastActive: new Date(),
      },
      include: {
        products: true,
        transactions: true,
        defiPositions: true,
      },
    });

    console.log('Store updated successfully:', { id: store.id, name: store.name });

    res.json({
      message: 'Store updated successfully',
      store,
    });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update store',
    });
  }
});

// Delete store
router.delete('/:storeId', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    await prisma.store.delete({
      where: { id: req.params.storeId },
    });

    res.json({
      message: 'Store deleted successfully',
    });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete store',
    });
  }
});

// Get store statistics
router.get('/:storeId/stats', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const storeId = req.params.storeId;

    // Get store with aggregated data
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        _count: {
          select: {
            products: true,
            transactions: true,
            defiPositions: true,
          },
        },
        transactions: {
          select: {
            total: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
        defiPositions: {
          select: {
            value: true,
            rewards: true,
          },
        },
      },
    });

    if (!store) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Store not found',
      });
    }

    // Calculate statistics
    const totalEarnings = store.transactions
      .filter(t => t.paymentStatus === 'COMPLETED')
      .reduce((sum, t) => sum + Number(t.total), 0);

    const totalDefiValue = store.defiPositions
      .reduce((sum, p) => sum + Number(p.value), 0);

    const totalRewards = store.defiPositions
      .reduce((sum, p) => sum + Number(p.rewards), 0);

    const recentTransactions = store.transactions
      .filter(t => t.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      .length;

    const stats = {
      totalProducts: store._count.products,
      totalTransactions: store._count.transactions,
      totalDefiPositions: store._count.defiPositions,
      totalEarnings,
      totalDefiValue,
      totalRewards,
      recentTransactions,
      averageTransactionValue: store._count.transactions > 0 
        ? totalEarnings / store._count.transactions 
        : 0,
    };

    res.json({
      stats,
    });
  } catch (error) {
    console.error('Get store stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get store statistics',
    });
  }
});

// Update store last active timestamp
router.patch('/:storeId/activity', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    await prisma.store.update({
      where: { id: req.params.storeId },
      data: {
        lastActive: new Date(),
      },
    });

    res.json({
      message: 'Store activity updated',
    });
  } catch (error) {
    console.error('Update store activity error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update store activity',
    });
  }
});

export default router; 