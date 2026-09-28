'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Settings, Download, Upload, Trash2, Database, RefreshCw, CheckCircle2, Sparkles, LogIn, LogOut, UserRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { repository } from '@/lib/db/repository';
import { supabase } from '@/lib/db/supabase-client';

export default function SettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCloudEnabled = repository.isCloudSyncEnabled();
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; provider: string | null; model: string; geminiFallbackConfigured?: boolean } | null>(null);
  const [pastedBackup, setPastedBackup] = useState('');
  const [account, setAccount] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState<'login'|'register'>('login');

  useEffect(() => {
    fetch('/api/ai/chat').then(response => response.json()).then(setAiStatus).catch(() => setAiStatus(null));
    void supabase?.auth.getUser().then(({ data }) => setAccount(data.user?.email || null));
  }, []);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    const result = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/settings` } });
    setAuthBusy(false);
    if (result.error) { toast('Không thể đăng nhập', result.error.message, 'warning'); return; }
    if (authMode === 'register' && !result.data.session) {
      toast('Kiểm tra email', 'Mở email xác nhận tài khoản rồi đăng nhập để bật đồng bộ.', 'info');
      setAuthMode('login');
      return;
    }
    setAccount(result.data.user?.email || email.trim());
    toast('Đã kết nối tài khoản', 'Đang gộp dữ liệu trên thiết bị này và đồng bộ lên cloud…', 'success');
    setTimeout(() => window.location.reload(), 1200);
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    await repository.setActiveUser(null);
    setAccount(null);
    toast('Đã đăng xuất', 'Dữ liệu trên thiết bị vẫn được giữ riêng tại đây.', 'info');
    setTimeout(() => window.location.reload(), 500);
  };

  const handleExport = () => {
    const jsonStr = repository.exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ccna-notes-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('Đã xuất file', 'File sao lưu JSON đã được tải về.', 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const res = repository.importData(content);
      if (res.success) {
        toast('Thành công', res.message, 'success');
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast('Thất bại', res.message, 'warning');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteImport = () => {
    if (!pastedBackup.trim()) return;
    const res = repository.importData(pastedBackup);
    if (res.success) {
      toast('Đã nhập dữ liệu', res.message, 'success');
      setTimeout(() => window.location.reload(), 800);
    } else {
      toast('Không thể nhập', res.message, 'warning');
    }
  };

  const handleClearData = () => {
    if (confirm('Xóa toàn bộ dữ liệu?')) {
      localStorage.clear();
      toast('Đã xóa', 'Toàn bộ dữ liệu đã được làm sạch.', 'info');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-500" /> Cài Đặt
          </h1>
          <p className="text-xs text-muted-foreground">Quản lý dữ liệu và cấu hình hệ thống.</p>
        </div>
        {isCloudEnabled && account ? (
          <Badge variant="success" className="gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đã đăng nhập
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            {isCloudEnabled ? 'Chưa đăng nhập' : 'Local Storage'}
          </Badge>
        )}
      </div>

      {/* Backup & Restore */}
      {isCloudEnabled && <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tài khoản đồng bộ</h2>
          </div>
          {account ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div><p className="text-sm font-semibold">{account}</p><p className="text-xs text-muted-foreground">Dữ liệu riêng của tài khoản này được đồng bộ trên các thiết bị.</p></div>
            <Button size="sm" variant="outline" onClick={handleSignOut} className="gap-1.5 text-xs"><LogOut className="h-3.5 w-3.5"/> Đăng xuất</Button>
          </div> : <form onSubmit={handleAuth} className="space-y-2">
            <p className="text-xs text-muted-foreground">Đăng nhập cùng một tài khoản trên các thiết bị. Lần đầu, dữ liệu local hiện có sẽ được gộp lên cloud.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <input required minLength={8} type="password" autoComplete={authMode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu (ít nhất 8 ký tự)" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" type="submit" disabled={authBusy} className="gap-1.5 text-xs"><LogIn className="h-3.5 w-3.5"/>{authBusy?'Đang xử lý…':authMode==='login'?'Đăng nhập':'Tạo tài khoản'}</Button>
              <Button size="sm" type="button" variant="ghost" onClick={()=>setAuthMode(authMode==='login'?'register':'login')} className="text-xs">{authMode==='login'?'Tạo tài khoản mới':'Đã có tài khoản? Đăng nhập'}</Button>
            </div>
          </form>}
        </CardContent>
      </Card>}

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">Sao Lưu & Khôi Phục Dữ Liệu</h2>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={handleExport} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="w-3.5 h-3.5" /> Xuất File JSON (Export)
            </Button>

            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" /> Nhập File JSON (Import)
            </Button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              className="hidden" 
            />
          </div>
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-xs font-semibold">Dán JSON sao lưu từ thiết bị khác</summary>
            <p className="mt-2 text-[11px] text-muted-foreground">Chỉ các nhóm có trong JSON mới được nhập. Có thể dán riêng nhóm lệnh Cisco để không thay bài học, mô hình và ghi chú.</p>
            <textarea
              value={pastedBackup}
              onChange={event => setPastedBackup(event.target.value)}
              rows={5}
              placeholder="Dán nội dung file sao lưu JSON vào đây..."
              className="mt-2 w-full resize-y rounded-md border border-input bg-background p-2 font-mono text-[11px] outline-none focus:ring-1 focus:ring-ring"
              aria-label="Nội dung JSON sao lưu"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={handlePasteImport} disabled={!pastedBackup.trim()} className="text-xs">Nhập JSON đã dán</Button>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* AI assistant configuration */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"><Sparkles className="h-4 w-4 text-amber-500" /> Trợ lý AI</h2>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={aiStatus?.configured ? 'success' : 'outline'} className="text-[11px]">{aiStatus?.configured ? `Đã kết nối · ${aiStatus.provider} · ${aiStatus.model}` : 'Chưa cấu hình'}</Badge>
              {aiStatus?.configured && aiStatus.provider === 'Groq' && aiStatus.geminiFallbackConfigured &&
                <Badge variant="outline" className="text-[11px]">Gemini dự phòng</Badge>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">AI tìm trên bài học, lệnh Cisco, ghi chú và mô hình của bạn. Câu hỏi cùng các đoạn văn bản liên quan sẽ được gửi tới {aiStatus?.provider || 'nhà cung cấp AI đã cấu hình'} khi bạn bấm Gửi; ảnh đính kèm được gửi tới Gemini.</p>
          <p className="text-[11px] text-muted-foreground">Lượt gọi API chịu hạn mức và mức phí của tài khoản nhà cung cấp AI.</p>
          {!aiStatus?.configured && <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs">
            <p>Thêm khóa Groq hoặc OpenAI vào file <code className="font-mono">.env.local</code> ở thư mục ứng dụng:</p>
            <pre className="overflow-x-auto rounded bg-background px-2 py-1.5 font-mono">GROQ_API_KEY=your_api_key_here</pre>
            <p>Khởi động lại ứng dụng sau khi lưu file. Không đặt khóa trong biến <code className="font-mono">NEXT_PUBLIC_</code>.</p>
          </div>}
          <Link href="/assistant" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-600"><Sparkles className="h-3.5 w-3.5" /> Mở Trợ lý AI</Link>
        </CardContent>
      </Card>

      {/* Cloud Sync */}
      {isCloudEnabled && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">Đồng Bộ CSDL Cloud</h2>
                <p className="text-xs text-foreground mt-0.5">Supabase PostgreSQL đã kết nối.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => repository.syncFromCloud().then(r => toast('Đồng bộ', r.message, 'info'))} className="gap-1.5 text-xs">
                <RefreshCw className="w-3 h-3 text-emerald-400" /> Đồng Bộ Ngay
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset */}
      <Card className="border-destructive/20">
        <CardContent className="p-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-foreground">Xóa Dữ Liệu</h2>
            <p className="text-[11px] text-muted-foreground">Xóa toàn bộ cache dữ liệu trên thiết bị hiện tại.</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleClearData} className="gap-1.5 text-xs shrink-0">
            <Trash2 className="w-3.5 h-3.5" /> Xóa Dữ Liệu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
