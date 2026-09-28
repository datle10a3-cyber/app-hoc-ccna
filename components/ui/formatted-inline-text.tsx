'use client';

import React, { useEffect, useState } from 'react';

import { repository } from '@/lib/db/repository';
import { isRichDocument, richDocumentHtml, sanitizeRichHtml } from '@/lib/rich-document';

export interface TextChunk {
  type: 'text';
  content: string;
}

export interface ImageChunk {
  type: 'image';
  alt: string;
  url: string;
}

export type ParsedChunk = TextChunk | ImageChunk;

export function parseInlineMarkdownImages(text: string): ParsedChunk[] {
  if (!text) return [];
  
  // Regex to match markdown image syntax ![alt](url) OR raw dataUrl
  const regex = /(?:!\[([^\]]*)\]\((data:image\/[^\s)]+|https?:\/\/[^\s)]+|img_[^\s)]+)\))|(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/g;
  const chunks: ParsedChunk[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      chunks.push({
        type: 'text',
        content: text.substring(lastIndex, matchIndex)
      });
    }

    const alt = match[1] || 'Sơ đồ';
    const rawUrl = match[2] || match[3];

    if (rawUrl) {
      let resolvedUrl = rawUrl.trim();
      if (resolvedUrl.startsWith('img_')) {
        const stored = repository.getImage(resolvedUrl);
        if (stored) resolvedUrl = stored;
      }

      chunks.push({
        type: 'image',
        alt,
        url: resolvedUrl
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    chunks.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return chunks;
}

export function FormattedInlineText({
  text,
  onZoomImage,
  className = "text-xs sm:text-sm text-foreground/95 leading-relaxed font-medium"
}: {
  text: string;
  onZoomImage?: (url: string) => void;
  className?: string;
}) {
  const [safeRichHtml, setSafeRichHtml] = useState('');
  useEffect(() => {
    if (!isRichDocument(text)) {
      setSafeRichHtml('');
      return;
    }
    const container = document.createElement('div');
    container.innerHTML = sanitizeRichHtml(richDocumentHtml(text));
    container.querySelectorAll('img[src^="img_"]').forEach(image => {
      const stored = repository.getImage(image.getAttribute('src') || '');
      if (stored && /^(data:image\/(?:png|jpeg|gif|webp);base64,|https?:\/\/)/i.test(stored)) image.setAttribute('src', stored);
    });
    container.querySelectorAll('img').forEach(image => {
      image.setAttribute('tabindex', '0');
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', `Xem ảnh ${image.getAttribute('alt') || 'phóng to'}`);
    });
    setSafeRichHtml(container.innerHTML);
  }, [text]);

  if (isRichDocument(text)) {
    return <div className={`doc-rich-content ${className}`} dangerouslySetInnerHTML={{ __html: safeRichHtml }}
      onClick={event => {
        const image = event.target as HTMLElement;
        if (image.tagName === 'IMG') onZoomImage?.(image.getAttribute('src') || '');
      }}
      onKeyDown={event => {
        const image = event.target as HTMLElement;
        if (image.tagName === 'IMG' && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onZoomImage?.(image.getAttribute('src') || '');
        }
      }} />;
  }

  const chunks = parseInlineMarkdownImages(text);

  if (chunks.length === 1 && chunks[0].type === 'text') {
    return <div className={`${className} whitespace-pre-wrap`}>{chunks[0].content}</div>;
  }

  return (
    <div className="space-y-2">
      {chunks.map((chunk, idx) => {
        if (chunk.type === 'image') {
          return (
            <figure key={idx} className="doc-display-image my-2 mx-auto w-fit max-w-full">
              <button type="button" disabled={!onZoomImage} onClick={() => onZoomImage?.(chunk.url)}
                className={`block max-w-full text-left ${onZoomImage ? 'cursor-zoom-in rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500' : ''}`}
                aria-label={`Xem lớn ảnh ${chunk.alt}`}>
                <img 
                  src={chunk.url} 
                  alt={chunk.alt} 
                  className="rounded-lg" 
                />
              </button>
              {chunk.alt && chunk.alt !== 'Sơ đồ' && chunk.alt !== 'Ảnh minh họa' && (
                <figcaption className="mt-1 text-xs text-muted-foreground">{chunk.alt}</figcaption>
              )}
            </figure>
          );
        }

        const content = chunk.content
          .replace(idx > 0 && chunks[idx - 1].type === 'image' ? /^\n/ : /$^/, '')
          .replace(idx < chunks.length - 1 && chunks[idx + 1].type === 'image' ? /\n$/ : /$^/, '');
        if (!content) return null;
        return (
          <div key={idx} className={`${className} whitespace-pre-wrap break-words`}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
