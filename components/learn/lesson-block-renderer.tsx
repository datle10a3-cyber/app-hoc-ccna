'use client';

import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, Lightbulb, Info, Terminal, CheckCircle2 } from 'lucide-react';
import { LessonBlock } from '@/lib/types';
import { parseCiscoConfig } from '@/lib/parser/cisco-explainer';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

export function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast('Đã Sao Chép Lệnh!', text, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  switch (block.type) {
    case 'heading':
      return <h3 className="text-base font-extrabold text-foreground tracking-tight pt-3 pb-1 border-b border-border">{block.title || block.content}</h3>;

    case 'paragraph':
      return <p className="text-xs text-foreground/90 leading-relaxed">{block.content}</p>;

    case 'note':
      return (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-1 my-2">
          <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Info className="w-4 h-4" /> {block.title || 'Ghi Chú Trọng Tâm'}
          </div>
          <p className="text-xs leading-relaxed">{block.content}</p>
        </div>
      );

    case 'warning':
      return (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200 space-y-1 my-2">
          <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4" /> {block.title || 'Cảnh Báo / Lỗi Thường Gặp'}
          </div>
          <p className="text-xs leading-relaxed">{block.content}</p>
        </div>
      );

    case 'example':
      return (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 space-y-1 my-2">
          <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Lightbulb className="w-4 h-4" /> {block.title || 'Ví Dụ Minh Họa'}
          </div>
          <p className="text-xs leading-relaxed">{block.content}</p>
        </div>
      );

    case 'cisco-command':
      const lines = parseCiscoConfig(block.content);
      return (
        <div className="my-3 rounded-xl border border-slate-800 bg-cli-bg shadow-md overflow-hidden">
          <div className="px-3.5 py-1.5 bg-cli-header border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cisco-blue" />
              <span className="text-[11px] font-mono font-bold text-slate-300">{block.title || 'Cisco CLI Command'}</span>
            </div>
            <button
              onClick={() => handleCopy(block.content)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Đã Copy' : 'Copy'}
            </button>
          </div>
          <div className="p-3.5 font-mono text-xs text-slate-100 space-y-1 leading-relaxed overflow-x-auto">
            {lines.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 hover:bg-slate-900/60 p-0.5 rounded transition-colors">
                <span className="text-slate-600 select-none w-4 text-right font-mono text-[10px]">{idx + 1}</span>
                <span className="flex-1 text-slate-100 font-semibold">{item.line}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'command-output':
      return (
        <div className="my-3 rounded-xl border border-slate-800 bg-cli-bg shadow-md overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {block.title || 'Kết Quả CLI Output'}
            </span>
            <button
              onClick={() => handleCopy(block.content)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Đã Copy' : 'Copy'}
            </button>
          </div>
          <pre className="p-3.5 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {block.content}
          </pre>
        </div>
      );

    default:
      return <p className="text-xs text-foreground leading-relaxed">{block.content}</p>;
  }
}
