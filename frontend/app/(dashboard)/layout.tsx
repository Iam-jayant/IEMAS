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

      // Production auth (disabled for now)
      // const supabase = createClient();
      // const { data: { session } } = await supabase.auth.getSession();
      // if (!session) {
      //   router.push('/login');
      //   return;
      // }
      // setUser(session.user);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    if (DEV_MODE) {
      console.log('Dev mode: Logout disabled');
      return;
    }
    
    // Production logout
    // const supabase = createClient();
    // await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Meters', href: '/meters', icon: Gauge },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'AI Assistant', href: '/ai-assistant', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Alert Notification - Fixed top-right position across all dashboard pages */}
      <AlertNotification />
      
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-[#111827] border-r border-gray-800 transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          {isSidebarOpen && (
            <div>
              <h1 className="text-white font-bold text-lg">IEMAS</h1>
              <p className="text-gray-400 text-xs">v1.0.0 {DEV_MODE && '(DEV)'}</p>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 ${
                  isActive
                    ? 'bg-[#019CDF]/10 text-[#019CDF] border-l-4 border-[#019CDF]'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'
                } transition-colors`}
              >
                <Icon size={20} />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-800 p-4">
          {isSidebarOpen ? (
            <div className="mb-3">
              <p className="text-white text-sm font-medium truncate">
                {user?.email || 'Development User'}
              </p>
              <p className="text-gray-400 text-xs">Energy Engineer</p>
            </div>
          ) : null}
          
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 ${
              isSidebarOpen ? 'w-full' : ''
            } px-3 py-2 text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded transition-colors ${
              DEV_MODE ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={DEV_MODE}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {navItems.find((item) => pathname?.startsWith(item.href))?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Dev Mode Indicator */}
            {DEV_MODE && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                🔧 DEV MODE
              </div>
            )}
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <Activity className="text-green-500" size={16} />
              <span className="text-sm text-gray-600">System Online</span>
            </div>

            {/* Notification Badge */}
            <button className="relative p-2 hover:bg-gray-100 rounded-full">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
