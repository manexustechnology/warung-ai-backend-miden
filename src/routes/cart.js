import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index.js';
import { authenticateJWT, verifyStoreOwnership } from '../middleware/auth.js';

const router = express.Router();

// Get active cart for a store
router.get('/store/:storeId', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;

    console.log('Get cart request received:', {
      storeId: storeId,
      user: req.user ? { id: req.user.id, walletAddress: req.user.walletAddress } : 'No user',
      store: req.store ? { id: req.store.id, walletAddress: req.store.walletAddress } : 'No store'
    });

    const cart = await prisma.cart.findFirst({
      where: {
        storeId: req.store.id, // Use the store ID from middleware, not the wallet address
        isActive: true,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('Cart found:', cart ? { id: cart.id, itemCount: cart.items.length } : 'No cart');

    if (!cart) {
      return res.json({
        items: [], // Return empty items array for frontend compatibility
        total: 0,
        itemCount: 0,
      });
    }

    const total = Number(cart.total);
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      items: cart.items, // Return items array for frontend compatibility
      total,
      itemCount,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get cart',
    });
  }
});

// Add item to cart
router.post('/store/:storeId/items', [
  body('productId').isString(),
  body('quantity').isInt({ min: 1 }),
], authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    console.log('Add item to cart request received:', {
      storeId: req.params.storeId,
      productId: req.body.productId,
      quantity: req.body.quantity,
      user: req.user ? { id: req.user.id, walletAddress: req.user.walletAddress } : 'No user',
      store: req.store ? { id: req.store.id, walletAddress: req.store.walletAddress } : 'No store'
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
    const { productId, quantity } = req.body;

    console.log('Looking for product:', {
      productId: productId,
      storeId: req.store.id, // Use the store ID from middleware
      isActive: true
    });

    // Verify product exists and belongs to the store
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: req.store.id, // Use the store ID from middleware, not the wallet address
        isActive: true,
      },
    });

    console.log('Product found:', product ? { id: product.id, name: product.name, stock: product.stock } : 'Not found');

    if (!product) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Product not found or not active',
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        error: 'Bad request',
        message: `Insufficient stock. Available: ${product.stock}`,
      });
    }

    // Get or create active cart
    let cart = await prisma.cart.findFirst({
      where: {
        storeId: req.store.id, // Use the store ID from middleware, not the wallet address
        isActive: true,
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          storeId: req.store.id, // Use the store ID from middleware, not the wallet address
          total: 0,
          isActive: true,
        },
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    if (existingItem) {
      // Update existing item
      const newQuantity = existingItem.quantity + quantity;
      const newSubtotal = Number(product.price) * newQuantity;

      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          subtotal: newSubtotal,
        },
        include: {
          product: true,
        },
      });

      // Update cart total
      await updateCartTotal(cart.id);
    } else {
      // Add new item
      const subtotal = Number(product.price) * quantity;
      
      console.log('Adding new item to cart:', {
        productName: product.name,
        productPrice: product.price,
        quantity: quantity,
        calculatedSubtotal: subtotal
      });

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          subtotal,
        },
      });

      // Update cart total
      await updateCartTotal(cart.id);
    }

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json({
      message: 'Item added to cart successfully',
      items: updatedCart.items, // Return items array for frontend compatibility
      total: Number(updatedCart.total),
      itemCount: updatedCart.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add item to cart',
    });
  }
});

// Update cart item quantity
router.put('/store/:storeId/items/:itemId', [
  body('quantity').isInt({ min: 0 }),
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

    const { storeId, itemId } = req.params;
    const { quantity } = req.body;

    console.log('Update cart item request received:', {
      storeId: storeId,
      itemId: itemId,
      quantity: quantity,
      user: req.user ? { id: req.user.id, walletAddress: req.user.walletAddress } : 'No user',
      store: req.store ? { id: req.store.id, walletAddress: req.store.walletAddress } : 'No store'
    });

    // Verify cart item exists and belongs to the store
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          storeId: req.store.id, // Use the store ID from middleware, not the wallet address
          isActive: true,
        },
      },
      include: {
        product: true,
      },
    });

    console.log('Cart item found:', cartItem ? { id: cartItem.id, productName: cartItem.product.name } : 'Not found');

    if (!cartItem) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Cart item not found',
      });
    }

    if (quantity === 0) {
      // Remove item from cart
      await prisma.cartItem.delete({
        where: { id: itemId },
      });
    } else {
      // Check stock availability
      if (cartItem.product.stock < quantity) {
        return res.status(400).json({
          error: 'Bad request',
          message: `Insufficient stock. Available: ${cartItem.product.stock}`,
        });
      }

      // Update item quantity
      const subtotal = Number(cartItem.product.price) * quantity;
      await prisma.cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          subtotal,
        },
      });
    }

    // Update cart total
    await updateCartTotal(cartItem.cartId);

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json({
      message: 'Cart item updated successfully',
      items: updatedCart.items, // Return items array for frontend compatibility
      total: Number(updatedCart.total),
      itemCount: updatedCart.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update cart item',
    });
  }
});

// Remove item from cart
router.delete('/store/:storeId/items/:itemId', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId, itemId } = req.params;

    console.log('Remove item from cart request received:', {
      storeId: storeId,
      itemId: itemId,
      user: req.user ? { id: req.user.id, walletAddress: req.user.walletAddress } : 'No user',
      store: req.store ? { id: req.store.id, walletAddress: req.store.walletAddress } : 'No store'
    });

    // Verify cart item exists and belongs to the store
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          storeId: req.store.id, // Use the store ID from middleware, not the wallet address
          isActive: true,
        },
      },
    });

    console.log('Cart item found:', cartItem ? { id: cartItem.id, productId: cartItem.productId } : 'Not found');

    if (!cartItem) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Cart item not found',
      });
    }

    // Remove item
    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    console.log('Cart item deleted successfully');

    // Update cart total
    await updateCartTotal(cartItem.cartId);

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json({
      message: 'Item removed from cart successfully',
      items: updatedCart.items, // Return items array for frontend compatibility
      total: Number(updatedCart.total),
      itemCount: updatedCart.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove item from cart',
    });
  }
});

// Clear cart
router.delete('/store/:storeId', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    console.log('Clear cart request received:', {
      storeId: req.params.storeId,
      user: req.user,
      store: req.store
    });

    const cart = await prisma.cart.findFirst({
      where: {
        storeId: req.store.id, // Use the store ID from middleware, not the wallet address
        isActive: true,
      },
    });

    console.log('Cart found for clearing:', cart ? { id: cart.id, itemCount: cart.itemCount } : 'Not found');

    if (!cart) {
      return res.json({
        message: 'Cart is already empty',
        cart: null,
        total: 0,
        itemCount: 0,
      });
    }

    // Remove all cart items
    const deletedItems = await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    console.log('Deleted cart items:', deletedItems.count);

    // Update cart total
    await updateCartTotal(cart.id);

    res.json({
      message: 'Cart cleared successfully',
      cart: null,
      total: 0,
      itemCount: 0,
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to clear cart',
    });
  }
});

// Helper function to update cart total
async function updateCartTotal(cartId) {
  console.log('Updating cart total for cartId:', cartId);
  
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      product: true,
    },
  });

  console.log('Cart items for total calculation:', items.map(item => ({
    productName: item.product.name,
    quantity: item.quantity,
    subtotal: item.subtotal,
    productPrice: item.product.price
  })));

  const total = items.reduce((sum, item) => {
    console.log(`Adding ${item.subtotal} to sum ${sum}`);
    return sum + Number(item.subtotal);
  }, 0);

  console.log('Final cart total calculated:', total);

  await prisma.cart.update({
    where: { id: cartId },
    data: { total },
  });

  console.log('Cart total updated in database');
}

export default router; 