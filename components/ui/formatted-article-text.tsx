'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, Network, Terminal } from 'lucide-react';
import { FormattedInlineText } from '@/components/ui/formatted-inline-text';
import { ArticlePart, parseArticleDocument, parseArticleText } from '@/lib/article-format';
import { isRichDocument } from '@/lib/rich-document';

function CopyableBlock({ content, diagram }: { content: string; diagram: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* Clipboard may be unavailable outside a secure context. */ }
  };
  return (
    <div className="article-code group">
      <div className="article-code-bar">
        <span className="inline-flex items-center gap-2">{diagram ? <Network size={14} /> : <Terminal size={14} />}{diagram ? 'Sơ đồ mạng' : 'Cisco IOS CLI'}</span>
        <button type="button" onClick={copy} aria-label={diagram ? 'Copy sơ đồ' : 'Copy lệnh Cisco'} title="Copy" className="article-code-copy">
          {copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Đã copy' : 'Copy'}
        </button>
      </div>
      <pre><code>{content}</code></pre>
    </div>
  );
}

/** Shared reader for pasted lessons, notes and network topologies. */
export function FormattedArticleText({ text, onZoomImage }: { text: string; onZoomImage: (url: string) => void }) {
  const [richParts, setRichParts] = useState<ArticlePart[]>([]);
  useEffect(() => {
    setRichParts(isRichDocument(text) ? parseArticleDocument(text) : []);
  }, [text]);
  const parts = isRichDocument(text) ? richParts : parseArticleText(text || '');
  return <div className="article-flow">
    {parts.map((part, index) => {
      const key = `${index}-${part.kind}`;
      if (part.kind === 'code' || part.kind === 'diagram') return <CopyableBlock key={key} content={part.content} diagram={part.kind === 'diagram'} />;
      if (part.kind === 'heading') return <h2 key={key} className="article-heading"><span>{part.content}</span></h2>;
      if (part.kind === 'step') {
        const numbered = /^(\d{1,2})[.)]\s+(.+)$/.exec(part.content);
        return <h3 key={key} className={`article-step${numbered ? ' article-step-numbered' : ''}`}>
          {numbered ? <><span className="article-step-number">{numbered[1].padStart(2, '0')}</span><span>{numbered[2]}</span></> : part.content}
        </h3>;
      }
      if (part.kind === 'list') return <ul key={key} className="article-list">{part.content.split('\n').map((item, itemIndex) => item.startsWith('→ ')
        ? <li key={itemIndex} className="article-arrow-item"><span aria-hidden="true">→</span>{item.slice(2)}</li>
        : <li key={itemIndex}>{item}</li>)}</ul>;
      if (part.kind === 'table') {
        const rows = part.content.split('\n').map(row => row.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())).filter(row => !row.every(cell => /^:?-{3,}:?$/.test(cell)));
        const [head, ...body] = rows;
        return <div key={key} className="article-table-wrap"><table><thead><tr>{head?.map((cell, cellIndex) => <th key={cellIndex}>{cell}</th>)}</tr></thead><tbody>{body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
      }
      if (part.kind === 'rich') return <FormattedInlineText key={key} text={part.content} onZoomImage={onZoomImage} className="text-sm text-foreground/95 leading-relaxed" />;
      return <div key={key} className="article-paragraph"><FormattedInlineText text={part.content} onZoomImage={onZoomImage} className="text-sm text-foreground/95 leading-relaxed" /></div>;
    })}
  </div>;
}
