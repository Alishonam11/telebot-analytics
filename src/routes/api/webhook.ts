import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../../index.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const webhookRouter = Router();

// POST /api/webhook/:secret
// Telegram sends updates to this endpoint
webhookRouter.post('/:secret', asyncHandler(async (req: Request, res: Response) => {
  const { secret } = req.params;

  // Verify secret_token header (Telegram sends this as secret_token)
  const telegramSecret = req.headers['x-telegram-bot-api-secret-token'] as string;
  
  if (telegramSecret && telegramSecret !== secret) {
    res.status(401).json({ error: 'Invalid secret token' });
    return;
  }

  const bot = await prisma.bot.findUnique({
    where: { webhookSecret: secret },
    select: { id: true, isActive: true, username: true },
  });

  if (!bot || !bot.isActive) {
    res.status(404).json({ error: 'Bot not found or inactive' });
    return;
  }

  const update = req.body as TelegramUpdate;

  // Process the update
  await processTelegramUpdate(bot.id, update);

  // Update lastEventAt
  await prisma.bot.update({
    where: { id: bot.id },
    data: { lastEventAt: new Date() },
  }).catch(() => {});

  res.json({ ok: true });
}));

// GET /api/webhook/:secret/info
webhookRouter.get('/:secret/info', asyncHandler(async (req: Request, res: Response) => {
  const { secret } = req.params;

  const bot = await prisma.bot.findUnique({
    where: { webhookSecret: secret },
    select: {
      id: true,
      name: true,
      username: true,
      isActive: true,
      createdAt: true,
      lastEventAt: true,
      _count: { select: { events: true } },
    },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  res.json({ bot });
}));

// DELETE /api/webhook/:secret
webhookRouter.delete('/:secret', asyncHandler(async (req: Request, res: Response) => {
  const { secret } = req.params;

  const bot = await prisma.bot.findUnique({
    where: { webhookSecret: secret },
    select: { id: true, tokenHash: true },
  });

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  // Delete Telegram webhook
  try {
    const token = Buffer.from(bot.tokenHash, 'base64').toString();
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: 'POST' });
  } catch (error) {
    console.error('Failed to delete webhook:', error);
  }

  res.json({ ok: true });
}));

// Process Telegram update
async function processTelegramUpdate(botId: string, update: TelegramUpdate) {
  let eventType: string;
  let userId: string;
  let username: string | undefined;
  let firstName: string | undefined;
  let lastName: string | undefined;
  let languageCode: string | undefined;
  let payload: any = update;
  let eventName: string;
  let sessionId: string | undefined;

  if (update.message) {
    eventType = 'MESSAGE';
    eventName = update.message.text || 'message';
    userId = String(update.message.from?.id || update.message.chat.id);
    username = update.message.from?.username;
    firstName = update.message.from?.first_name;
    lastName = update.message.from?.last_name;
    languageCode = update.message.from?.language_code;
    sessionId = `${botId}_${userId}_${update.message.date}`;

    // Detect command
    if (update.message.text?.startsWith('/')) {
      eventType = 'COMMAND';
      eventName = update.message.text.split(' ')[0];
    }
  } else if (update.callback_query) {
    eventType = 'CALLBACK_QUERY';
    eventName = update.callback_query.data || 'callback';
    userId = String(update.callback_query.from.id);
    username = update.callback_query.from.username;
    firstName = update.callback_query.from.first_name;
    lastName = update.callback_query.from.last_name;
    languageCode = update.callback_query.from.language_code;
    sessionId = `${botId}_${userId}_${update.callback_query.from.id}_callback`;
  } else if (update.inline_query) {
    eventType = 'INLINE_QUERY';
    eventName = update.inline_query.query || 'inline_query';
    userId = String(update.inline_query.from.id);
    username = update.inline_query.from.username;
    firstName = update.inline_query.from.first_name;
    lastName = update.inline_query.from.last_name;
    sessionId = `${botId}_${userId}_inline_${update.inline_query.id}`;
  } else if (update.edited_message) {
    eventType = 'EDITED_MESSAGE';
    eventName = update.edited_message.text || 'edited_message';
    userId = String(update.edited_message.from?.id || update.edited_message.chat.id);
    username = update.edited_message.from?.username;
    firstName = update.edited_message.from?.first_name;
  } else if (update.channel_post) {
    eventType = 'CHANNEL_POST';
    eventName = update.channel_post.text || 'channel_post';
    userId = String(update.channel_post.chat.id);
  } else if (update.my_chat_member) {
    eventType = 'MY_CHAT_MEMBER';
    eventName = update.my_chat_member.new_chat_member.status;
    userId = String(update.my_chat_member.from.id);
    username = update.my_chat_member.from.username;
    firstName = update.my_chat_member.from.first_name;
  } else {
    // Unknown update type - log it
    eventType = 'CUSTOM';
    eventName = 'unknown';
    userId = '0';
  }

  // Hash session ID
  if (sessionId) {
    sessionId = crypto.createHash('md5').update(sessionId).digest('hex');
  }

  await prisma.event.create({
    data: {
      botId,
      userId,
      username,
      firstName,
      lastName,
      languageCode,
      eventType: eventType as any,
      eventName,
      payload: payload as any,
      timestamp: new Date(),
      sessionId,
    },
  });

  // Update or create session
  if (sessionId) {
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
        data: {
          id: sessionId,
          botId,
          userId,
          isActive: false,
          eventCount: 1,
        },
      }).catch(() => {});
    }
  }
}

// Type for Telegram update
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    date: number;
    text?: string;
    entities?: any[];
    caption?: string;
    document?: any;
    photo?: any[];
    sticker?: any;
  };
  edited_message?: {
    message_id: number;
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: { id: number; type: string };
    text?: string;
  };
  channel_post?: {
    message_id: number;
    chat: { id: number; type: string; title?: string; username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    message?: any;
    data?: string;
    inline_message_id?: string;
  };
  inline_query?: {
    id: string;
    from: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    query: string;
    offset: string;
  };
  my_chat_member?: {
    from: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: { id: number; type: string };
    date: number;
    old_chat_member: any;
    new_chat_member: {
      user: { id: number; is_bot: boolean; first_name?: string; username?: string };
      status: string;
    };
  };
}