'use client';

import Link from 'next/link';
import { Bot, BarChart3, ShieldCheck, Zap, TrendingUp, Users, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-tele-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-tele-500 to-tele-700 shadow-lg shadow-tele-700/40">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">TeleBot Analytics</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-300 hover:text-white transition">Dashboard</Link>
            <Link
              href="/login"
              className="rounded-md bg-tele-600 px-4 py-2 text-sm font-medium text-white hover:bg-tele-500 transition"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 max-w-6xl pt-24 pb-20">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-tele-800 bg-tele-950/50 px-4 py-1.5 text-xs text-tele-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tele-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-tele-500"></span>
            </span>
            Real-time analytics for your Telegram bots
          </div>
          <h1 className="max-w-4xl text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-white via-slate-200 to-tele-200 bg-clip-text text-transparent">
            Understand your Telegram bot like never before
          </h1>
          <p className="max-w-2xl text-lg text-slate-400">
            One dashboard for all your bots. Track users, sessions, funnels, retention, and events in real time.
            Plug-and-play — just paste your bot token and set the webhook.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md bg-tele-600 px-6 py-3 font-medium text-white hover:bg-tele-500 transition shadow-lg shadow-tele-700/30"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-6 py-3 font-medium text-slate-200 hover:bg-slate-800/50 transition"
            >
              View demo dashboard
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-2">No credit card required · Free tier with 10K events/mo</p>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 max-w-6xl py-16 border-t border-slate-800/60">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Feature
            icon={<Users className="h-5 w-5" />}
            title="User Insights"
            description="See who's using your bot, their language, last active session, and lifetime event count."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Real-time Feed"
            description="Watch events arrive live. Debug callbacks, commands, and inline queries as they happen."
          />
          <Feature
            icon={<BarChart3 className="h-5 w-5" />}
            title="Funnels & Retention"
            description="Define multi-step funnels and track D1/D7/D30 retention cohorts. Find where users drop off."
          />
          <Feature
            icon={<TrendingUp className="h-5 w-5" />}
            title="Charts & Trends"
            description="Hourly events, new users per day, top commands, and events-by-type breakdowns out of the box."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Multi-bot Workspace"
            description="Track unlimited bots from a single account. Each bot gets its own webhook secret and API key."
          />
          <Feature
            icon={<Bot className="h-5 w-5" />}
            title="Plug-and-Play Webhook"
            description="Paste your bot token — we set the webhook with Telegram automatically and verify it."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8">
        <div className="container mx-auto px-4 max-w-6xl text-center text-sm text-slate-500">
          <p>TeleBot Analytics · Open source · MIT License</p>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 hover:border-tele-700/50 hover:bg-slate-900/60 transition">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-tele-900/50 text-tele-300">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}