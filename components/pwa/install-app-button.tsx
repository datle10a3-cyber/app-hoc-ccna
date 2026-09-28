'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, MoreVertical, Smartphone, Check } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIos(ios);
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setPromptEvent(null);
      setShowGuide(false);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) {
      setShowGuide(true);
      return;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setPromptEvent(null);
        setIsInstalled(true);
      } else {
        setShowGuide(true);
      }
    } catch {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button type="button" onClick={() => void install()} disabled={isInstalled} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-2.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-400/20 disabled:cursor-default disabled:opacity-80 dark:text-cyan-200 sm:px-3" aria-label={isInstalled ? 'Ứng dụng đã được cài' : 'Cài CCNA Notes thành ứng dụng'}>
        {isInstalled ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isInstalled ? 'Đã cài app' : 'Cài app'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowGuide(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-app-title" className="w-full max-w-md rounded-2xl border border-cyan-300/20 bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/15 text-cyan-500"><Smartphone className="h-5 w-5" /></div><div><h2 id="install-app-title" className="font-bold">Cài CCNA Notes</h2><p className="mt-0.5 text-xs text-muted-foreground">Mở nhanh như một ứng dụng riêng</p></div></div>
              <button type="button" onClick={() => setShowGuide(false)} aria-label="Đóng hướng dẫn" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            {isIos ? (
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>iPhone và iPad chỉ cho phép cài ứng dụng web từ trình duyệt Safari. Apple không cho tải trực tiếp tệp cài iOS từ link Vercel.</p>
                <ol className="list-decimal space-y-2 pl-5 text-foreground"><li>Mở link này bằng <strong>Safari</strong>.</li><li>Chạm <Share className="mx-1 inline h-4 w-4 text-cyan-500" /> <strong>Chia sẻ</strong>.</li><li>Chọn <strong>Thêm vào Màn hình chính</strong>, rồi chạm <strong>Thêm</strong>.</li></ol>
                <p className="rounded-lg bg-muted/60 p-3 text-xs">Sau khi cài, CCNA Notes sẽ mở ở chế độ toàn màn hình. Muốn phát hành tệp iPhone/iPad cài đặt như app App Store, cần tài khoản Apple Developer và quy trình ký/phát hành của Apple.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>Ứng dụng web đã sẵn sàng cài trên thiết bị và có biểu tượng riêng, chạy toàn màn hình.</p>
                <ol className="list-decimal space-y-2 pl-5 text-foreground"><li>Nhấn <strong>Cài ứng dụng</strong> nếu trình duyệt hiện nút cài.</li><li>Nếu chưa thấy, mở menu trình duyệt <MoreVertical className="mx-1 inline h-4 w-4 text-cyan-500" /> rồi chọn <strong>Cài đặt ứng dụng</strong> hoặc <strong>Install app</strong>.</li></ol>
                <p className="rounded-lg bg-muted/60 p-3 text-xs">Trên Android có thể cài từ Chrome/Samsung Internet. Nếu muốn APK tải trực tiếp hoặc phát hành qua Google Play, cần đóng gói Android riêng và ký bản phát hành.</p>
              </div>
            )}
            <button type="button" onClick={() => setShowGuide(false)} className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400">Đã hiểu</button>
          </section>
        </div>
      )}
    </>
  );
}
