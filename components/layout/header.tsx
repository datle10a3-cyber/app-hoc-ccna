'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ArrowLeft, Search, Moon, Sun, Menu, Database, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { repository } from '@/lib/db/repository';
import { supabase } from '@/lib/db/supabase-client';
import { useToast } from '@/components/ui/toast';
import { InstallAppButton } from '@/components/pwa/install-app-button';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenMobileMenu?: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Tổng Quan',
  learn: 'Bài Học',
  commands: 'Lệnh Cisco',
  topologies: 'Mô Hình Mạng',
  notes: 'Ghi Chú',
  assistant: 'Trợ lý AI',
  inbox: 'Smart Paste',
  favorites: 'Yêu Thích',
  settings: 'Cài Đặt & SQL'
};

export function Header({ onOpenSearch, onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routeStack = useRef<string[]>([pathname]);
  const backPending = useRef(false);
  const { theme, setTheme } = useTheme();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSqlConfigured, setIsSqlConfigured] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsSqlConfigured(repository.isCloudSyncEnabled());
    void supabase?.auth.getUser().then(({ data }) => setIsSignedIn(Boolean(data.user)));
  }, []);

  useEffect(() => {
    const handlePopState = () => { backPending.current = true; };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const stack = routeStack.current;
    if (stack[stack.length - 1] === pathname) return;
    if (backPending.current && stack.length > 1 && stack[stack.length - 2] === pathname) {
      stack.pop();
    } else {
      stack.push(pathname);
    }
    backPending.current = false;
  }, [pathname]);

  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  const pageTitle = pathname === '/commands/explainer' ? 'Giải Nghĩa Lệnh Cisco' : PAGE_TITLES[segment] || segment;
  const showBack = !['dashboard', 'login', 'register'].includes(segment);
  const backFallback = pathname.split('/').filter(Boolean).length > 1 ? `/${segment}` : '/dashboard';

  const handleBack = () => {
    if (routeStack.current.length > 1) {
      backPending.current = true;
      router.back();
    } else {
      router.push(backFallback);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const res = await repository.syncFromCloud();
    setIsSyncing(false);
    if (res.success) {
      toast('Đồng bộ thành công!', res.message, 'success');
      window.dispatchEvent(new Event('ccna:data-sync'));
    } else {
      toast('Thông báo đồng bộ', res.message, 'info');
    }
  };

  return (
    <header className="app-header h-12 border-b border-border bg-card/90 backdrop-blur-md px-3 md:px-4 flex items-center justify-between z-20 shrink-0">
      <div className="flex min-w-0 items-center gap-2">
        {/* Mobile Menu */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Mở Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {showBack && (
          <Button variant="ghost" size="sm" onClick={handleBack} className="shrink-0 gap-1 px-1.5 text-[11px] sm:px-2.5" title="Quay lại trang trước">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </Button>
        )}

        <span className={`text-xs font-black text-amber-500 tracking-wider ${showBack ? 'hidden sm:inline' : ''}`}>CCNA</span>
        <span className={`text-muted-foreground text-xs ${showBack ? 'hidden sm:inline' : ''}`}>/</span>
        <h1 className={`text-xs font-bold text-foreground truncate max-w-[120px] sm:max-w-none ${showBack ? 'hidden sm:block' : ''}`}>{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <InstallAppButton />
        {/* Sync Status Badge */}
        {isSqlConfigured ? (
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/25 transition-colors"
            title="Đồng bộ dữ liệu SQL Supabase"
          >
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-amber-500" />
            )}
            <span className="hidden sm:inline">{isSignedIn ? 'Synced' : 'Đăng nhập để sync'}</span>
          </button>
        ) : (
          <span 
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold"
            title="Dữ liệu lưu tại máy cá nhân"
          >
            <Database className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Local DB</span>
          </span>
        )}

        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-input bg-muted/40 hover:bg-muted text-xs text-muted-foreground transition-colors w-9 sm:w-44 justify-center sm:justify-start"
          title="Tìm kiếm (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span className="hidden sm:inline flex-1 text-left">Tìm kiếm...</span>
          <kbd className="hidden sm:inline text-[10px] font-mono bg-muted px-1 rounded border border-border">⌘K</kbd>
        </button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Chuyển giao diện"
          className="w-8 h-8"
        >
          <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-amber-400" />
        </Button>
      </div>
    </header>
  );
}
