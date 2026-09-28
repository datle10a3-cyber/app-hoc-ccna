'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Terminal,
  Network,
  StickyNote,
  Star,
  Settings,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Sparkles,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: 'Tổng Quan', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Bài Học', href: '/learn', icon: BookOpen },
    { name: 'Lệnh Cisco', href: '/commands', icon: Terminal },
    { name: 'Mô Hình Mạng', href: '/topologies', icon: Network },
    { name: 'Ghi Chú', href: '/notes', icon: StickyNote },
    { name: 'Trợ lý AI', href: '/assistant', icon: Sparkles },
    { name: 'Smart Paste', href: '/inbox', icon: Inbox },
    { name: 'Yêu Thích', href: '/favorites', icon: Star },
    { name: 'Cài Đặt & SQL', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "flex flex-col h-screen border-r border-border bg-card transition-all duration-200 z-50 select-none",
          "hidden md:relative md:flex",
          collapsed ? "md:w-16" : "md:w-52",
          mobileOpen ? "fixed inset-y-0 left-0 w-64 shadow-2xl flex" : ""
        )}
      >
        {/* Top Branding Header */}
        <div className="flex items-center justify-between h-12 px-3 border-b border-border">
          {(!collapsed || mobileOpen) ? (
            <Link href="/dashboard" className="flex items-center gap-2" onClick={onMobileClose}>
              <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center shadow-sm">
                <Terminal className="w-3.5 h-3.5 text-slate-950 font-bold" />
              </div>
              <span className="text-xs font-extrabold tracking-wide text-foreground">CCNA Notes</span>
            </Link>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center">
                <Terminal className="w-3.5 h-3.5 text-slate-950 font-bold" />
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Mobile Close */}
          {mobileOpen && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                title={collapsed && !mobileOpen ? item.name : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-xs font-semibold transition-all",
                  isActive
                    ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 font-bold shadow-xs"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground")} />
                {(!collapsed || mobileOpen) && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
