'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Profile } from '@/lib/types';
import {
  Compass, LayoutDashboard, Target, Settings,
  CreditCard, LogOut, Menu, X, ChevronDown,
  User, BookOpen,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Deals', href: '/dashboard/deals', icon: Target },
  { label: 'Knowledge Base', href: '/dashboard/knowledge', icon: BookOpen, adminOnly: true },
  { label: 'Credits', href: '/dashboard/credits', icon: CreditCard, badge: 'Soon' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, badge: 'Soon' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    setIsAdmin(!!adminEmail && user.email === adminEmail);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) setProfile(profileData as Profile);

    // Load credit balance
    const { data: credits } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (credits) setCreditBalance(credits.balance);
  }, [supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-surface-border
          flex flex-col transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-surface-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">DealPilot</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credit badge */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-brand-500/8 border border-brand-500/15">
            <span className="text-xs text-gray-400">Credits</span>
            <span className="text-sm font-bold text-brand-400">{creditBalance}</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV_ITEMS
            .filter((item) => !('adminOnly' in item && item.adminOnly) || isAdmin)
            .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.badge ? '#' : item.href}
                onClick={(e) => item.badge && e.preventDefault()}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/15'
                    : item.badge
                    ? 'text-gray-600 cursor-default'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-hover'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
                {item.badge && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-surface-lighter text-gray-600">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="p-3 border-t border-surface-border">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-gray-300 truncate">
                  {profile?.full_name || 'Loading...'}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {profile?.company_name || ''}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-light border border-surface-border rounded-xl overflow-hidden shadow-xl">
                <Link
                  href="/profile/setup"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-surface-hover"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  Edit Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">DealPilot</span>
          </div>
          <div className="text-xs text-brand-400 font-semibold">{creditBalance} cr</div>
        </div>

        {/* Page content */}
        <main className="p-6 lg:p-8 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}
