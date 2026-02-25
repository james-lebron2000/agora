import { Router, Request, Response, NextFunction } from 'express';
import { getOrCreateSurvivalManager, type SurvivalSnapshot, type SurvivalAction, type AgentHealthStatus } from '@agora/sdk';
import { requirePermission } from '../middleware/auth';
import { redisService } from '../services/redis';
import { logger } from '../utils/logger';
import { SuccessResponse } from '../types';

const router = Router();

// Cache middleware for survival data (short cache since data changes frequently)
async function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET') {
    return next();
  }

  const cacheKey = `cache:survival:${req.originalUrl}`;
  
  try {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${req.originalUrl}`);
      return res.json(cached);
    }
  } catch (error) {
    logger.error('Cache error:', error);
  }
  
  // Store original json method
  const originalJson = res.json.bind(res);
  res.json = function(body: unknown) {
    // Cache successful GET responses for 30 seconds
    if (res.statusCode >= 200 && res.statusCode < 300) {
      redisService.set(cacheKey, body, 30).catch(err => {
        logger.error('Failed to cache response:', err);
      });
    }
    return originalJson(body);
  };
  
  next();
}

/**
 * Convert SDK SurvivalSnapshot to Web-compatible format
 */
function formatSurvivalData(snapshot: SurvivalSnapshot, pendingActions: SurvivalAction[], survivalMode: boolean) {
  // Map SDK health status to web health status
  const statusMap: Record<AgentHealthStatus, 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying'> = {
    'healthy': 'healthy',
    'degraded': 'degraded',
    'critical': 'critical',
    'dead': 'dying'
  };

  // Calculate derived metrics
  const balance = parseFloat(snapshot.economics.balance);
  const runwayDays = snapshot.economics.runwayDays;
  
  // Estimate daily burn from runway
  const dailyBurnRateUSD = runwayDays > 0 ? balance / runwayDays : 0;
  
  // Calculate efficiency score (0-100 based on runway)
  let efficiencyScore = 50;
  if (runwayDays >= 30) efficiencyScore = 95;
  else if (runwayDays >= 14) efficiencyScore = 85;
  else if (runwayDays >= 7) efficiencyScore = 70;
  else if (runwayDays >= 3) efficiencyScore = 50;
  else efficiencyScore = 30;

  // Calculate trend direction based on status
  let direction: 'improving' | 'stable' | 'declining' = 'stable';
  if (snapshot.health.status === 'healthy') direction = 'improving';
  else if (snapshot.health.status === 'degraded') direction = 'declining';
  else if (snapshot.health.status === 'critical' || snapshot.health.status === 'dead') direction = 'declining';

  // Calculate sub-metrics (simulated based on overall health)
  const overallScore = snapshot.health.overall;
  const compute = Math.min(100, overallScore + Math.floor(Math.random() * 15));
  const storage = Math.min(100, overallScore + Math.floor(Math.random() * 10 - 5));
  const network = Math.min(100, overallScore + Math.floor(Math.random() * 20));
  const economic = Math.min(100, 50 + Math.floor(runwayDays * 1.5));

  return {
    health: {
      status: statusMap[snapshot.health.status],
      overall: snapshot.health.overall,
      compute,
      storage,
      network,
      economic,
      lastCheck: new Date(snapshot.timestamp).toISOString()
    },
    economics: {
      totalUSDC: balance,
      netWorthUSD: balance * 1.1, // Slightly higher with other assets
      runwayDays,
      dailyBurnRateUSD,
      efficiencyScore
    },
    trend: {
      direction,
      rateOfChange: direction === 'improving' ? 2.5 : direction === 'declining' ? -1.5 : 0,
      predictedHealth: Math.min(100, overallScore + (direction === 'improving' ? 5 : direction === 'declining' ? -5 : 0)),
      predictedRunway: runwayDays + (direction === 'improving' ? 2 : direction === 'declining' ? -2 : 0)
    },
    pendingActions,
    survivalMode
  };
}

/**
 * Generate pending actions based on survival state
 */
function generatePendingActions(snapshot: SurvivalSnapshot): SurvivalAction[] {
  const actions: SurvivalAction[] = [];
  const balance = parseFloat(snapshot.economics.balance);
  const runwayDays = snapshot.economics.runwayDays;

  // Add actions based on conditions
  if (runwayDays < 14) {
    actions.push({
      type: 'bridge',
      priority: runwayDays < 7 ? 'critical' : 'high',
      description: 'Bridge USDC from Ethereum to Base for lower operational costs',
      estimatedImpact: 'Reduce gas costs by ~60%',
      recommendedChain: 'base'
    });
  }

  if (runwayDays < 30 && balance > 100) {
    actions.push({
      type: 'earn',
      priority: 'medium',
      description: 'Accept additional tasks to increase revenue',
      estimatedImpact: 'Potential $50-100 additional daily income'
    });
  }

  if (snapshot.health.status === 'degraded' || snapshot.health.status === 'critical') {
    actions.push({
      type: 'reduce_cost',
      priority: 'high',
      description: 'Reduce non-essential operational costs',
      estimatedImpact: 'Save ~$10-20 per day'
    });
  }

  if (runwayDays > 60 && balance > 1000) {
    actions.push({
      type: 'optimize_chain',
      priority: 'low',
      description: 'Optimize chain selection for current operations',
      estimatedImpact: 'Improve efficiency by 10-15%'
    });
  }

  return actions;
}

// GET /survival/:agentId - Get survival data for an agent
router.get('/:agentId', 
  requirePermission('agents:read'),
  cacheMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const address = req.query.address as string || agentId;

      if (!address) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Agent address is required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }

      // Get or create survival manager using SDK
      const manager = getOrCreateSurvivalManager(agentId, address as `0x${string}`);
      
      // Perform survival check
      const snapshot = await manager.performSurvivalCheck();
      const isSurvivalMode = manager.isInSurvivalMode();
      
      // Generate pending actions based on state
      const pendingActions = generatePendingActions(snapshot);
      
      // Format data for web
      const survivalData = formatSurvivalData(snapshot, pendingActions, isSurvivalMode);

      const response: SuccessResponse<typeof survivalData> = {
        success: true,
        data: survivalData,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      logger.error('Survival data fetch error:', error);
      next(error);
    }
  }
);

// POST /survival/:agentId/heartbeat - Send heartbeat
router.post('/:agentId/heartbeat',
  requirePermission('agents:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const address = req.body.address || agentId;
      const metadata = req.body.metadata;

      // Get survival manager
      const manager = getOrCreateSurvivalManager(agentId, address as `0x${string}`);
      
      // Send heartbeat
      const heartbeat = await manager.sendHeartbeat(metadata);

      const response: SuccessResponse<typeof heartbeat> = {
        success: true,
        data: heartbeat,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      logger.error('Heartbeat error:', error);
      next(error);
    }
  }
);

// GET /survival/:agentId/check - Perform full survival check
router.get('/:agentId/check',
  requirePermission('agents:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const address = req.query.address as string || agentId;

      // Get survival manager
      const manager = getOrCreateSurvivalManager(agentId, address as `0x${string}`);
      
      // Perform full survival check
      const checkResult = await manager.performFullSurvivalCheck();

      const response: SuccessResponse<typeof checkResult> = {
        success: true,
        data: checkResult,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      logger.error('Survival check error:', error);
      next(error);
    }
  }
);

// GET /survival/:agentId/recommendations - Get recovery recommendations
router.get('/:agentId/recommendations',
  requirePermission('agents:read'),
  cacheMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const address = req.query.address as string || agentId;

      // Get survival manager
      const manager = getOrCreateSurvivalManager(agentId, address as `0x${string}`);
      
      // Get recommendations
      const recommendations = await manager.getRecoveryRecommendations();

      const response: SuccessResponse<typeof recommendations> = {
        success: true,
        data: recommendations,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      logger.error('Recommendations fetch error:', error);
      next(error);
    }
  }
);

export default router;
