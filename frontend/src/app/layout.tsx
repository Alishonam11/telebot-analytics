import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TeleBot Analytics — Real-time Telegram Bot Dashboard',
  description: 'Real-time analytics, user insights, funnels, and retention cohorts for Telegram bots.',
  keywords: ['telegram bot', 'analytics', 'dashboard', 'retention', 'funnel', 'realtime'],
  authors: [{ name: 'Alishonam11' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}