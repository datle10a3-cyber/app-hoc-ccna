'use client';

import React, { useState, useEffect } from 'react';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { CmdKSearchModal } from '@/components/layout/cmd-k-search-modal';
import { repository } from '@/lib/db/repository';
import { AssistantProvider } from '@/components/providers/assistant-provider';
import { supabase } from '@/lib/db/supabase-client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.error('Unable to register app service worker:', error);
      });
    }

    let disposed = false;
    const hydrateAccount = async (userId: string | null) => {
      await repository.setActiveUser(userId);
      if (userId && repository.isCloudSyncEnabled()) {
        const result = await repository.syncFromCloud();
        if (!disposed && result.success) setDataRevision(value => value + 1);
      } else if (!disposed) setDataRevision(value => value + 1);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    if (supabase) {
      const client = supabase;
      let syncChannel: any = null;
      let syncTimer: ReturnType<typeof setTimeout> | undefined;
      const connectRealtime = (userId: string | null) => {
        if (syncChannel) void client.removeChannel(syncChannel);
        syncChannel = null;
        if (!userId) return;
        const channel = client.channel(`ccna-account-sync-${userId}`);
        for (const table of ['ccna_lessons','ccna_cisco_commands','ccna_topologies','ccna_personal_notes','ccna_user_images']) {
          channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
            if (syncTimer) clearTimeout(syncTimer);
            syncTimer = setTimeout(() => {
              void repository.syncFromCloud().then(result => { if (!disposed && result.success) setDataRevision(value => value + 1); });
            }, 350);
          });
        }
        syncChannel = channel.subscribe();
      };
      void client.auth.getSession().then(({ data }) => {
        const userId = data.session?.user.id || null;
        connectRealtime(userId);
        return hydrateAccount(userId);
      });
      const { data: listener } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          connectRealtime(session?.user.id || null);
          void hydrateAccount(session?.user.id || null);
        }
      });
      const handleFocus = () => { if (document.visibilityState === 'visible') void repository.syncFromCloud().then(result => { if (!disposed && result.success) setDataRevision(value => value + 1); }); };
      window.addEventListener('focus', handleFocus);
      const cleanup = () => { disposed = true; listener.subscription.unsubscribe(); window.removeEventListener('focus', handleFocus); if (syncTimer) clearTimeout(syncTimer); if (syncChannel) void client.removeChannel(syncChannel); };
      const keydownCleanup = () => window.removeEventListener('keydown', handleKeyDown);
      window.addEventListener('keydown', handleKeyDown);
      return () => { cleanup(); keydownCleanup(); };
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => { disposed = true; window.removeEventListener('keydown', handleKeyDown); };
  }, []);

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <title>CCNA Notes - Sổ Tay Học Mạng</title>
        <meta name="description" content="Ứng dụng ghi chép cá nhân cho CCNA - Lưu bài học, lệnh Cisco, mô hình mạng." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#07101e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CCNA Notes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="antialiased min-h-[100dvh] bg-background text-foreground flex overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ToastProvider>
          <AssistantProvider>
            <div className="flex w-full h-[100dvh] min-h-[100svh] overflow-hidden">
              <Sidebar 
                mobileOpen={mobileMenuOpen} 
                onMobileClose={() => setMobileMenuOpen(false)} 
              />
              <div className="flex-1 flex flex-col h-[100dvh] min-h-[100svh] overflow-hidden">
                <Header 
                  onOpenSearch={() => setIsSearchOpen(true)} 
                  onOpenMobileMenu={() => setMobileMenuOpen(true)}
                />
                <main key={dataRevision} className="flex-1 overflow-y-auto p-3 sm:p-5 pb-16 md:pb-5">
                  {children}
                </main>
              </div>
            </div>
            <MobileBottomNav />
            <CmdKSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
          </AssistantProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
