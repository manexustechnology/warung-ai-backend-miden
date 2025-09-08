import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index.js';
import { authenticateJWT, verifyStoreOwnership } from '../middleware/auth.js';

const router = express.Router();

// Get all customers for a store
router.get('/store/:storeId', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      transactions: {
        some: {
          storeId,
        },
      },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              transactions: {
                where: { storeId },
              },
            },
          },
          transactions: {
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              total: true,
              paymentMethod: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    // Calculate customer statistics
    const customersWithStats = customers.map(customer => {
      const totalSpent = customer.transactions.reduce((sum, t) => sum + Number(t.total), 0);
      const averageOrderValue = customer.transactions.length > 0 
        ? totalSpent / customer.transactions.length 
        : 0;

      return {
        ...customer,
        totalSpent,
        averageOrderValue,
        transactionCount: customer._count.transactions,
      };
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      customers: customersWithStats,
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
    console.error('Get customers error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get customers',
    });
  }
});

// Get single customer
router.get('/:customerId', authenticateJWT, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.customerId },
      include: {
        transactions: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
              },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Customer not found',
      });
    }

    // Check if user has access to this customer's transactions
    const hasAccess = customer.transactions.some(transaction => {
      return transaction.store && transaction.store.id;
    });

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this customer',
      });
    }

    // Calculate customer statistics
    const totalSpent = customer.transactions.reduce((sum, t) => sum + Number(t.total), 0);
    const averageOrderValue = customer.transactions.length > 0 
      ? totalSpent / customer.transactions.length 
      : 0;

    const customerWithStats = {
      ...customer,
      totalSpent,
      averageOrderValue,
      transactionCount: customer.transactions.length,
    };

    res.json({
      customer: customerWithStats,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get customer',
    });
  }
});

// Create new customer
router.post('/store/:storeId', [
  body('name').optional().isString(),
  body('phone').optional().isString(),
  body('email').optional().isEmail(),
  body('preferredNotification').optional().isIn(['WHATSAPP', 'TELEGRAM']),
], authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: errors.array(),
      });
    }

    const { storeId } = req.params;
    const { name, phone, email, preferredNotification = 'WHATSAPP' } = req.body;

    // Check if customer with this phone already exists
    if (phone) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { phone },
      });

      if (existingCustomer) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Customer with this phone number already exists',
        });
      }
    }

    // Check if customer with this email already exists
    if (email) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { email },
      });

      if (existingCustomer) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Customer with this email already exists',
        });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        preferredNotification,
      },
    });

    res.status(201).json({
      message: 'Customer created successfully',
      customer,
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create customer',
    });
  }
});

// Update customer
router.put('/:customerId', [
  body('name').optional().isString(),
  body('phone').optional().isString(),
  body('email').optional().isEmail(),
  body('preferredNotification').optional().isIn(['WHATSAPP', 'TELEGRAM']),
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

    const { customerId } = req.params;
    const { name, phone, email, preferredNotification } = req.body;

    // Check if customer exists and user has access
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        transactions: {
          some: {
            store: {
              userId: req.user.id,
            },
          },
        },
      },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Customer not found or access denied',
      });
    }

    // Check for phone number conflicts
    if (phone && phone !== existingCustomer.phone) {
      const phoneExists = await prisma.customer.findUnique({
        where: { phone },
      });

      if (phoneExists) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Customer with this phone number already exists',
        });
      }
    }

    // Check for email conflicts
    if (email && email !== existingCustomer.email) {
      const emailExists = await prisma.customer.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Customer with this email already exists',
        });
      }
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name,
        phone,
        email,
        preferredNotification,
      },
    });

    res.json({
      message: 'Customer updated successfully',
      customer,
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update customer',
    });
  }
});

// Get customer statistics for a store
router.get('/store/:storeId/stats', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;

    const customers = await prisma.customer.findMany({
      where: {
        transactions: {
          some: {
            storeId,
          },
        },
      },
      include: {
        transactions: {
          where: { storeId },
          select: {
            total: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalCustomers = customers.length;
    const totalSpent = customers.reduce((sum, customer) => {
      return sum + customer.transactions.reduce((tSum, t) => tSum + Number(t.total), 0);
    }, 0);

    const averageCustomerValue = totalCustomers > 0 ? totalSpent / totalCustomers : 0;

    // Top customers by spending
    const topCustomers = customers
      .map(customer => {
        const customerTotal = customer.transactions.reduce((sum, t) => sum + Number(t.total), 0);
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          totalSpent: customerTotal,
          transactionCount: customer.transactions.length,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Customer acquisition over time
    const customerAcquisition = customers.reduce((acc, customer) => {
      const month = customer.createdAt.toISOString().slice(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const stats = {
      totalCustomers,
      totalSpent,
      averageCustomerValue,
      topCustomers,
      customerAcquisition,
    };

    res.json({
      stats,
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get customer statistics',
    });
  }
});

// Search customers
router.get('/store/:storeId/search', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Search query is required',
      });
    }

    const searchTerm = q.trim();

    const customers = await prisma.customer.findMany({
      where: {
        transactions: {
          some: {
            storeId,
          },
        },
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        _count: {
          select: {
            transactions: {
              where: { storeId },
            },
          },
        },
        transactions: {
          where: { storeId },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            total: true,
            createdAt: true,
          },
        },
      },
      take: 10,
    });

    const customersWithStats = customers.map(customer => {
      const totalSpent = customer.transactions.reduce((sum, t) => sum + Number(t.total), 0);
      return {
        ...customer,
        totalSpent,
        transactionCount: customer._count.transactions,
      };
    });

    res.json({
      customers: customersWithStats,
      query: searchTerm,
    });
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search customers',
    });
  }
});

export default router; 