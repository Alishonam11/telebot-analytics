import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../index.js';
import { authenticateUser, AuthenticatedRequest, requirePlan } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { Prisma } from '@prisma/client';

export const botsRouter = Router();

const createBotSchema = z.object({
  name: z.string().min(1).max(100),
  token: z.string().min(1), // Telegram bot token
  webhookUrl: z.string().url().optional().nullable(),
});

const updateBotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  webhookUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

const botQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

// GET /api/bots
botsRouter.get('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const query = botQuerySchema.parse(req.query);
  const { page, limit, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.BotWhereInput = {
    ownerId: req.user!.id,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { username: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    } : {}),
  };

  const [bots, total] = await Promise.all([
    prisma.bot.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        tokenPrefix: true,
        isActive: true,
        webhookUrl: true,
        createdAt: true,
        lastEventAt: true,
        _count: {
          select: { events: true, sessions: true },
        },
      },
    }),
    prisma.bot.count({ where }),
  ]);

  res.json({
    bots,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

// POST /api/bots
botsRouter.post('/', authenticateUser, requirePlan('FREE', 'STARTER', 'PRO', 'ENTERPRISE'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = createBotSchema.parse(req.body);

  // Extract username from token (format: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
  const tokenParts = data.token.split(':');
  if (tokenParts.length !== 2) {
    res.status(400).json({ error: 'Invalid bot token format' });
    return;
  }

  const botId = tokenParts[0];
  const tokenHash = Buffer.from(data.token).toString('base64');
  const tokenPrefix = data.token.substring(0, 10) + '...';

  // Check if bot already exists for this user
  const existing = await prisma.bot.findFirst({
    where: { ownerId: req.user!.id, tokenHash },
  });

  if (existing) {
    res.status(409).json({ error: 'Bot already registered' });
    return;
  }

  // Verify token with Telegram API and get bot info
  let botInfo: { username: string; first_name: string } | null = null;
  try {
    const response = await fetch(`https://api.telegram.org/bot${data.token}/getMe`);
    const result = await response.json() as { ok: boolean; result?: { username: string; first_name: string } };
    if (result.ok && result.result) {
      botInfo = result.result;
    }
  } catch {
    // Ignore verification errors, but log them
    console.warn('Failed to verify bot token with Telegram API');
  }

  const bot = await prisma.bot.create({
    data: {
      name: data.name,
      username: botInfo?.username || `bot_${botId}`,
      tokenHash,
      tokenPrefix,
      webhookSecret: uuidv4(),
      webhookUrl: data.webhookUrl,
      ownerId: req.user!.id,
    },
  });

  // Set webhook if provided
  if (data.webhookUrl) {
    try {
      await fetch(`https://api.telegram.org/bot${data.token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: data.webhookUrl,
          secret_token: bot.webhookSecret,
          allowed_updates: ['message', 'callback_query', 'inline_query', 'edited_message'],
        }),
      });
    } catch (error) {
      console.error('Failed to set webhook:', error);
    }
  }

  res.status(201).json({
    bot: {
      id: bot.id,
      name: bot.name,
      username: bot.username,
      tokenPrefix: bot.tokenPrefix,
      isActive: bot.isActive,
      webhookUrl: bot.webhookUrl,
      webhookSecret: bot.webhookSecret,
      createdAt: bot.createdAt,
    },
  });
}));

// GET /api/bots/:id
botsRouter.get('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const bot = await prisma.bot.findFirst({
    where: { id: req.params.id, ownerId: req.user!.id },
    select: {
      id: true,
      name: true,
      username: true,
      tokenPrefix: true,
      isActive: true,
      webhookUrl: true,
      webhookSecret: true,
      createdAt: true,
      updatedAt: true,
      lastEventAt: true,
      _count: {
        select: { events: true, sessions: true, funnels: true },
      },
    },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  res.json({ bot });
}));

// PUT /api/bots/:id
botsRouter.put('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = updateBotSchema.parse(req.body);

  const bot = await prisma.bot.findFirst({
    where: { id: req.params.id, ownerId: req.user!.id },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  // If webhookUrl changed, update Telegram webhook
  if (data.webhookUrl !== undefined && data.webhookUrl !== bot.webhookUrl) {
    try {
      const token = Buffer.from(bot.tokenHash, 'base64').toString();
      if (data.webhookUrl) {
        await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: data.webhookUrl,
            secret_token: bot.webhookSecret,
            allowed_updates: ['message', 'callback_query', 'inline_query', 'edited_message'],
          }),
        });
      } else {
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: 'POST' });
      }
    } catch (error) {
      console.error('Failed to update webhook:', error);
    }
  }

  const updated = await prisma.bot.update({
    where: { id: bot.id },
    data: {
      name: data.name,
      webhookUrl: data.webhookUrl,
      isActive: data.isActive,
    },
    select: {
      id: true,
      name: true,
      username: true,
      tokenPrefix: true,
      isActive: true,
      webhookUrl: true,
      updatedAt: true,
    },
  });

  res.json({ bot: updated });
}));

// DELETE /api/bots/:id
botsRouter.delete('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const bot = await prisma.bot.findFirst({
    where: { id: req.params.id, ownerId: req.user!.id },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  // Delete webhook
  try {
    const token = Buffer.from(bot.tokenHash, 'base64').toString();
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: 'POST' });
  } catch (error) {
    console.error('Failed to delete webhook:', error);
  }

  await prisma.bot.delete({ where: { id: bot.id } });

  res.status(204).send();
}));

// GET /api/bots/:id/webhook-info
botsRouter.get('/:id/webhook-info', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const bot = await prisma.bot.findFirst({
    where: { id: req.params.id, ownerId: req.user!.id },
    select: { webhookUrl: true, webhookSecret: true, tokenHash: true, username: true },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/webhook/${bot.webhookSecret}`;

  res.json({
    webhookUrl,
    webhookSecret: bot.webhookSecret,
    instructions: `Set this URL as your webhook in Telegram: ${webhookUrl}\n\nSecret Token: ${bot.webhookSecret}`,
  });
}));