'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Terminal, Network, StickyNote, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Tổng Quan', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Bài Học', href: '/learn', icon: BookOpen },
    { name: 'Lệnh Cisco', href: '/commands', icon: Terminal },
    { name: 'Mô Hình', href: '/topologies', icon: Network },
    { name: 'Ghi Chú', href: '/notes', icon: StickyNote },
    { name: 'Trợ lý AI', href: '/assistant', icon: Sparkles },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-md border-t border-border z-30 flex items-center justify-around px-2">
      {navItems.map(item => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-medium transition-colors",
              isActive ? "text-amber-500 dark:text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("w-4 h-4 mb-0.5", isActive && "text-amber-500 dark:text-amber-400 scale-110 transition-transform")} />
            <span className="truncate max-w-[60px]">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
