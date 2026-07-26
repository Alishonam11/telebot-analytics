'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bot, Users, Zap, Activity, Plus, Loader2, ChevronRight, Bot as BotIcon } from 'lucide-react';
import { cn, formatNumber, api } from '@/lib/utils';

interface BotData {
  id: string;
  name: string;
  username: string;
  tokenPrefix: string;
  isActive: boolean;
  lastEventAt: string | null;
  createdAt: string;
  _count: { events: number; sessions: number };
}

export default function DashboardPage() {
  const router = useRouter();
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ bots: BotData[] }>('/api/bots');
        setBots(data.bots);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalEvents = bots.reduce((sum, b) => sum + b._count.events, 0);
  const totalSessions = bots.reduce((sum, b) => sum + b._count.sessions, 0);
  const activeBots = bots.filter(b => b.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-tele-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of all your Telegram bots</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={<Bot />} label="Active Bots" value={formatNumber(activeBots)} color="bg-tele-600/15 text-tele-300" />
        <StatsCard icon={<Zap />} label="Total Events" value={formatNumber(totalEvents)} color="bg-amber-600/15 text-amber-300" />
        <StatsCard icon={<Activity />} label="Sessions" value={formatNumber(totalSessions)} color="bg-green-600/15 text-green-300" />
        <StatsCard icon={<Users />} label="Total Bots" value={formatNumber(bots.length)} color="bg-purple-600/15 text-purple-300" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Your Bots</h2>
            <Link href="/dashboard/bots" className="text-sm text-tele-400 hover:text-tele-300">View all →</Link>
          </div>
          <Link href="/dashboard/bots" className="flex items-center gap-2 rounded-lg bg-tele-600 px-4 py-2 text-sm font-medium text-white hover:bg-tele-500 transition">
            <Plus className="h-4 w-4" /> Add Bot
          </Link>
        </div>

        {bots.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
            <BotIcon className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No bots yet</h3>
            <p className="text-slate-400 mb-6">Add your first Telegram bot to start tracking analytics</p>
            <Link href="/dashboard/bots" className="inline-flex items-center gap-2 rounded-lg bg-tele-600 px-4 py-2 text-sm font-medium text-white hover:bg-tele-500 transition">
              <Plus className="h-4 w-4" /> Add Bot
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {bots.slice(0, 5).map(bot => (
              <Link
                key={bot.id}
                href={`/dashboard/analytics?botId=${bot.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-tele-700/50 hover:bg-slate-900/60 transition group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    bot.isActive ? 'bg-tele-600/20 text-tele-400' : 'bg-slate-800 text-slate-500'
                  )}>
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{bot.name}</span>
                      <span className="text-xs text-slate-500">@{bot.username}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>{formatNumber(bot._count.events)} events</span>
                      <span>{formatNumber(bot._count.sessions)} sessions</span>
                      {bot.lastEventAt && <span>Last: {new Date(bot.lastEventAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'h-2 w-2 rounded-full',
                    bot.isActive ? 'bg-green-500' : 'bg-slate-600'
                  )} />
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-tele-400 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', color)}>{icon}</div>
      </div>
    </div>
  );
}