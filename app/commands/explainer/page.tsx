'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, Check, ChevronDown, Copy, Pencil, Search, SlidersHorizontal, Terminal, X } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { applySavedCommandExplanations, buildExplainedCommandIndex, ExplainedCiscoCommand, isQualityCommandExplanation } from '@/lib/explained-command-index';
import { CiscoCommandExplanation } from '@/lib/types';
import { useToast } from '@/components/ui/toast';

const batchSize = 12;

export default function CommandExplainerPage() {
  const [entries, setEntries] = useState<ExplainedCiscoCommand[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả nhóm');
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editingPattern, setEditingPattern] = useState<string | null>(null);
  const [draftExplanation, setDraftExplanation] = useState('');
  const attempted = useRef(new Set<string>());
  const { toast } = useToast();

  const refresh = useCallback(() => {
    const index = buildExplainedCommandIndex({
      commands: repository.getCommands(),
      lessons: repository.getLessons(),
      topologies: repository.getTopologies(),
      notes: repository.getNotes(),
    });
    setEntries(applySavedCommandExplanations(index, repository.getCommandExplanations()));
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

  useEffect(() => {
    const missing = entries.filter(entry => !entry.userEdited && !isQualityCommandExplanation(entry.explanation) && !attempted.current.has(entry.commandPattern));
    if (!missing.length) return;
    const groups: ExplainedCiscoCommand[][] = [];
    for (let index = 0; index < missing.length; index += batchSize) groups.push(missing.slice(index, index + batchSize));
    const requested = missing.map(entry => entry.commandPattern);
    requested.forEach(pattern => attempted.current.add(pattern));
    setPending(current => Array.from(new Set([...current, ...requested])));

    void (async () => {
      const bad: string[] = [];
      for (const group of groups) {
        try {
          const response = await fetch('/api/ai/command-explanation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commands: group.map(entry => ({
              command: entry.command,
              commandPattern: entry.commandPattern,
              category: entry.category,
              context: entry.contexts.slice(0, 3).join('\n---\n').slice(0, 2100)
            })) })
          });
          const result = await response.json();
          const outputs = Array.isArray(result.explanations) ? result.explanations as Array<{
            commandPattern: string; explanation: string; category: string; configMode: string; relatedCommands: string[]; confidence: number;
          }> : [];
          const returned = new Set<string>();
          for (const output of outputs) {
            const matching = group.find(entry => entry.commandPattern === output.commandPattern);
            if (!matching || !isQualityCommandExplanation(output.explanation)) continue;
            returned.add(output.commandPattern);
            const record: CiscoCommandExplanation = {
              commandPattern: output.commandPattern,
              explanation: output.explanation,
              category: output.category,
              configMode: output.configMode,
              relatedCommands: Array.isArray(output.relatedCommands) ? output.relatedCommands.slice(0, 4) : [],
              confidence: output.confidence,
              userEdited: false,
              updatedAt: new Date().toISOString()
            };
            repository.saveCommandExplanation(record);
          }
          for (const entry of group) if (!returned.has(entry.commandPattern)) bad.push(entry.commandPattern);
          if (!response.ok) for (const entry of group) bad.push(entry.commandPattern);
        } catch {
          for (const entry of group) bad.push(entry.commandPattern);
        }
      }
      setPending(current => current.filter(pattern => !requested.includes(pattern)));
      setFailed(current => Array.from(new Set([...current, ...bad])));
      refresh();
    })();
  }, [entries, refresh]);

  const categories = useMemo(() => ['Tất cả nhóm', ...Array.from(new Set(entries.map(entry => entry.category))).sort((a, b) => a.localeCompare(b, 'vi'))], [entries]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    return entries.filter(entry => (category === 'Tất cả nhóm' || entry.category === category)
      && (!needle || `${entry.command} ${entry.commandPattern} ${entry.explanation} ${entry.category} ${entry.configMode} ${entry.sources.join(' ')} ${entry.tags.join(' ')} ${entry.examples.join(' ')}`.toLocaleLowerCase('vi').includes(needle)));
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

  const saveExplanation = (entry: ExplainedCiscoCommand) => {
    const explanation = draftExplanation.trim();
    if (!explanation || explanation.length > 420) {
      toast('Giải thích chưa hợp lệ', 'Nhập phần giải thích ngắn, tối đa 420 ký tự.', 'warning');
      return;
    }
    const saved = repository.saveCommandExplanation({
      commandPattern: entry.commandPattern,
      explanation,
      category: entry.category,
      configMode: entry.configMode,
      relatedCommands: entry.relatedCommands,
      userEdited: true
    });
    if (!saved) {
      toast('Không lưu được', 'Giải thích do bạn chỉnh sửa đang được bảo vệ.', 'warning');
      return;
    }
    setEditingPattern(null);
    toast('Đã lưu giải thích', 'Bản giải thích tự chỉnh sửa sẽ không bị AI ghi đè.', 'success');
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
      {filtered.map(entry => {
        const isEditing = editingPattern === entry.commandPattern;
        const isExpanded = expanded.includes(entry.commandPattern);
        const device = entry.devices.some(value => /router/i.test(value)) ? 'Router'
          : entry.devices.some(value => /switch/i.test(value)) ? 'Switch'
          : /^(?:switchport|spanning-tree|channel-group|vlan|interface vlan)/i.test(entry.command) ? 'Switch' : '';
        const modeShort = entry.configMode.replace(' Configuration', ' Config');
        return <article key={entry.commandPattern} className="grid min-w-0 grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] items-start gap-2.5 py-3 first:pt-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-5 sm:py-4">
          <div className="min-w-0 overflow-hidden rounded-lg border border-slate-700/70 bg-[#080d16] shadow-sm shadow-black/10">
            <div className="flex h-7 items-center justify-between border-b border-slate-700/60 bg-slate-800/55 px-2">
              <Terminal className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              <button type="button" onClick={() => void copyCommand(entry.command)} aria-label={`Copy ${entry.command}`} title="Copy lệnh" className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-slate-700/70 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                {copied === entry.command ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <pre className="m-0 min-w-0 whitespace-pre-wrap break-words px-2.5 py-2 font-mono text-[11px] font-medium leading-relaxed text-emerald-300 [overflow-wrap:anywhere] sm:px-3 sm:text-[13px]"><code>{entry.command}</code></pre>
          </div>
          <div className="min-w-0">
            {isEditing ? <div className="space-y-2">
              <textarea autoFocus value={draftExplanation} onChange={event => setDraftExplanation(event.target.value)} maxLength={420} rows={4} aria-label={`Sửa giải thích ${entry.commandPattern}`} className="w-full resize-y rounded-md border border-cyan-400/30 bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground outline-none focus:border-cyan-400/60 sm:text-sm" />
              <div className="flex justify-end gap-1.5">
                <button type="button" onClick={() => setEditingPattern(null)} className="rounded px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted sm:text-xs">Hủy</button>
                <button type="button" onClick={() => saveExplanation(entry)} className="rounded bg-cyan-400/15 px-2 py-1 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-400/25 sm:text-xs">Lưu</button>
              </div>
            </div> : <>
              <p className="min-w-0 break-words pt-1 text-xs leading-relaxed text-foreground/90 [overflow-wrap:anywhere] sm:pt-1.5 sm:text-sm">
                {entry.explanation || (pending.includes(entry.commandPattern) ? 'Đang tạo giải thích…' : failed.includes(entry.commandPattern) ? 'Chưa tạo được giải thích.' : 'Chưa có giải thích.')}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1 text-[9px] leading-relaxed text-muted-foreground sm:text-[10px]">
                <span className="truncate">{[entry.category, device, modeShort].filter(Boolean).join(' · ')}</span>
                {entry.userEdited && <span className="shrink-0 text-emerald-400" title="Giải thích do bạn chỉnh sửa">· Tự sửa</span>}
                <button type="button" onClick={() => { setDraftExplanation(entry.explanation); setEditingPattern(entry.commandPattern); }} aria-label={`Sửa giải thích ${entry.commandPattern}`} title="Sửa giải thích" className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-cyan-300">
                  <Pencil className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => setExpanded(current => current.includes(entry.commandPattern) ? current.filter(value => value !== entry.commandPattern) : [...current, entry.commandPattern])} aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Ẩn' : 'Xem'} chi tiết ${entry.commandPattern}`} title="Chi tiết" className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-cyan-300">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {isExpanded && <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
                <p><span className="text-foreground/70">Mẫu:</span> <code className="break-words font-mono text-cyan-200">{entry.commandPattern}</code></p>
                {entry.relatedCommands.length > 0 && <p><span className="text-foreground/70">Liên quan:</span> {entry.relatedCommands.join(' · ')}</p>}
                {entry.examples.length > 1 && <p><span className="text-foreground/70">Ví dụ:</span> {entry.examples.slice(0, 6).join(' · ')}{entry.examples.length > 6 ? ` · +${entry.examples.length - 6}` : ''}</p>}
                {entry.sources.length > 0 && <p><span className="text-foreground/70">Nguồn:</span> {entry.sources.slice(0, 5).join(' · ')}{entry.sources.length > 5 ? ` · +${entry.sources.length - 5}` : ''}</p>}
              </div>}
            </>}
          </div>
        </article>;
      })}
      {filtered.length === 0 && <div className="px-3 py-10 text-center text-xs text-muted-foreground">
        {entries.length ? 'Không tìm thấy lệnh phù hợp.' : 'Chưa có lệnh Cisco.'}
      </div>}
    </section>
  </main>;
}
