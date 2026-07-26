import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    plan: string;
  };
  bot?: {
    id: string;
    botId: string;
    name: string;
  };
}

export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      plan: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, plan: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      plan: user.plan,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({ error: 'API key required (x-api-key header)' });
      return;
    }

    const keyHash = Buffer.from(apiKey).toString('base64');

    const dbKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: { 
        id: true,
        userId: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    if (!dbKey || dbKey.revokedAt) {
      res.status(401).json({ error: 'Invalid or revoked API key' });
      return;
    }

    if (dbKey.expiresAt && dbKey.expiresAt < new Date()) {
      res.status(401).json({ error: 'API key expired' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: dbKey.userId },
      select: { id: true, email: true, plan: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    await prisma.apiKey.update({
      where: { id: dbKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    req.user = {
      id: user.id,
      email: user.email,
      plan: user.plan,
    };

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export function requirePlan(...allowedPlans: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedPlans.includes(req.user.plan)) {
      res.status(403).json({ 
        error: 'Plan upgrade required',
        currentPlan: req.user.plan,
        requiredPlans: allowedPlans,
      });
      return;
    }

    next();
  };
}