'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AlertNotification from '@/components/AlertNotification';
import { api } from '@/lib/api';
import {
  Gauge,
  Bell,
  Activity,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  Zap,
  ChevronRight,
} from 'lucide-react';

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user] = useState<any>({ email: 'admin@iemas.io', id: 'admin' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dynamic backend health check
  const checkHealth = useCallback(async () => {
    try {
      await api.get('/api/health');
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(false);
    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(healthInterval);
      clearInterval(clockInterval);
    };
  }, [checkHealth]);

  const handleLogout = async () => {
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Meters', href: '/meters', icon: Gauge },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Historical Data', href: '/historical', icon: Activity },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'AI Assistant', href: '/ai-assistant', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <Zap className="text-teal-accent animate-pulse" size={32} />
          <div className="text-text-3 font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
            Initializing System…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-bg flex p-2 md:p-3 gap-2 md:gap-3 font-sans selection:bg-teal-accent/20 selection:text-teal-accent overflow-hidden">
      <AlertNotification />

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (Floating Island) ── */}
      <aside
        className={`${
          isSidebarOpen ? 'translate-x-0 w-[260px]' : '-translate-x-[120%] md:translate-x-0 md:w-[72px]'
        } fixed md:relative z-40 inset-y-2 left-2 md:inset-auto md:left-auto glass rounded-xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] h-[calc(100vh-16px)] md:h-full`}
      >
        {/* Logo Bar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {isSidebarOpen && (
            <div className="flex items-center gap-3 pl-1">
              <div className="w-8 h-8 rounded-md bg-teal-accent/10 border border-teal-accent/20 flex items-center justify-center">
                <Zap size={16} className="text-teal-accent" />
              </div>
              <div>
                <h1 className="text-text-1 font-bold font-display text-sm tracking-tight leading-none">
                  IEMAS
                </h1>
                <span className="text-text-3 font-mono text-[8px] font-bold uppercase tracking-[0.15em]">
                  v1.0.0
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex p-2 hover:bg-surface-2 rounded-md text-text-3 hover:text-text-1 transition-all cursor-pointer"
          >
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-surface-2 rounded-md text-text-3 hover:text-text-1 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-teal-accent/10 text-teal-accent'
                      : 'text-text-3 hover:bg-surface-2 hover:text-text-1'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-teal-accent' : 'text-text-3 group-hover:text-text-2'} />
                  {isSidebarOpen && (
                    <span className={`text-xs font-medium tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                      {item.name}
                    </span>
                  )}
                  {isSidebarOpen && isActive && (
                    <ChevronRight size={14} className="ml-auto text-teal-accent/50" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Footer */}
        <div className="border-t border-border p-3">
          {isSidebarOpen ? (
            <div className="mb-2 px-2">
              <p className="text-text-2 text-[11px] font-medium truncate">
                {user?.email || 'admin@iemas.io'}
              </p>
              <p className="text-text-3 text-[9px] uppercase font-bold tracking-[0.15em] font-mono mt-0.5">
                Energy Engineer
              </p>
            </div>
          ) : null}

          <button
            onClick={handleLogout}
            className={`flex items-center gap-2.5 ${
              isSidebarOpen ? 'w-full' : ''
            } px-3 py-2 text-text-3 hover:bg-red-accent/10 hover:text-red-accent rounded-sm transition-all font-mono text-[10px] uppercase font-bold tracking-wider cursor-pointer`}
          >
            <LogOut size={14} />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 h-full relative z-10">
        {/* Header Bar (Floating Island) */}
        <header className="h-14 glass rounded-xl mb-2 md:mb-3 shrink-0 flex items-center justify-between px-4 md:px-6 relative transition-all duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 hover:bg-surface-2 rounded-md text-text-3 hover:text-text-1 transition-all cursor-pointer"
            >
              <Menu size={18} />
            </button>
            <h2 className="text-sm font-semibold text-text-1 tracking-wide truncate">
              {navItems.find((item) => pathname?.startsWith(item.href))?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock */}
            <div className="hidden sm:flex items-center gap-2 text-text-3 font-mono text-[10px] tracking-wider">
              <span>{formatDate(currentTime)}</span>
              <span className="text-text-3/50">|</span>
              <span className="text-text-2 font-bold tabular-nums">{formatTime(currentTime)}</span>
            </div>

            {/* System Health Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[9px] font-bold tracking-wider select-none border transition-all ${
                backendOnline === null
                  ? 'bg-surface-2 text-text-3 border-border'
                  : backendOnline
                    ? 'bg-teal-accent/8 text-teal-accent border-teal-accent/20'
                    : 'bg-red-accent/8 text-red-accent border-red-accent/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendOnline === null
                    ? 'bg-text-3'
                    : backendOnline
                      ? 'bg-teal-accent shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                      : 'bg-red-accent shadow-[0_0_6px_rgba(248,113,113,0.5)] animate-pulse'
                }`}
              />
              <span className="hidden sm:inline">
                {backendOnline === null ? 'CHECKING' : backendOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
              </span>
              <span className="sm:hidden">
                {backendOnline === null ? '...' : backendOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-surface-2 rounded-md text-text-3 hover:text-text-1 transition-all cursor-pointer">
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-1 pb-1">
          {children}
        </div>
      </main>
    </div>
  );
}