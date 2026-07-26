import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../index.js';
import { authenticateUser, AuthenticatedRequest, requirePlan } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const analyticsRouter = Router();

// GET /api/analytics/overview/:botId
analyticsRouter.get('/overview/:botId', authenticateUser, requirePlan('FREE', 'STARTER', 'PRO', 'ENTERPRISE'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { botId } = req.params;
  const querySchema = z.object({
    period: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h'),
  });

  const { period } = querySchema.parse(req.query);
  const since = getSince(period);

  // Verify bot ownership
  const bot = await prisma.bot.findFirst({
    where: { id: botId, ownerId: req.user!.id },
    select: { id: true },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  // Total unique users - use groupBy for distinct count
  const uniqueUsersResult = await prisma.event.groupBy({
    by: ['userId'],
    where: { botId, timestamp: { gte: since } },
  });
  const totalUsers = uniqueUsersResult.length;

  // Total events
  const totalEvents = await prisma.event.count({
    where: { botId, timestamp: { gte: since } },
  });

  // Total sessions
  const totalSessions = await prisma.session.count({
    where: { botId, startedAt: { gte: since } },
  });

  // Active users (last hour)
  const activeUsersResult = await prisma.event.groupBy({
    by: ['userId'],
    where: { botId, timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  const activeUsers = activeUsersResult.length;

  // Events by type
  const eventsByType = await prisma.event.groupBy({
    by: ['eventType'],
    where: { botId, timestamp: { gte: since } },
    _count: true,
  });

  // Events by hour (for chart)
  const eventsByHour = await prisma.$queryRaw<{ hour: Date; count: bigint }[]>`
    SELECT date_trunc('hour', timestamp) as hour, COUNT(*) as count
    FROM "Event"
    WHERE "botId" = ${botId} AND timestamp >= ${since}
    GROUP BY date_trunc('hour', timestamp)
    ORDER BY hour ASC
  `;

  // Top commands
  const topCommands = await prisma.event.groupBy({
    by: ['eventName'],
    where: { botId, eventType: 'COMMAND', timestamp: { gte: since } },
    _count: true,
    orderBy: { _count: { eventName: 'desc' } },
    take: 10,
  });

  // New users per day
  const newUsers = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT date(timestamp) as date, COUNT(DISTINCT "userId") as count
    FROM "Event"
    WHERE "botId" = ${botId} AND timestamp >= ${since}
    GROUP BY date(timestamp)
    ORDER BY date ASC
  `;

  res.json({
    period,
    overview: {
      totalUsers,
      totalEvents: Number(totalEvents),
      totalSessions: Number(totalSessions),
      activeUsers,
      avgEventsPerUser: totalUsers > 0 ? Number(totalEvents) / totalUsers : 0,
    },
    eventsByType: eventsByType.map(e => ({ type: e.eventType, count: e._count })),
    eventsByHour: eventsByHour.map(e => ({ hour: e.hour, count: Number(e.count) })),
    topCommands: topCommands.map(c => ({ command: c.eventName, count: c._count })),
    newUsers: newUsers.map(n => ({ date: n.date, count: Number(n.count) })),
  });
}));

// GET /api/analytics/users/:botId
analyticsRouter.get('/users/:botId', authenticateUser, requirePlan('FREE', 'STARTER', 'PRO', 'ENTERPRISE'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { botId } = req.params;
  const querySchema = z.object({
    period: z.enum(['24h', '7d', '30d', '90d']).default('30d'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
    search: z.string().optional(),
  });

  const { period, page, limit, search } = querySchema.parse(req.query);
  const since = getSince(period);
  const skip = (page - 1) * limit;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, ownerId: req.user!.id },
    select: { id: true },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const where: any = { botId, timestamp: { gte: since } };
  if (search) {
    where.OR = [
      { userId: { contains: search } },
      { username: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.$queryRaw<Array<{
    userId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    languageCode: string | null;
    eventCount: bigint;
    firstSeen: Date;
    lastSeen: Date;
    sessionCount: bigint;
  }>>`
    SELECT 
      e."userId",
      MAX(e."username") as username,
      MAX(e."firstName") as "firstName",
      MAX(e."lastName") as "lastName",
      MAX(e."languageCode") as "languageCode",
      COUNT(*) as "eventCount",
      MIN(e."timestamp") as "firstSeen",
      MAX(e."timestamp") as "lastSeen",
      COUNT(DISTINCT e."sessionId") as "sessionCount"
    FROM "Event" e
    WHERE e."botId" = ${botId} AND e."timestamp" >= ${since}
    ${search ? Prisma.sql`AND (e."userId" ILIKE ${'%' + search + '%'} OR e."username" ILIKE ${'%' + search + '%'} OR e."firstName" ILIKE ${'%' + search + '%'} OR e."lastName" ILIKE ${'%' + search + '%'})` : Prisma.empty}
    GROUP BY e."userId"
    ORDER BY "lastSeen" DESC
    LIMIT ${limit} OFFSET ${skip}
  `;

  const total = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT "userId") as count
    FROM "Event"
    WHERE "botId" = ${botId} AND "timestamp" >= ${since}
  `;

  res.json({
    users: users.map(u => ({
      userId: u.userId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      languageCode: u.languageCode,
      eventCount: Number(u.eventCount),
      firstSeen: u.firstSeen,
      lastSeen: u.lastSeen,
      sessionCount: Number(u.sessionCount),
    })),
    pagination: { page, limit, total: Number(total[0]?.count || 0), pages: Math.ceil(Number(total[0]?.count || 0) / limit) },
  });
}));

// GET /api/analytics/funnel/:botId
analyticsRouter.get('/funnel/:botId', authenticateUser, requirePlan('STARTER', 'PRO', 'ENTERPRISE'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { botId } = req.params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, ownerId: req.user!.id },
    select: { id: true },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const funnels = await prisma.funnel.findMany({
    where: { botId, isActive: true },
    include: {
      funnelEvents: {
        select: { stepIndex: true, userId: true, eventName: true },
      },
    },
  });

  // Calculate conversion rates
  const funnelData = await Promise.all(funnels.map(async (funnel) => {
    const steps = funnel.steps as Array<{ eventName: string; label: string }>;
    const stepCounts: Record<number, number> = {};
    
    for (const fe of funnel.funnelEvents) {
      stepCounts[fe.stepIndex] = (stepCounts[fe.stepIndex] || 0) + 1;
    }

    const stepsData = steps.map((step, index) => ({
      label: step.label,
      eventName: step.eventName,
      count: stepCounts[index] || 0,
      conversionRate: index === 0 ? 100 : stepCounts[index] && stepCounts[index - 1] 
        ? (stepCounts[index] / stepCounts[index - 1]) * 100 
        : 0,
    }));

    return {
      id: funnel.id,
      name: funnel.name,
      steps: stepsData,
      createdAt: funnel.createdAt,
    };
  }));

  res.json({ funnels: funnelData });
}));

// POST /api/analytics/funnel/:botId
analyticsRouter.post('/funnel/:botId', authenticateUser, requirePlan('STARTER', 'PRO', 'ENTERPRISE'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { botId } = req.params;
  const schema = z.object({
    name: z.string().min(1).max(100),
    steps: z.array(z.object({
      eventName: z.string().min(1),
      label: z.string().min(1).max(50),
    })).min(2).max(10),
  });

  const data = schema.parse(req.body);

  const bot = await prisma.bot.findFirst({
    where: { id: botId, ownerId: req.user!.id },
    select: { id: true },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const funnel = await prisma.funnel.create({
    data: {
      botId,
      name: data.name,
      steps: data.steps as any,
    },
  });

  res.status(201).json({ funnel });
}));

// DELETE /api/analytics/funnel/:funnelId
analyticsRouter.delete('/funnel/:funnelId', authenticateUser, requirePlan('STARTER', 'PRO', 'ENTERPRISE'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const funnel = await prisma.funnel.findFirst({
    where: { id: req.params.funnelId, bot: { ownerId: req.user!.id } },
  });

  if (!funnel) {
    res.status(404).json({ error: 'Funnel not found' });
    return;
  }

  await prisma.funnel.delete({ where: { id: funnel.id } });
  res.status(204).send();
}));

// GET /api/analytics/retention/:botId
analyticsRouter.get('/retention/:botId', authenticateUser, requirePlan('PRO', 'ENTERPRISE'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { botId } = req.params;
  const querySchema = z.object({
    period: z.enum(['DAY', 'WEEK']).default('DAY'),
    limit: z.coerce.number().min(1).max(60).default(30),
  });

  const { period, limit } = querySchema.parse(req.query);

  const bot = await prisma.bot.findFirst({
    where: { id: botId, ownerId: req.user!.id },
    select: { id: true },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const cohorts = await prisma.retentionCohort.findMany({
    where: { botId, period: period as any },
    orderBy: { cohortDate: 'desc' },
    take: limit,
  });

  // Build matrix
  const matrix = cohorts.map(c => ({
    cohortDate: c.cohortDate,
    totalUsers: c.totalUsers,
    retained: c.retained,
  }));

  res.json({ cohorts: matrix });
}));

// GET /api/analytics/realtime/:botId
analyticsRouter.get('/realtime/:botId', authenticateUser, requirePlan('FREE', 'STARTER', 'PRO', 'ENTERPRISE'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { botId } = req.params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, ownerId: req.user!.id },
    select: { id: true },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [eventsLast5Min, activeSessions, recentEvents] = await Promise.all([
    prisma.event.count({
      where: { botId, timestamp: { gte: fiveMinAgo } },
    }),
    prisma.session.count({
      where: { botId, isActive: true, startedAt: { gte: oneHourAgo } },
    }),
    prisma.event.findMany({
      where: { botId, timestamp: { gte: oneHourAgo } },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: {
        id: true,
        userId: true,
        username: true,
        eventType: true,
        eventName: true,
        timestamp: true,
      },
    }),
  ]);

  res.json({
    eventsLast5Min,
    activeSessions,
    recentEvents,
    timestamp: now,
  });
}));

// GET /api/analytics/geo/:botId
analyticsRouter.get('/geo/:botId', authenticateUser, requirePlan('PRO', 'ENTERPRISE'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { botId } = req.params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, ownerId: req.user!.id },
    select: { id: true },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const countries = await prisma.$queryRaw<Array<{ country: string; count: bigint }>>`
    SELECT 
      e.metadata->>'country' as country, 
      COUNT(DISTINCT e."userId") as count
    FROM "Event" e
    WHERE e."botId" = ${botId} 
      AND e.metadata->>'country' IS NOT NULL
    GROUP BY e.metadata->>'country'
    ORDER BY count DESC
    LIMIT 50
  `;

  res.json({
    countries: countries.map(c => ({ country: c.country, users: Number(c.count) })),
  });
}));

function getSince(period: string): Date {
  const now = new Date();
  switch (period) {
    case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
    case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000);
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}