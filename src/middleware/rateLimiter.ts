import { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per window

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const key = `${ip}:${req.path}`;

  const record = requestCounts.get(key);

  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (record.count >= MAX_REQUESTS) {
    res.set('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
    return;
  }

  record.count++;
  next();
}

export function strictRateLimiter(
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
) {
  const counts = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${ip}:${req.path}`;

    const record = counts.get(key);

    if (!record || now > record.resetAt) {
      counts.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    record.count++;
    next();
  };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetAt) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);