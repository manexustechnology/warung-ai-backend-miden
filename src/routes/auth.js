import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index.js';
import { generateToken, verifyWalletAddress, authenticateToken } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Register new user with wallet address
router.post('/register', [
  body('walletAddress').isString().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('name').optional().isString(),
], verifyWalletAddress, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: errors.array(),
      });
    }

    const { walletAddress, email, phone, name } = req.body;

    // Create user
    const user = await prisma.user.create({
      data: {
        walletAddress,
        email,
        phone,
        name,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to register user',
    });
  }
});

// Login with wallet address (auto-register if not exists)
router.post('/login', [
  body('walletAddress').isString().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: errors.array(),
      });
    }

    const { walletAddress } = req.body;

    // Find user by wallet address
    let user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        stores: {
          include: {
            products: true,
            transactions: true,
            defiPositions: true,
          },
        },
      },
    });

    // If user doesn't exist, create a new one
    if (!user) {
      console.log('Creating new user for wallet address:', walletAddress);
      user = await prisma.user.create({
        data: {
          walletAddress,
          name: `User ${walletAddress.slice(0, 8)}`,
        },
        include: {
          stores: {
            include: {
              products: true,
              transactions: true,
              defiPositions: true,
            },
          },
        },
      });
      console.log('New user created:', user.id);
    }

    // Generate JWT token
    const token = generateToken(user.id);

    res.json({
      message: user.stores.length > 0 ? 'Login successful' : 'Registration successful',
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        name: user.name,
        stores: user.stores,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to login',
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token required',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        stores: {
          include: {
            products: true,
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
            defiPositions: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
      });
    }

    res.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        name: user.name,
        stores: user.stores,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user profile',
    });
  }
});

// Update user profile
router.put('/profile', [
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('name').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: errors.array(),
      });
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token required',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { email, phone, name } = req.body;

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        email,
        phone,
        name,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update profile',
    });
  }
});

// Verify wallet address (for frontend validation)
router.post('/verify-wallet', [
  body('walletAddress').isString().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: errors.array(),
      });
    }

    const { walletAddress } = req.body;

    // Basic Miden address validation
    const midenAddressRegex = /^(mtst1|miden)[a-zA-Z0-9]{30,50}$/;
    if (!midenAddressRegex.test(walletAddress)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Invalid Miden wallet address format',
      });
    }

    // Check if wallet address exists
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress },
    });

    res.json({
      isValid: true,
      exists: !!existingUser,
      message: existingUser ? 'Wallet address already registered' : 'Wallet address is available',
    });
  } catch (error) {
    console.error('Wallet verification error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify wallet address',
    });
  }
});

// Verify token and return user data
router.get('/verify-token', authenticateToken, async (req, res) => {
  try {
    // req.user is already the full user object from authenticateToken middleware
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
      });
    }

    res.json({
      message: 'Token is valid',
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        name: user.name,
        stores: user.stores,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify token',
    });
  }
});

export default router;