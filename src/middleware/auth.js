import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

// JWT Authentication middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No Bearer token found in headers');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Token received:', token.substring(0, 20) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', { userId: decoded.userId });
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        stores: true,
      },
    });

    if (!user) {
      console.log('User not found for userId:', decoded.userId);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    console.log('User found and authenticated:', { id: user.id, walletAddress: user.walletAddress });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.log('JWT verification failed:', error.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.log('Token expired:', error.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
};

// Wallet address verification middleware
export const verifyWalletAddress = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Wallet address is required',
      });
    }

    // Basic Miden address validation (42 characters, starts with 0x)
    const midenAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!midenAddressRegex.test(walletAddress)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Invalid Miden wallet address format',
      });
    }

    // Check if wallet address already exists
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Wallet address already registered',
      });
    }

    next();
  } catch (error) {
    console.error('Wallet verification error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Wallet verification failed',
    });
  }
};

// Store ownership verification middleware
export const verifyStoreOwnership = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Check if store exists and belongs to user (try by ID first, then by wallet address)
    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { id: storeId },
          { walletAddress: storeId }
        ],
        userId: userId,
      },
    });

    if (!store) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Store not found or access denied',
      });
    }

    req.store = store;
    next();
  } catch (error) {
    console.error('Store ownership verification error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Store ownership verification failed',
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        stores: true,
      },
    });

    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Verify JWT token without database lookup
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Alias for backward compatibility
export const authenticateJWT = authenticateToken;