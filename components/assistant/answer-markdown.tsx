'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Terminal } from 'lucide-react';
import { formatCiscoCliMarkdown } from '@/lib/ai/format-cli';

type SourceLink = { id: string; title: string; href: string };

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

function linkCitations(markdown: string, sources: SourceLink[]): string {
  // Keep code (including inline code) unchanged while turning source markers into links.
  return markdown.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map(part => {
    if (part.startsWith('`')) return part;
    return part.replace(/(?<!!)\[(\d{1,2})\](?!\()/g, (match, rawIndex: string) => {
      const source = sources[Number(rawIndex) - 1];
      return source ? `[\\[${rawIndex}\\]](${source.href})` : match;
    });
  }).join('');
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const raw = textOf(children).replace(/\n$/, '');
  const codeElement = React.Children.toArray(children).find(node => React.isValidElement(node));
  const className = React.isValidElement<{ className?: string }>(codeElement) ? codeElement.props.className || '' : '';
  const language = className.match(/language-([\w-]+)/)?.[1] || '';
  const explained = language === 'cisco-explained';
  const rows = explained ? raw.split('\n').map(line => { const tab = line.indexOf('\t'); return { command: tab < 0 ? line : line.slice(0, tab), note: tab < 0 ? '' : line.slice(tab + 1) }; }) : [];
  const copyText = explained ? rows.map(row => row.command).join('\n') : raw;
  const isCisco = /^(?:cisco|cisco-explained|cli|ios)$/i.test(language) || (!language && /^(?:enable|configure terminal|conf t|interface|switchport|vlan\s+\d+|show\s+|hostname|ip route|no shutdown)/im.test(raw));
  const label = isCisco ? 'Cisco CLI' : language ? language.toUpperCase() : 'Mã lệnh';
  return <div className="group my-4 min-w-0 overflow-hidden rounded-xl border border-cyan-400/25 bg-[#080d16] shadow-sm">
    <div className="flex min-h-11 items-center justify-between border-b border-cyan-400/15 bg-slate-800/70 px-3">
      <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-cyan-300"><Terminal className="h-4 w-4" /> {label}</span>
    <button type="button" onClick={async () => {
      try {
        await navigator.clipboard.writeText(copyText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch { /* Clipboard permission may be unavailable. */ }
    }} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-cyan-400/20 bg-slate-950/70 px-3 font-semibold text-cyan-200 hover:bg-cyan-400/10" aria-label="Sao chép khối lệnh">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="text-xs">{copied ? 'Đã chép' : 'Sao chép'}</span>
    </button>
    </div>
    {explained ? <div className="divide-y divide-slate-700/50">{rows.map((row, index) => <div key={index} className="grid min-w-0 gap-1 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-4 sm:px-4">
      <code className="min-w-0 whitespace-pre-wrap font-mono text-[12px] leading-5 text-emerald-300 [overflow-wrap:anywhere] sm:text-[13px]">{row.command}</code>
      {row.note && <span className="text-[13px] leading-5 text-slate-300 [overflow-wrap:anywhere]">{row.note}</span>}
    </div>)}</div> : <pre className="whitespace-pre-wrap break-words px-3 py-3.5 font-mono text-[13px] leading-6 text-emerald-300 [overflow-wrap:anywhere] sm:px-4 sm:text-sm [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">{children}</pre>}
  </div>;
}

export function AnswerMarkdown({ text, sources = [] }: { text: string; sources?: SourceLink[] }) {
  return <div className="min-w-0 break-words text-[14px] leading-7 text-foreground/90 sm:text-[15px] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      h1: ({ children }) => <h2 className="mb-2 mt-5 text-base font-bold text-foreground sm:text-lg">{children}</h2>,
      h2: ({ children }) => <h2 className="mb-2 mt-5 text-base font-bold text-foreground sm:text-lg">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-1.5 mt-4 text-[15px] font-bold text-foreground">{children}</h3>,
      p: ({ children }) => <p className="my-2.5">{children}</p>,
      strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
      ul: ({ children }) => <ul className="my-2.5 list-disc space-y-1 pl-5 marker:text-amber-500">{children}</ul>,
      ol: ({ children }) => <ol className="my-2.5 list-decimal space-y-1 pl-5 marker:text-amber-500">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-amber-500/60 bg-amber-500/5 py-1 pl-4 text-foreground/80">{children}</blockquote>,
      hr: () => <hr className="my-4 border-border" />,
      a: ({ href, children }) => href?.startsWith('/')
        ? <Link href={href} className="font-semibold text-amber-500 underline decoration-amber-500/30 underline-offset-2 hover:decoration-amber-500">{children}</Link>
        : <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-500 underline decoration-amber-500/30 underline-offset-2 hover:decoration-amber-500">{children}</a>,
      code: ({ children, className }) => <code className={className ? `font-mono ${className}` : 'rounded bg-amber-500/10 px-1 py-0.5 font-mono text-[0.9em] text-amber-500'}>{children}</code>,
      pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
      table: ({ children }) => <div className="my-4 w-full min-w-0 overflow-hidden rounded-xl border border-border"><table className="w-full table-fixed border-collapse text-left text-[13px] leading-5 sm:text-sm">{children}</table></div>,
      th: ({ children }) => <th className="border-b border-r border-border bg-muted/60 px-2.5 py-2.5 align-top font-bold text-foreground last:border-r-0 [overflow-wrap:anywhere]">{children}</th>,
      td: ({ children }) => <td className="border-b border-r border-border/70 px-2.5 py-2.5 align-top last:border-r-0 [overflow-wrap:anywhere]">{children}</td>,
      tr: ({ children }) => <tr className="last:[&>td]:border-b-0 even:bg-muted/20">{children}</tr>,
      img: ({ src, alt }) => src && (/^https?:\/\//i.test(src) || src.startsWith('/'))
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={alt || 'Ảnh minh họa'} loading="lazy" className="my-3 block h-auto max-h-[360px] max-w-full rounded-lg border border-border object-contain" />
        : <span>{alt || 'Ảnh'}</span>
    }}>{linkCitations(formatCiscoCliMarkdown(text), sources)}</ReactMarkdown>
  </div>;
}
