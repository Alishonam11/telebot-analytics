'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, Users, Zap, Clock, TrendingUp, BarChart3, Activity, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { cn, formatNumber, api, formatDate } from '@/lib/utils';

interface OverviewData {
  period: string;
  overview: {
    totalUsers: number;
    totalEvents: number;
    totalSessions: number;
    activeUsers: number;
    avgEventsPerUser: number;
  };
  eventsByType: { type: string; count: number }[];
  eventsByHour: { hour: string; count: number }[];
  topCommands: { command: string; count: number }[];
  newUsers: { date: string; count: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const botId = searchParams.get('botId');
  const [period, setPeriod] = useState('24h');
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!botId) return;
    fetchData();
  }, [botId, period]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<OverviewData>(`/api/analytics/overview/${botId}?period=${period}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (!botId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Select a bot</h3>
          <p className="text-slate-400">Choose a bot from the <Link href="/dashboard/bots" className="text-tele-400 hover:underline">Bots page</Link> to view analytics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-tele-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-700/50 bg-red-900/20 p-6 text-center">
        <p className="text-red-400">{error || 'No data'}</p>
        <button onClick={fetchData} className="mt-4 text-sm text-tele-400 hover:underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-slate-400 text-sm">Real-time insights for your Telegram bot</p>
        </div>
        <div className="flex items-center gap-2">
          {['1h', '6h', '24h', '7d', '30d'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                period === p
                  ? 'bg-tele-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={<Users className="h-5 w-5" />}
          label="Total Users"
          value={formatNumber(data.overview.totalUsers)}
          color="tele"
        />
        <KPICard
          icon={<Zap className="h-5 w-5" />}
          label="Total Events"
          value={formatNumber(data.overview.totalEvents)}
          color="amber"
        />
        <KPICard
          icon={<Activity className="h-5 w-5" />}
          label="Sessions"
          value={formatNumber(data.overview.totalSessions)}
          color="green"
        />
        <KPICard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Active (1h)"
          value={formatNumber(data.overview.activeUsers)}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Events per Hour" subtitle={`Last ${period}`}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.eventsByHour.reverse()}>
              <defs>
                <linearGradient id="teleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tickFormatter={t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                formatter={(value: number) => [formatNumber(value), 'Events']}
              />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#teleGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Events by Type">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.eventsByType}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="type"
                label={({ type, count, percent }) => `${type}: ${formatNumber(count)} (${(percent * 100).toFixed(1)}%)`}
                labelLine={false}
              >
                {data.eventsByType.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                formatter={(value: number) => [formatNumber(value), 'Events']}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top Commands" subtitle={`Last ${period}`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topCommands.slice().reverse()} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="command" type="category" width={100} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                formatter={(value: number) => [formatNumber(value), 'Uses']}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="New Users per Day" subtitle={`Last ${period}`}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.newUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tickFormatter={(t: any) => formatDate(t)} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                formatter={(value: number) => [formatNumber(value), 'New Users']}
              />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'tele' | 'amber' | 'green' | 'purple' }) {
  const colors = {
    tele: 'bg-tele-600/20 text-tele-400 border-tele-700/30',
    amber: 'bg-amber-600/20 text-amber-400 border-amber-700/30',
    green: 'bg-green-600/20 text-green-400 border-green-700/30',
    purple: 'bg-purple-600/20 text-purple-400 border-purple-700/30',
  };
  
  return (
    <div className={cn('rounded-xl border p-5', colors[color])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg">{icon}</div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}