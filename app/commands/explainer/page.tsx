'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenText, Check, Copy, Search, SlidersHorizontal, Sparkles, Terminal, X } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { buildExplainedCommandIndex, ExplainedCiscoCommand } from '@/lib/explained-command-index';
import { useToast } from '@/components/ui/toast';

export default function CommandExplainerPage() {
  const [entries, setEntries] = useState<ExplainedCiscoCommand[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả nhóm');
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(() => {
    setEntries(buildExplainedCommandIndex({
      commands: repository.getCommands(),
      lessons: repository.getLessons(),
      topologies: repository.getTopologies(),
      notes: repository.getNotes(),
    }));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('ccna:data-sync', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('ccna:data-sync', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const categories = useMemo(() => ['Tất cả nhóm', ...Array.from(new Set(entries.map(entry => entry.category))).sort((a, b) => a.localeCompare(b, 'vi'))], [entries]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    return entries.filter(entry => (category === 'Tất cả nhóm' || entry.category === category)
      && (!needle || `${entry.command} ${entry.explanation} ${entry.category} ${entry.sources.join(' ')} ${entry.tags.join(' ')}`.toLocaleLowerCase('vi').includes(needle)));
  }, [entries, query, category]);

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(command);
      toast('Đã copy lệnh', command, 'success');
      window.setTimeout(() => setCopied(current => current === command ? null : current), 1800);
    } catch {
      toast('Không thể copy', 'Trình duyệt chưa cấp quyền clipboard.', 'warning');
    }
  };

  return <div className="mx-auto w-full max-w-5xl space-y-4 pb-8">
    <header className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><BookOpenText className="h-5 w-5" /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold leading-tight text-foreground sm:text-xl">Tra Cứu & Giải Nghĩa Lệnh</h1>
          <p className="text-[11px] text-muted-foreground sm:text-xs">Tự nhận diện lệnh từ thư viện, bài học, ghi chú và mô hình mạng.</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-cyan-400/15 bg-cyan-400/[0.045] px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
        <span>Nhận diện Cisco IOS tự động trên thiết bị; nội dung riêng tư không cần gửi đi để tạo giải thích.</span>
      </div>
    </header>

    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm lệnh, giải thích, tag, bài viết..." className="h-10 w-full rounded-lg border border-input bg-muted/25 pl-9 pr-9 text-xs outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 sm:text-sm" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      </label>
      <label className="relative block">
        <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <select value={category} onChange={event => setCategory(event.target.value)} className="h-10 w-full appearance-none rounded-lg border border-input bg-muted/25 pl-9 pr-3 text-xs outline-none focus:border-cyan-400/50 sm:text-sm">
          {categories.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>

    <div className="flex items-center justify-between text-[10px] text-muted-foreground sm:text-xs">
      <span><strong className="font-mono text-cyan-300">{filtered.length}</strong> lệnh được nhận diện</span>
      {query && <span className="max-w-[55%] truncate">Tìm: {query}</span>}
    </div>

    <section aria-label="Danh sách lệnh và giải thích" className="overflow-hidden rounded-xl border border-border bg-card/35">
      <div className="hidden grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4 border-b border-border bg-muted/35 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid">
        <span>Lệnh Cisco IOS</span><span>Giải thích ngắn</span>
      </div>
      {filtered.map((entry, index) => <article key={entry.command.toLowerCase()} className={`grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2.5 px-2.5 py-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-4 sm:px-4 ${index > 0 ? 'border-t border-border/70' : ''}`}>
        <div className="min-w-0 self-start">
          <div className="flex min-w-0 items-start gap-1.5">
            <Terminal className="mt-0.5 h-3 w-3 shrink-0 text-cyan-300 sm:h-3.5 sm:w-3.5" />
            <code className="min-w-0 break-words font-mono text-[10px] font-semibold leading-relaxed text-emerald-300 sm:text-xs">{entry.command}</code>
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-1 pl-[18px]">
            <span className="rounded border border-cyan-400/15 bg-cyan-400/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-cyan-200">{entry.category}</span>
            {entry.sources.length > 1 && <span className="truncate text-[9px] text-muted-foreground">· {entry.sources.length} nguồn</span>}
            <button type="button" onClick={() => void copyCommand(entry.command)} aria-label={`Copy ${entry.command}`} title="Copy lệnh" className="ml-auto shrink-0 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
              {copied === entry.command ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <p className="min-w-0 break-words text-[10px] leading-relaxed text-foreground/90 sm:text-xs">{entry.explanation}</p>
      </article>)}
      {filtered.length === 0 && <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
        <BookOpenText className="h-8 w-8 text-muted-foreground/60" />
        <p className="text-sm font-semibold text-foreground">{entries.length ? 'Không tìm thấy lệnh phù hợp' : 'Chưa tìm thấy lệnh Cisco nào'}</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{entries.length ? 'Thử từ khóa khác hoặc chọn nhóm “Tất cả nhóm”.' : 'Thêm nội dung Cisco IOS vào Lệnh Cisco, bài học, ghi chú hoặc mô hình mạng; danh sách sẽ tự cập nhật khi lưu.'}</p>
      </div>}
    </section>
  </div>;
}
