'use client';

import { useEffect, useState } from 'react';
import { Bot, Users, Zap, Activity, Plus, Loader2, TrendingUp, ExternalLink, Settings, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { cn, formatNumber, api } from '@/lib/utils';

interface BotData {
  id: string;
  name: string;
  username: string;
  tokenPrefix: string;
  isActive: boolean;
  webhookUrl: string | null;
  lastEventAt: string | null;
  createdAt: string;
  _count: { events: number; sessions: number };
}

export default function BotsPage() {
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  const [newBotWebhook, setNewBotWebhook] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const data = await api<{ bots: BotData[] }>('/api/bots');
      setBots(data.bots);
    } catch (err) {
      console.error('Failed to load bots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    
    try {
      await api('/api/bots', {
        method: 'POST',
        body: JSON.stringify({
          name: newBotName,
          token: newBotToken,
          webhookUrl: newBotWebhook || null,
        }),
      });
      setShowModal(false);
      setNewBotName('');
      setNewBotToken('');
      setNewBotWebhook('');
      loadBots();
    } catch (err: any) {
      setError(err.message || 'Failed to create bot');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (botId: string) => {
    if (!confirm('Delete this bot? This will also remove the webhook from Telegram.')) return;
    
    try {
      await api(`/api/bots/${botId}`, { method: 'DELETE' });
      loadBots();
    } catch (err) {
      console.error('Failed to delete bot:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-tele-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bots</h1>
          <p className="text-slate-400 text-sm">Manage your Telegram bots and webhooks</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-tele-600 px-4 py-2 text-sm font-medium text-white hover:bg-tele-500 transition"
        >
          <Plus className="h-4 w-4" />
          Add Bot
        </button>
      </div>

      {bots.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <Bot className="h-12 w-12 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No bots yet</h3>
          <p className="text-slate-400 mb-6">Add your first Telegram bot to start tracking analytics</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-tele-600 px-4 py-2 text-sm font-medium text-white hover:bg-tele-500 transition"
          >
            <Plus className="h-4 w-4" />
            Add Bot
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map(bot => (
            <div
              key={bot.id}
              className={cn(
                'rounded-xl border p-5 transition',
                bot.isActive
                  ? 'border-slate-800 bg-slate-900/40 hover:border-tele-700/50'
                  : 'border-slate-800/50 bg-slate-900/20 opacity-70'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    bot.isActive ? 'bg-tele-600/20 text-tele-400' : 'bg-slate-800 text-slate-500'
                  )}>
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate max-w-[160px]">{bot.name}</h3>
                      <span className="text-xs text-slate-500">@{bot.username}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{bot.tokenPrefix}</p>
                  </div>
                </div>
                {bot.isActive && (
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Active" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-slate-400">Events</p>
                  <p className="font-medium text-white">{formatNumber(bot._count.events)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Sessions</p>
                  <p className="font-medium text-white">{formatNumber(bot._count.sessions)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/analytics?botId=${bot.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/50 hover:border-slate-600 transition"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Analytics
                </Link>
                <button
                  onClick={() => handleDelete(bot.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-700/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/20 hover:border-red-600 transition"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Bot Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Bot</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Bot Name</label>
                <input
                  value={newBotName}
                  onChange={e => setNewBotName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-tele-500"
                  placeholder="My Awesome Bot"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Bot Token</label>
                <input
                  value={newBotToken}
                  onChange={e => setNewBotToken(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-tele-500"
                  placeholder="123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                />
                <p className="mt-1 text-xs text-slate-500">Get this from @BotFather on Telegram</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Webhook URL (optional)</label>
                <input
                  value={newBotWebhook}
                  onChange={e => setNewBotWebhook(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-tele-500"
                  placeholder="https://yourdomain.com/webhook"
                />
                <p className="mt-1 text-xs text-slate-500">We&apos;ll auto-configure the webhook with Telegram</p>
              </div>
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-tele-600 px-4 py-2 text-sm font-medium text-white hover:bg-tele-500 disabled:opacity-50 transition"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}