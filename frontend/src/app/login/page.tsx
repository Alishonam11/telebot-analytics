'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      
      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-tele-500 to-tele-700">
          <Bot className="h-6 w-6 text-white" />
       </div>
        <span className="text-xl font-semibold">TeleBot Analytics</span>
     </div>
      
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
        <p className="text-slate-400 text-center mb-8">Sign in to your dashboard</p>
        
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-300">
            {error}
         </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
              Email
           </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={cn(
                'w-full rounded-lg border bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-tele-500 focus:border-transparent',
                'border-slate-700 hover:border-slate-600'
              )}
              placeholder="you@example.com"
            />
         </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
              Password
           </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={cn(
                  'w-full rounded-lg border bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 pr-12',
                  'focus:outline-none focus:ring-2 focus:ring-tele-500 focus:border-transparent',
                  'border-slate-700 hover:border-slate-600'
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
             </button>
           </div>
         </div>
          
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full rounded-lg px-4 py-3 font-medium text-white transition',
              'bg-tele-600 hover:bg-tele-500 disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-tele-500 focus:ring-offset-2 focus:ring-offset-slate-950'
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
             </span>
            ) : (
              'Sign in'
            )}
         </button>
       </form>
        
        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-tele-400 hover:text-tele-300 font-medium">
            Create one
         </Link>
       </p>
     </div>
   </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 animate-pulse">
        <div className="h-8 w-48 mx-auto bg-slate-800 rounded mb-8" />
        <div className="space-y-5">
          <div className="h-12 bg-slate-800 rounded-lg" />
          <div className="h-12 bg-slate-800 rounded-lg" />
          <div className="h-12 bg-slate-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-tele-950 px-4">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
     </Suspense>
   </div>
  );
}