import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123456', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@telebot-analytics.com' },
    update: {},
    create: {
      email: 'demo@telebot-analytics.com',
      passwordHash,
      name: 'Demo User',
      plan: 'PRO',
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create demo bot
  const bot = await prisma.bot.upsert({
    where: { 
      tokenHash: Buffer.from('123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11').toString('base64') 
    },
    update: {},
    create: {
      name: 'Demo Bot',
      username: 'demo_bot',
      tokenHash: Buffer.from('123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11').toString('base64'),
      tokenPrefix: '123456789:...',
      webhookSecret: 'demo-webhook-secret-12345',
      ownerId: user.id,
      isActive: true,
    },
  });

  console.log('✅ Created demo bot:', bot.name);

  // Create sample events
  const events = [];
  const now = new Date();
  const eventTypes = ['MESSAGE', 'COMMAND', 'CALLBACK_QUERY', 'INLINE_QUERY'] as const;
  const commands = ['/start', '/help', '/settings', '/menu', '/stats'];
  const messages = ['Hello!', 'How are you?', 'Thanks!', 'Bye', 'Nice bot!'];
  const callbackData = ['action_1', 'action_2', 'confirm', 'cancel', 'settings_menu'];

  for (let i = 0; i < 500; i++) {
    const hoursAgo = Math.random() * 168; // Up to 7 days ago
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    let eventName: string;
    if (eventType === 'COMMAND') {
      eventName = commands[Math.floor(Math.random() * commands.length)];
    } else if (eventType === 'CALLBACK_QUERY') {
      eventName = callbackData[Math.floor(Math.random() * callbackData.length)];
    } else {
      eventName = messages[Math.floor(Math.random() * messages.length)];
    }

    const userId = String(Math.floor(Math.random() * 1000) + 100000);
    const sessionId = `${bot.id}_${userId}_${Math.floor(timestamp.getTime() / (30 * 60 * 1000))}`;

    events.push({
      botId: bot.id,
      userId,
      username: `user_${userId}`,
      firstName: `User${userId}`,
      lastName: 'Test',
      languageCode: 'en',
      eventType,
      eventName,
      payload: { test: true },
      timestamp,
      sessionId,
    });
  }

  await prisma.event.createMany({ data: events });
  console.log(`✅ Created ${events.length} sample events`);

  // Create sample sessions
  const sessions = [];
  for (let i = 0; i < 100; i++) {
    const hoursAgo = Math.random() * 168;
    const startedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const duration = Math.floor(Math.random() * 300) + 30; // 30-330 seconds
    const eventCount = Math.floor(Math.random() * 20) + 1;
    
    sessions.push({
      id: `${bot.id}_session_${i}`,
      botId: bot.id,
      userId: String(Math.floor(Math.random() * 1000) + 100000),
      startedAt,
      endedAt: new Date(startedAt.getTime() + duration * 1000),
      duration,
      eventCount,
      isActive: false,
    });
  }

  await prisma.session.createMany({ data: sessions });
  console.log(`✅ Created ${sessions.length} sample sessions`);

  // Create a demo funnel
  await prisma.funnel.upsert({
    where: { id: 'demo-funnel-onboarding' },
    update: {},
    create: {
      id: 'demo-funnel-onboarding',
      botId: bot.id,
      name: 'User Onboarding',
      steps: [
        { eventName: '/start', label: 'Started Bot' },
        { eventName: 'message', label: 'First Message' },
        { eventName: '/help', label: 'Viewed Help' },
        { eventName: 'callback_query', label: 'Clicked Button' },
      ] as any,
      isActive: true,
    },
  });
  console.log('✅ Created demo funnel');

  // Create retention cohorts
  for (let i = 0; i < 30; i++) {
    const cohortDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const totalUsers = Math.floor(Math.random() * 50) + 10;
    const retained: Record<string, number> = {};
    
    for (let day = 1; day <= 7; day++) {
      const retentionRate = Math.max(0.1, 1 - day * 0.12 + Math.random() * 0.1);
      retained[String(day)] = Math.floor(totalUsers * retentionRate);
    }

    await prisma.retentionCohort.upsert({
      where: { 
        botId_cohortDate_period: { 
          botId: bot.id, 
          cohortDate, 
          period: 'DAY' 
        } 
      },
      update: {},
      create: {
        botId: bot.id,
        cohortDate,
        period: 'DAY',
        totalUsers,
        retained: retained as any,
      },
    });
  }
  console.log('✅ Created 30 retention cohorts');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });