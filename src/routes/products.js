import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index.js';
import { authenticateJWT, verifyStoreOwnership } from '../middleware/auth.js';

const router = express.Router();

// Get all products for a store
router.get('/store/:storeId', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { category, search, page = 1, limit = 20 } = req.query;

    console.log('Get products request received:', {
      storeId: storeId,
      category: category,
      search: search,
      page: page,
      limit: limit,
      user: req.user ? { id: req.user.id, walletAddress: req.user.walletAddress } : 'No user',
      store: req.store ? { id: req.store.id, walletAddress: req.store.walletAddress } : 'No store'
    });

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      storeId: req.store.id, // Use the store ID from middleware, not the wallet address
      isActive: true,
    };

    console.log('Database query where clause:', where);

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    console.log('Database query results:', {
      productsFound: products.length,
      totalProducts: total,
      products: products.map(p => ({ id: p.id, name: p.name, storeId: p.storeId }))
    });

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
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get products',
    });
  }
});

// Get single product
router.get('/:productId', authenticateJWT, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Product not found',
      });
    }

    res.json({
      product,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get product',
    });
  }
});

// Create new product
router.post('/store/:storeId', [
  body('name').isString().notEmpty(),
  body('nameEn').optional().isString(),
  body('price').isFloat({ min: 0 }),
  body('buyPrice').optional().isFloat({ min: 0 }),
  body('category').isString().notEmpty(),
  body('stock').isInt({ min: 0 }),
  body('image').optional().isString(),
  body('barcode').optional().isString(),
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
    const {
      name,
      nameEn,
      price,
      buyPrice,
      category,
      stock,
      image,
      barcode,
    } = req.body;

    console.log('Creating product for store:', {
      storeId: storeId,
      storeFromMiddleware: req.store ? { id: req.store.id, walletAddress: req.store.walletAddress } : 'No store in middleware',
      productData: { name, price, category, stock }
    });

    // Check if barcode already exists
    if (barcode) {
      const existingProduct = await prisma.product.findUnique({
        where: { barcode },
      });

      if (existingProduct) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Product with this barcode already exists',
        });
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        nameEn,
        price,
        buyPrice,
        category,
        stock,
        image,
        barcode,
        storeId: req.store.id, // Use the store ID from middleware, not the wallet address
      },
    });

    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create product',
    });
  }
});

// Update product
router.put('/:productId', [
  body('name').optional().isString().notEmpty(),
  body('nameEn').optional().isString(),
  body('price').optional().isFloat({ min: 0 }),
  body('buyPrice').optional().isFloat({ min: 0 }),
  body('category').optional().isString().notEmpty(),
  body('stock').optional().isInt({ min: 0 }),
  body('image').optional().isString(),
  body('barcode').optional().isString(),
  body('isActive').optional().isBoolean(),
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

    const { productId } = req.params;
    const {
      name,
      nameEn,
      price,
      buyPrice,
      category,
      stock,
      image,
      barcode,
      isActive,
    } = req.body;

    // Check if product exists and belongs to user's store
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        store: {
          userId: req.user.id,
        },
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Product not found or access denied',
      });
    }

    // Check if barcode already exists (if changing barcode)
    if (barcode && barcode !== existingProduct.barcode) {
      const barcodeExists = await prisma.product.findUnique({
        where: { barcode },
      });

      if (barcodeExists) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Product with this barcode already exists',
        });
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        nameEn,
        price,
        buyPrice,
        category,
        stock,
        image,
        barcode,
        isActive,
      },
    });

    res.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update product',
    });
  }
});

// Delete product (soft delete)
router.delete('/:productId', authenticateJWT, async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists and belongs to user's store
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        store: {
          userId: req.user.id,
        },
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Product not found or access denied',
      });
    }

    // Soft delete by setting isActive to false
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });

    res.json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete product',
    });
  }
});

// Get product categories for a store
router.get('/store/:storeId/categories', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;

    const categories = await prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
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

// Bulk update product stock
router.patch('/store/:storeId/bulk-stock', [
  body('products').isArray(),
  body('products.*.id').isString(),
  body('products.*.stock').isInt({ min: 0 }),
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
    const { products } = req.body;

    // Verify all products belong to the store
    const productIds = products.map(p => p.id);
    const existingProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId,
      },
    });

    if (existingProducts.length !== products.length) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Some products do not belong to this store',
      });
    }

    // Update products in transaction
    const updatedProducts = await prisma.$transaction(
      products.map(product =>
        prisma.product.update({
          where: { id: product.id },
          data: { stock: product.stock },
        })
      )
    );

    res.json({
      message: 'Products stock updated successfully',
      products: updatedProducts,
    });
  } catch (error) {
    console.error('Bulk update stock error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update products stock',
    });
  }
});

// Search products by barcode
router.get('/store/:storeId/barcode/:barcode', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId, barcode } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        storeId,
        barcode,
        isActive: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Product not found',
      });
    }

    res.json({
      product,
    });
  } catch (error) {
    console.error('Search by barcode error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search product',
    });
  }
});

export default router; 