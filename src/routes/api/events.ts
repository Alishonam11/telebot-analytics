import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../index.js';
import { authenticateApiKey, AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const eventsRouter = Router();

const eventSchema = z.object({
  eventType: z.enum([
    'MESSAGE', 'CALLBACK_QUERY', 'INLINE_QUERY', 'CHOSEN_INLINE_RESULT',
    'COMMAND', 'EDITED_MESSAGE', 'CHANNEL_POST', 'EDITED_CHANNEL_POST',
    'POLL', 'POLL_ANSWER', 'MY_CHAT_MEMBER', 'CHAT_MEMBER',
    'CHAT_JOIN_REQUEST', 'CUSTOM'
  ]),
  eventName: z.string().min(1).max(100),
  userId: z.string().min(1),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  languageCode: z.string().optional(),
  payload: z.unknown().optional(),
  metadata: z.unknown().optional(),
  sessionId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

const batchEventsSchema = z.array(eventSchema).min(1).max(100);

// POST /api/events (single)
eventsRouter.post('/', authenticateApiKey, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = eventSchema.parse(req.body);
  const botId = req.user!.id;

  const event = await prisma.event.create({
    data: {
      botId,
      userId: data.userId,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      languageCode: data.languageCode,
      eventType: data.eventType,
      eventName: data.eventName,
      payload: data.payload as any,
      metadata: data.metadata as any,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      sessionId: data.sessionId,
    },
  });

  // Update bot's lastEventAt
  await prisma.bot.update({
    where: { id: botId },
    data: { lastEventAt: new Date() },
  }).catch(() => {});

  // Update or create session
  if (data.sessionId) {
    await updateSession(botId, data.userId, data.sessionId);
  }

  res.status(201).json({ 
    event: { id: event.id, timestamp: event.timestamp },
    accepted: true 
  });
}));

// POST /api/events/batch (batch)
eventsRouter.post('/batch', authenticateApiKey, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = batchEventsSchema.parse(req.body);
  const botId = req.user!.id;

  const events = data.map(e => ({
    botId,
    userId: e.userId,
    username: e.username,
    firstName: e.firstName,
    lastName: e.lastName,
    languageCode: e.languageCode,
    eventType: e.eventType,
    eventName: e.eventName,
    payload: e.payload as any,
    metadata: e.metadata as any,
    timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    sessionId: e.sessionId,
  }));

  await prisma.event.createMany({ data: events });

  // Update bot's lastEventAt
  await prisma.bot.update({
    where: { id: botId },
    data: { lastEventAt: new Date() },
  }).catch(() => {});

  res.status(201).json({ accepted: events.length });
}));

// GET /api/events/:botId
eventsRouter.get('/:botId', asyncHandler(async (req: Request, res: Response) => {
  const querySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(500).default(50),
    eventType: z.string().optional(),
    eventName: z.string().optional(),
    userId: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  });

  const query = querySchema.parse(req.query);
  const { page, limit, eventType, eventName, userId, from, to } = query;
  const skip = (page - 1) * limit;

  const where: any = { botId: req.params.botId };
  if (eventType) where.eventType = eventType;
  if (eventName) where.eventName = eventName;
  if (userId) where.userId = userId;
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        userId: true,
        username: true,
        firstName: true,
        lastName: true,
        eventType: true,
        eventName: true,
        timestamp: true,
        sessionId: true,
      },
    }),
    prisma.event.count({ where }),
  ]);

  res.json({
    events,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}));

// Helper: Update or create session
async function updateSession(botId: string, userId: string, sessionId: string) {
  const existing = await prisma.session.findUnique({ where: { id: sessionId } });
  
  if (existing) {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        eventCount: { increment: 1 },
        endedAt: new Date(),
        duration: Math.floor((Date.now() - existing.startedAt.getTime()) / 1000),
      },
    });
  } else {
    await prisma.session.create({
      data: { id: sessionId, botId, userId, eventCount: 1 },
    });
  }
}