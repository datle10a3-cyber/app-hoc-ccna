'use client';

import React from 'react';
import { FormattedInlineText } from '@/components/ui/formatted-inline-text';
import { isRichDocument } from '@/lib/rich-document';

/** Render legacy plain-text notes and network writeups with the same article hierarchy as lesson content. */
export function FormattedArticleText({ text, onZoomImage }: { text: string; onZoomImage: (url: string) => void }) {
  if (isRichDocument(text)) {
    return <FormattedInlineText text={text} onZoomImage={onZoomImage} className="text-sm text-foreground/95 leading-relaxed" />;
  }

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];

  for (let index = 0; index < lines.length;) {
    const value = lines[index].trim();
    if (!value) {
      blocks.push(<div key={`gap-${index}`} className="h-2" />);
      index += 1;
      continue;
    }

    if (/^\|.*\|$/.test(value)) {
      const tableLines: string[] = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      const rows = tableLines
        .map(row => row.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()))
        .filter(row => !row.every(cell => /^:?-{3,}:?$/.test(cell)));
      const [head, ...body] = rows;
      blocks.push(
        <div key={`table-${index}`} className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs sm:text-sm">
            {head && <thead className="bg-muted/40"><tr>{head.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-r border-border px-3 py-2 font-bold last:border-r-0">{cell}</th>)}</tr></thead>}
            <tbody>{body.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-border">{row.map((cell, cellIndex) => <td key={cellIndex} className="border-r border-border px-3 py-2 align-top last:border-r-0">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^#{1,3}\s+/.test(value) || /^(?:[IVXLCDM]+\.|\d+[.)]|[A-Z]\.)\s+\S/.test(value)) {
      const heading = value.replace(/^#{1,3}\s+/, '');
      blocks.push(<h2 key={`heading-${index}`} className="pt-4 first:pt-0 pb-1 border-b border-amber-500/25 text-base sm:text-lg font-black text-amber-500 dark:text-amber-400">{heading}</h2>);
      index += 1;
      continue;
    }

    if (/^[-•*]\s+/.test(value)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-•*]\s+/.test(lines[index])) {
        items.push(lines[index].trim().replace(/^[-•*]\s+/, ''));
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`} className="list-disc space-y-1 pl-6 marker:text-amber-500">{items.map((item, itemIndex) => <li key={itemIndex}><FormattedInlineText text={item} onZoomImage={onZoomImage} className="text-sm text-foreground/95 leading-relaxed" /></li>)}</ul>);
      continue;
    }

    if (value.length < 90 && /:$/.test(value)) {
      blocks.push(<h3 key={`subheading-${index}`} className="pt-2 text-sm font-bold text-foreground">{value}</h3>);
      index += 1;
      continue;
    }

    blocks.push(<FormattedInlineText key={`line-${index}`} text={value} onZoomImage={onZoomImage} className="text-sm text-foreground/95 leading-relaxed" />);
    index += 1;
  }

  return <div className="space-y-1.5">{blocks}</div>;
}
