import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index.js';
import { authenticateJWT, verifyStoreOwnership } from '../middleware/auth.js';

const router = express.Router();

// Get all transactions for a store
router.get('/store/:storeId', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentMethod, 
      startDate, 
      endDate,
      search 
    } = req.query;

    console.log('Get transactions request received:', {
      storeId: storeId,
      user: req.user ? { id: req.user.id, walletAddress: req.user.walletAddress } : 'No user',
      store: req.store ? { id: req.store.id, walletAddress: req.store.walletAddress } : 'No store'
    });

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      storeId: req.store.id, // Use the store ID from middleware, not the wallet address
    };

    if (status) {
      where.paymentStatus = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { txHash: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      transactions,
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
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get transactions',
    });
  }
});

// Get single transaction
router.get('/:transactionId', authenticateJWT, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.transactionId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
          },
        },
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Transaction not found',
      });
    }

    // Check if user owns the store
    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        stores: {
          some: {
            id: transaction.storeId,
          },
        },
      },
    });

    if (!user) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this transaction',
      });
    }

    res.json({
      transaction,
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get transaction',
    });
  }
});

// Create new transaction
router.post('/store/:storeId', [
  body('total').isFloat({ min: 0 }),
  body('paymentMethod').isIn(['CASH', 'CARD', 'CRYPTO']),
  body('paymentStatus').optional().isIn(['PENDING', 'COMPLETED', 'FAILED']),
  body('txHash').optional().isString(),
  body('change').optional().isFloat({ min: 0 }),
  body('cryptoCurrency').optional().isIn(['MIDEN']),
  body('cryptoAmount').optional().isFloat({ min: 0 }),
  body('cardInfo').optional().isObject(),
  body('cardInfo.cardType').optional().isString(),
  body('cardInfo.lastFourDigits').optional().isString(),
  body('cardInfo.cardHolderName').optional().isString(),
  body('cardInfo.expiryDate').optional().isString(),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isString(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.price').isFloat({ min: 0 }),
  body('items.*.subtotal').isFloat({ min: 0 }),
  body('customer').optional().isObject(),
  body('customer.name').optional().isString(),
  body('customer.phone').optional().isString(),
  body('customer.email').optional().isEmail(),
  body('customer.preferredNotification').optional().isIn(['WHATSAPP', 'TELEGRAM']),
], authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    console.log('Create transaction request received:', {
      storeId: req.params.storeId,
      user: req.user ? { id: req.user.id, walletAddress: req.user.walletAddress } : 'No user',
      store: req.store ? { id: req.store.id, walletAddress: req.store.walletAddress } : 'No store',
      requestBody: req.body
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: errors.array(),
      });
    }

    const { storeId } = req.params;
    const {
      total,
      paymentMethod,
      paymentStatus = 'PENDING',
      txHash,
      change,
      cryptoCurrency,
      cryptoAmount,
      cardInfo,
      items,
      customer: customerData,
    } = req.body;

    // Verify all products exist and belong to the store
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: req.store.id, // Use the store ID from middleware, not the wallet address
        isActive: true,
      },
    });

    if (products.length !== items.length) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Some products do not exist or are not active',
      });
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: 'Bad request',
          message: `Insufficient stock for product: ${product.name}`,
        });
      }
    }

    // Create transaction with all related data
    const transaction = await prisma.$transaction(async (tx) => {
      // Create or find customer
      let customer = null;
      if (customerData) {
        customer = await tx.customer.upsert({
          where: { phone: customerData.phone },
          update: customerData,
          create: customerData,
        });
      }

      // Create transaction
      const newTransaction = await tx.transaction.create({
        data: {
          total,
          paymentMethod,
          paymentStatus,
          txHash,
          change,
          cryptoCurrency,
          cryptoAmount,
          cardType: cardInfo?.cardType,
          lastFourDigits: cardInfo?.lastFourDigits,
          cardHolderName: cardInfo?.cardHolderName,
          expiryDate: cardInfo?.expiryDate,
          timestamp: new Date(), // Set payment timestamp
          storeId: req.store.id, // Use the store ID from middleware, not the wallet address
          customerId: customer?.id,
          userId: req.user.id,
        },
      });

      // Create transaction items
      const transactionItems = await Promise.all(
        items.map(item =>
          tx.transactionItem.create({
            data: {
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              transactionId: newTransaction.id,
              productId: item.productId,
            },
          })
        )
      );

      // Update product stock
      await Promise.all(
        items.map(item =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          })
        )
      );

      return {
        ...newTransaction,
        items: transactionItems,
        customer,
      };
    });

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create transaction',
    });
  }
});

// Update transaction status
router.patch('/:transactionId/status', [
  body('paymentStatus').isIn(['PENDING', 'COMPLETED', 'FAILED']),
  body('txHash').optional().isString(),
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

    const { transactionId } = req.params;
    const { paymentStatus, txHash } = req.body;

    // Check if transaction exists and user has access
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        store: {
          userId: req.user.id,
        },
      },
    });

    if (!existingTransaction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Transaction not found or access denied',
      });
    }

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentStatus,
        txHash,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json({
      message: 'Transaction status updated successfully',
      transaction,
    });
  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update transaction status',
    });
  }
});

// Mark receipt as sent
router.patch('/:transactionId/receipt', [
  body('receiptSent').isBoolean(),
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

    const { transactionId } = req.params;
    const { receiptSent } = req.body;

    // Check if transaction exists and user has access
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        store: {
          userId: req.user.id,
        },
      },
    });

    if (!existingTransaction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Transaction not found or access denied',
      });
    }

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: { receiptSent },
    });

    res.json({
      message: 'Receipt status updated successfully',
      transaction,
    });
  } catch (error) {
    console.error('Update receipt status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update receipt status',
    });
  }
});

// Get transaction statistics for a store
router.get('/store/:storeId/stats', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [transactions, totalStats] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          storeId,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          total: true,
          paymentStatus: true,
          paymentMethod: true,
          createdAt: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          storeId,
          paymentStatus: 'COMPLETED',
        },
        _sum: {
          total: true,
        },
        _count: true,
      }),
    ]);

    // Calculate statistics
    const totalEarnings = Number(totalStats._sum.total || 0);
    const totalTransactions = totalStats._count;
    
    const recentTransactions = transactions.filter(t => 
      t.paymentStatus === 'COMPLETED'
    );
    
    const recentEarnings = recentTransactions.reduce((sum, t) => 
      sum + Number(t.total), 0
    );

    const paymentMethodStats = transactions.reduce((acc, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + 1;
      return acc;
    }, {});

    const dailyStats = transactions.reduce((acc, t) => {
      const date = t.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { count: 0, total: 0 };
      }
      if (t.paymentStatus === 'COMPLETED') {
        acc[date].count++;
        acc[date].total += Number(t.total);
      }
      return acc;
    }, {});

    res.json({
      stats: {
        totalEarnings,
        totalTransactions,
        recentEarnings,
        recentTransactions: recentTransactions.length,
        averageTransactionValue: totalTransactions > 0 
          ? totalEarnings / totalTransactions 
          : 0,
        paymentMethodStats,
        dailyStats,
      },
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get transaction statistics',
    });
  }
});

export default router;