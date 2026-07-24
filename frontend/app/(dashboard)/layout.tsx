'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AlertNotification from '@/components/AlertNotification';
import {
  Gauge,
  Bell,
  Activity,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3
} from 'lucide-react';

// DEVELOPMENT MODE: Auth disabled
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE !== 'false';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // DEVELOPMENT MODE: Skip authentication
      if (DEV_MODE) {
        setUser({ email: 'dev@iemas.local', id: 'dev-user' });
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    if (DEV_MODE) {
      console.log('Dev mode: Logout disabled');
      return;
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-sans">
        <div className="text-text-3 font-mono text-xs uppercase tracking-widest animate-pulse">Initializing System...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex font-sans selection:bg-teal-accent/20 selection:text-teal-accent">
      {/* Alert Notification - Fixed top-right position across all dashboard pages */}
      <AlertNotification />
      
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-surface border-r border-border transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 pl-2">
              <span className="w-2 h-2 rounded-full bg-teal-accent animate-pulse" />
              <div>
                <h1 className="text-text-1 font-bold font-display text-base tracking-tight leading-none">IEMAS</h1>
                <span className="text-text-3 font-mono text-[9px] font-bold uppercase tracking-wider">v1.0.0 {DEV_MODE && '(DEV)'}</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-surface-2 rounded-xl text-text-3 hover:text-text-1 transition-colors cursor-pointer"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 border-l-4 transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-accent/5 text-teal-accent border-teal-accent font-semibold font-mono text-xs uppercase tracking-wider'
                    : 'text-text-2 hover:bg-surface-2 hover:text-text-1 border-transparent text-xs font-semibold'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-teal-accent' : 'text-text-3'} />
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4 bg-surface-2/40">
          {isSidebarOpen ? (
            <div className="mb-3 pl-1">
              <p className="text-text-1 text-xs font-bold truncate font-mono">
                {user?.email || 'dev@iemas.local'}
              </p>
              <p className="text-text-3 text-[10px] uppercase font-bold tracking-wider font-mono mt-0.5">Energy Engineer</p>
            </div>
          ) : null}
          
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 ${
              isSidebarOpen ? 'w-full' : ''
            } px-3 py-2 text-text-3 hover:bg-red-accent/10 hover:text-red-accent rounded-xl transition-colors font-mono text-xs uppercase font-bold tracking-wider ${
              DEV_MODE ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
            disabled={DEV_MODE}
          >
            <LogOut size={16} />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
          <div>
            <h2 className="text-md font-bold font-display text-text-1 uppercase tracking-wider">
              {navItems.find((item) => pathname?.startsWith(item.href))?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Dev Mode Indicator */}
            {DEV_MODE && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-accent/5 text-amber-accent border border-amber-accent/20 rounded-full font-mono text-[9px] font-bold tracking-wider select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-accent animate-ping" />
                DEV MODE
              </div>
            )}
            
            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-accent/5 text-teal-accent border border-teal-accent/20 rounded-full font-mono text-[9px] font-bold tracking-wider select-none">
              <Activity className="animate-pulse" size={12} />
              <span>SYSTEM ONLINE</span>
            </div>

            {/* Notification Badge */}
            <button className="relative p-2 hover:bg-surface-2 rounded-xl text-text-2 hover:text-text-1 transition-colors cursor-pointer border border-border">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-accent rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-bg">
          {children}
        </div>
      </main>
    </div>
  );
}
