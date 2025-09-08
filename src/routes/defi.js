import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index.js';
import { authenticateJWT, verifyStoreOwnership } from '../middleware/auth.js';
import { midenDefiService } from '../services/midenDefiService.js';

const router = express.Router();

// Get DeFi market overview
router.get('/market-overview', async (req, res) => {
  try {
    const overview = await midenDefiService.getMarketOverview();
    
    res.json({
      overview,
      mockData: true,
      message: 'DeFi market overview from Miden Network'
    });
  } catch (error) {
    console.error('Get market overview error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get market overview',
    });
  }
});

// Get all pool statistics
router.get('/pool-stats', async (req, res) => {
  try {
    const stats = await midenDefiService.getAllPoolStats();
    
    res.json({
      stats,
      mockData: true,
      message: 'Pool statistics from Miden Network'
    });
  } catch (error) {
    console.error('Get pool stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get pool statistics',
    });
  }
});

// Get all DeFi pools
router.get('/pools', async (req, res) => {
  try {
    const pools = await midenDefiService.getPools();
    
    res.json({
      pools,
      mockData: true,
      message: 'DeFi pools loaded with Miden Network data'
    });
  } catch (error) {
    console.error('Get DeFi pools error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get DeFi pools',
    });
  }
});

// Get DeFi positions for a store
router.get('/store/:storeId/positions', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;

    const positions = await prisma.deFiPosition.findMany({
      where: { storeId },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total value and rewards
    const totalValue = positions.reduce((sum, pos) => sum + Number(pos.value), 0);
    const totalRewards = positions.reduce((sum, pos) => sum + Number(pos.rewards), 0);

    res.json({
      positions,
      summary: {
        totalValue,
        totalRewards,
        positionCount: positions.length,
      },
    });
  } catch (error) {
    console.error('Get DeFi positions error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get DeFi positions',
    });
  }
});

// Get single DeFi position
router.get('/positions/:positionId', authenticateJWT, async (req, res) => {
  try {
    const position = await prisma.deFiPosition.findUnique({
      where: { id: req.params.positionId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
          },
        },
        user: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!position) {
      return res.status(404).json({
        error: 'Not found',
        message: 'DeFi position not found',
      });
    }

    // Check if user has access to this position
    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        stores: {
          some: {
            id: position.storeId,
          },
        },
      },
    });

    if (!user) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this DeFi position',
      });
    }

    res.json({
      position,
    });
  } catch (error) {
    console.error('Get DeFi position error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get DeFi position',
    });
  }
});

// Create new DeFi position (deposit)
router.post('/store/:storeId/deposit', [
  body('poolId').isString(),
  body('amount').isFloat({ min: 0.000001 }),
  body('value').isFloat({ min: 0 }),
  body('txHash').optional().isString(),
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
    const { poolId, amount, value, txHash } = req.body;

    // Verify pool exists
    const pool = await prisma.deFiPool.findUnique({
      where: { poolId },
    });

    if (!pool || !pool.isActive) {
      return res.status(404).json({
        error: 'Not found',
        message: 'DeFi pool not found or inactive',
      });
    }

    // Create DeFi position
    const position = await prisma.deFiPosition.create({
      data: {
        poolId,
        amount,
        value,
        rewards: 0,
        txHash,
        storeId,
        userId: req.user.id,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'DeFi position created successfully',
      position,
    });
  } catch (error) {
    console.error('Create DeFi position error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create DeFi position',
    });
  }
});

// Update DeFi position (withdraw or update rewards)
router.patch('/positions/:positionId', [
  body('amount').optional().isFloat({ min: 0 }),
  body('value').optional().isFloat({ min: 0 }),
  body('rewards').optional().isFloat({ min: 0 }),
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

    const { positionId } = req.params;
    const { amount, value, rewards, txHash } = req.body;

    // Check if position exists and user has access
    const existingPosition = await prisma.deFiPosition.findFirst({
      where: {
        id: positionId,
        store: {
          userId: req.user.id,
        },
      },
    });

    if (!existingPosition) {
      return res.status(404).json({
        error: 'Not found',
        message: 'DeFi position not found or access denied',
      });
    }

    const position = await prisma.deFiPosition.update({
      where: { id: positionId },
      data: {
        amount,
        value,
        rewards,
        txHash,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      message: 'DeFi position updated successfully',
      position,
    });
  } catch (error) {
    console.error('Update DeFi position error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update DeFi position',
    });
  }
});

// Remove DeFi position (full withdrawal)
router.delete('/positions/:positionId', authenticateJWT, async (req, res) => {
  try {
    const { positionId } = req.params;

    // Check if position exists and user has access
    const existingPosition = await prisma.deFiPosition.findFirst({
      where: {
        id: positionId,
        store: {
          userId: req.user.id,
        },
      },
    });

    if (!existingPosition) {
      return res.status(404).json({
        error: 'Not found',
        message: 'DeFi position not found or access denied',
      });
    }

    await prisma.deFiPosition.delete({
      where: { id: positionId },
    });

    res.json({
      message: 'DeFi position removed successfully',
    });
  } catch (error) {
    console.error('Remove DeFi position error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove DeFi position',
    });
  }
});

// Get DeFi statistics for a store
router.get('/store/:storeId/stats', authenticateJWT, verifyStoreOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;

    const positions = await prisma.deFiPosition.findMany({
      where: { storeId },
    });

    // Calculate statistics
    const totalValue = positions.reduce((sum, pos) => sum + Number(pos.value), 0);
    const totalRewards = positions.reduce((sum, pos) => sum + Number(pos.rewards), 0);
    const totalAmount = positions.reduce((sum, pos) => sum + Number(pos.amount), 0);

    // Group by pool
    const poolStats = positions.reduce((acc, pos) => {
      if (!acc[pos.poolId]) {
        acc[pos.poolId] = {
          poolId: pos.poolId,
          totalAmount: 0,
          totalValue: 0,
          totalRewards: 0,
          positionCount: 0,
        };
      }
      acc[pos.poolId].totalAmount += Number(pos.amount);
      acc[pos.poolId].totalValue += Number(pos.value);
      acc[pos.poolId].totalRewards += Number(pos.rewards);
      acc[pos.poolId].positionCount++;
      return acc;
    }, {});

    const stats = {
      totalValue,
      totalRewards,
      totalAmount,
      positionCount: positions.length,
      poolStats: Object.values(poolStats),
      averagePositionValue: positions.length > 0 ? totalValue / positions.length : 0,
    };

    res.json({
      stats,
    });
  } catch (error) {
    console.error('Get DeFi stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get DeFi statistics',
    });
  }
});

// Claim rewards for a position
router.post('/positions/:positionId/claim-rewards', [
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

    const { positionId } = req.params;
    const { txHash } = req.body;

    // Check if position exists and user has access
    const existingPosition = await prisma.deFiPosition.findFirst({
      where: {
        id: positionId,
        store: {
          userId: req.user.id,
        },
      },
    });

    if (!existingPosition) {
      return res.status(404).json({
        error: 'Not found',
        message: 'DeFi position not found or access denied',
      });
    }

    // Reset rewards to 0 (claimed)
    const position = await prisma.deFiPosition.update({
      where: { id: positionId },
      data: {
        rewards: 0,
        txHash: txHash || existingPosition.txHash,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      message: 'Rewards claimed successfully',
      position,
    });
  } catch (error) {
    console.error('Claim rewards error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to claim rewards',
    });
  }
});

// Get DeFi pool details
router.get('/pools/:poolId', async (req, res) => {
  try {
    const pool = await prisma.deFiPool.findUnique({
      where: { poolId: req.params.poolId },
    });

    if (!pool) {
      return res.status(404).json({
        error: 'Not found',
        message: 'DeFi pool not found',
      });
    }

    res.json({
      pool,
    });
  } catch (error) {
    console.error('Get DeFi pool error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get DeFi pool',
    });
  }
});

export default router; 