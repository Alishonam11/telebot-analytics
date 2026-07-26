'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, LayoutDashboard, BarChart3, Settings, LogOut, Bot as BotIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/bots', label: 'Bots', icon: Bot },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-800 bg-slate-950 flex flex-col">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-tele-500 to-tele-700">
          <BotIcon className="h-5 w-5 text-white" />
        </div>
        <span className="font-semibold text-white truncate">TeleBot Analytics</span>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                active
                  ? 'bg-tele-600/15 text-tele-300 border-l-2 border-tele-500'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 w-full text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}