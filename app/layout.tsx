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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.error('Unable to register app service worker:', error);
      });
    }

    // Initial sync check with Supabase if configured
    if (repository.isCloudSyncEnabled()) {
      repository.syncFromCloud();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
                <main className="flex-1 overflow-y-auto p-3 sm:p-5 pb-16 md:pb-5">
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
