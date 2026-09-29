'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenText, Check, Copy, Search, SlidersHorizontal, Terminal, X } from 'lucide-react';
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

  return <main className="mx-auto w-full max-w-5xl space-y-4 pb-8">
    <header className="flex items-center gap-2.5 md:hidden">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><BookOpenText className="h-5 w-5" /></div>
      <h1 className="text-lg font-extrabold leading-tight text-foreground sm:text-xl">Giải Nghĩa Lệnh Cisco</h1>
    </header>

    <div className="grid grid-cols-[minmax(0,1fr)_minmax(112px,180px)] gap-2">
      <label className="relative block min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm lệnh..." className="h-10 w-full rounded-lg border border-input bg-muted/25 pl-9 pr-9 text-xs outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 sm:text-sm" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      </label>
      <label className="relative block min-w-0">
        <SlidersHorizontal className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <select value={category} onChange={event => setCategory(event.target.value)} aria-label="Lọc nhóm lệnh" className="h-10 w-full appearance-none rounded-lg border border-input bg-muted/25 pl-8 pr-1.5 text-[11px] outline-none focus:border-cyan-400/50 sm:pr-3 sm:text-sm">
          {categories.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>

    <div className="flex items-center justify-between text-[10px] text-muted-foreground sm:text-xs">
      <span><strong className="font-mono text-cyan-300">{filtered.length}</strong> lệnh</span>
      {query && <span className="max-w-[55%] truncate">{query}</span>}
    </div>

    <section aria-label="Lệnh Cisco và giải thích" className="divide-y divide-border/70">
      {filtered.map(entry => <article key={entry.command.toLowerCase()} className="grid min-w-0 grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] items-start gap-2.5 py-3 first:pt-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-5 sm:py-4">
        <div className="min-w-0 overflow-hidden rounded-lg border border-slate-700/70 bg-[#080d16] shadow-sm shadow-black/10">
          <div className="flex h-7 items-center justify-between border-b border-slate-700/60 bg-slate-800/55 px-2">
            <Terminal className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            <button type="button" onClick={() => void copyCommand(entry.command)} aria-label={`Copy ${entry.command}`} title="Copy lệnh" className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-slate-700/70 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
              {copied === entry.command ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <pre className="m-0 min-w-0 whitespace-pre-wrap break-words px-2.5 py-2 font-mono text-[11px] font-medium leading-relaxed text-emerald-300 [overflow-wrap:anywhere] sm:px-3 sm:text-[13px]"><code>{entry.command}</code></pre>
        </div>
        <p className="min-w-0 break-words pt-1 text-xs leading-relaxed text-foreground/90 [overflow-wrap:anywhere] sm:pt-1.5 sm:text-sm">{entry.explanation}</p>
      </article>)}
      {filtered.length === 0 && <div className="px-3 py-10 text-center text-xs text-muted-foreground">
        {entries.length ? 'Không tìm thấy lệnh phù hợp.' : 'Chưa có lệnh Cisco.'}
      </div>}
    </section>
  </main>;
}
