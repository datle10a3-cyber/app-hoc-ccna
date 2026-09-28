'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { readImageFile } from '@/lib/utils';
import { repository } from '@/lib/db/repository';
import { ImageLightbox } from './image-lightbox';
import { isRichDocument, richDocumentHtml, RICH_DOCUMENT_PREFIX, sanitizeRichHtml } from '@/lib/rich-document';
import { articlePartsToHtml, parseArticleDocument, parseArticleText } from '@/lib/article-format';

export interface VisualDocItem {
  id: string;
  type: 'text' | 'image';
  content?: string;
  url?: string;
  caption?: string;
}

let nextId = 0;
const id = (prefix: string) => prefix + '-' + Date.now() + '-' + (++nextId);
const imagePattern = /!\[([^\]]*)\]\((data:image\/[^\s)]+|https?:\/\/[^\s)]+|img_[^\s)]+)\)|(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/g;

function normalizeItems(items: VisualDocItem[]): VisualDocItem[] {
  items.forEach((item, index) => {
    if (item.type !== 'text') return;
    if (items[index - 1]?.type === 'image') item.content = (item.content || '').replace(/^\n/, '');
    if (items[index + 1]?.type === 'image') item.content = (item.content || '').replace(/\n$/, '');
  });
  return items;
}

export function parseTextToDocItems(text: string): VisualDocItem[] {
  const items: VisualDocItem[] = [];
  let lastIndex = 0;
  const regex = new RegExp(imagePattern);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) items.push({ id: id('text'), type: 'text', content: text.slice(lastIndex, match.index) });
    items.push({ id: id('image'), type: 'image', url: match[2] || match[3], caption: match[1] || 'Ảnh minh họa' });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) items.push({ id: id('text'), type: 'text', content: text.slice(lastIndex) });
  return items.length ? normalizeItems(items) : [{ id: id('text'), type: 'text', content: '' }];
}

export function serializeDocItems(items: VisualDocItem[]): string {
  let result = '';
  items.forEach((item, index) => {
    if (item.type === 'text') {
      result += item.content || '';
    } else if (item.url) {
      if (result) result += '\n';
      result += '![' + (item.caption || 'Ảnh minh họa').replace(/[\[\]]/g, '') + '](' + item.url + ')';
      if (items[index + 1]?.type === 'text' && items[index + 1].content) result += '\n';
    }
  });
  return result;
}

export function docItemsToBlocks(items: VisualDocItem[]) {
  const blocks: Array<{ id: string; type: 'paragraph' | 'cisco-command' | 'warning' | 'note'; title: string; content: string }> = [];
  for (const item of items) {
    if (item.type === 'text' && isRichDocument(item.content || '')) {
      blocks.push({ id: id('block'), type: 'paragraph', title: '', content: item.content || '' });
      continue;
    }
    if (item.type === 'image' && item.url) {
      const marker = '![' + (item.caption || 'Ảnh minh họa') + '](' + item.url + ')';
      if (blocks.length) blocks[blocks.length - 1].content += '\n' + marker;
      else blocks.push({ id: id('block'), type: 'paragraph', title: '', content: marker });
      continue;
    }
    for (const part of (item.content || '').split(/\n\s*\n/)) {
      const content = part.trim();
      if (!content) continue;
      const firstLine = content.split('\n')[0].trim();
      const type = /^[\w.-]+(?:\([^)]*\))?[#>]\s*/.test(firstLine) || /^(?:show\s+|configure(?:\s+terminal)?\b|interface\s+\S+|router\s+\S+|vlan\s+\d+|switchport\s+|ip\s+(?:address|route)\s+|no\s+shutdown\b|enable\b|hostname\s+)/i.test(firstLine)
        ? 'cisco-command'
        : /^(cảnh báo|warning|lưu ý quan trọng)/i.test(content) ? 'warning'
        : /^(ghi chú|lưu ý|note)/i.test(content) ? 'note' : 'paragraph';
      blocks.push({ id: id('block'), type, title: '', content });
    }
  }
  return blocks;
}

function createImageFigure(url: string, caption: string): HTMLElement {
  const figure = document.createElement('figure');
  figure.className = 'doc-inline-image';
  figure.dataset.docImage = 'true';
  figure.contentEditable = 'false';
  const image = document.createElement('img');
  image.src = url.startsWith('img_') ? repository.getImage(url) || url : url;
  if (url.startsWith('img_')) image.dataset.originalUrl = url;
  image.alt = caption;
  figure.appendChild(image);
  return figure;
}

function renderDocument(root: HTMLDivElement, text: string) {
  root.replaceChildren();
  if (isRichDocument(text)) {
    root.innerHTML = sanitizeRichHtml(richDocumentHtml(text));
    root.querySelectorAll('figure').forEach(figure => {
      if (figure.querySelector('img')) {
        figure.classList.add('doc-inline-image');
        figure.dataset.docImage = 'true';
        figure.contentEditable = 'false';
      }
    });
    root.querySelectorAll('img[src^="img_"]').forEach(image => {
      const img = image as HTMLImageElement;
      img.dataset.originalUrl = img.getAttribute('src') || '';
      img.src = repository.getImage(img.dataset.originalUrl) || img.dataset.originalUrl;
    });
    return;
  }
  parseTextToDocItems(text).forEach(item => {
    if (item.type === 'image' && item.url) {
      root.appendChild(createImageFigure(item.url, item.caption || 'Ảnh minh họa'));
      return;
    }
    (item.content || '').split('\n').forEach((line, index) => {
      if (index) root.appendChild(document.createElement('br'));
      if (line) root.appendChild(document.createTextNode(line));
    });
  });
  if (root.lastElementChild?.matches('figure[data-doc-image]')) {
    const trailing = document.createElement('br');
    trailing.dataset.editorPlaceholder = 'true';
    root.appendChild(trailing);
  }
}

function readDocument(root: HTMLDivElement): VisualDocItem[] {
  const items: VisualDocItem[] = [];
  let text = '';
  const flush = () => {
    if (text) items.push({ id: id('text'), type: 'text', content: text });
    text = '';
  };
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent?.replace(/\u200b/g, '') || '';
      return;
    }
    if (!(node instanceof HTMLElement) || node.dataset.editorPlaceholder) return;
    if (node.dataset.docImage) {
      flush();
      const image = node.querySelector('img');
      if (image) items.push({ id: id('image'), type: 'image', url: image.dataset.originalUrl || image.getAttribute('src') || '', caption: image.alt || 'Ảnh minh họa' });
      return;
    }
    if (node.tagName === 'UL' || node.tagName === 'OL') {
      const listItems = Array.from(node.children).filter(child => child.tagName === 'LI');
      listItems.forEach((listItem, index) => {
        if (text && !text.endsWith('\n')) text += '\n';
        text += node.tagName === 'OL' ? `${index + 1}.\t` : '•\t';
        Array.from(listItem.childNodes).forEach(child => {
          if (child instanceof HTMLElement && /^(DIV|P)$/.test(child.tagName)) {
            Array.from(child.childNodes).forEach(visit);
          } else {
            visit(child);
          }
        });
        if (text && !text.endsWith('\n')) text += '\n';
      });
      return;
    }
    if (node.tagName === 'BR') {
      text += '\n';
      return;
    }
    const isBlock = node.tagName === 'DIV' || node.tagName === 'P';
    if (isBlock && text && !text.endsWith('\n')) text += '\n';
    Array.from(node.childNodes).forEach(visit);
    if (isBlock && node.nextSibling && text && !text.endsWith('\n')) text += '\n';
  };
  Array.from(root.childNodes).forEach(visit);
  flush();
  return normalizeItems(items);
}

function selectionRange(root: HTMLDivElement): Range {
  const selection = window.getSelection();
  if (selection?.rangeCount && root.contains(selection.anchorNode) && root.contains(selection.focusNode)) {
    return selection.getRangeAt(0).cloneRange();
  }
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  return range;
}

function placeCaret(range: Range) {
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function VisualDocEditor({ initialText, onChange, onDocItemsChange, compact = false }: {
  initialText: string;
  onChange?: (rawText: string) => void;
  onDocItemsChange?: (items: VisualDocItem[]) => void;
  compact?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(initialText);
  const richModeRef = useRef(isRichDocument(initialText));
  const savedRangeRef = useRef<Range | null>(null);
  const selectedFigureRef = useRef<HTMLElement | null>(null);
  const [hasSelectedImage, setHasSelectedImage] = useState(false);
  const [selectedImageWidth, setSelectedImageWidth] = useState<number | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    if (!root.dataset.initialized || initialText !== lastValueRef.current) {
      renderDocument(root, initialText);
      selectedFigureRef.current = null;
      setHasSelectedImage(false);
      setSelectedImageWidth(null);
      root.dataset.initialized = 'true';
      lastValueRef.current = initialText;
      richModeRef.current = isRichDocument(initialText);
      onDocItemsChange?.(richModeRef.current ? [{ id: id('text'), type: 'text', content: initialText }] : parseTextToDocItems(initialText));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText]);

  const emitChange = () => {
    const root = editorRef.current;
    if (!root) return;
    if (root.querySelector('table')) richModeRef.current = true;
    if (richModeRef.current) {
      const value = RICH_DOCUMENT_PREFIX + sanitizeRichHtml(root.innerHTML);
      lastValueRef.current = value;
      onChange?.(value);
      onDocItemsChange?.([{ id: id('text'), type: 'text', content: value }]);
      return;
    }
    const items = readDocument(root);
    const value = serializeDocItems(items);
    lastValueRef.current = value;
    onChange?.(value);
    onDocItemsChange?.(items);
  };

  const rememberCaret = () => {
    if (editorRef.current) savedRangeRef.current = selectionRange(editorRef.current);
  };

  const insertImage = (url: string, range?: Range | null) => {
    const root = editorRef.current;
    if (!root) return;
    const target = range && root.contains(range.startContainer) ? range : selectionRange(root);
    const figure = createImageFigure(url, 'Ảnh minh họa');
    target.deleteContents();
    target.insertNode(figure);
    if (!figure.nextSibling) {
      const trailing = document.createElement('br');
      trailing.dataset.editorPlaceholder = 'true';
      figure.after(trailing);
    }
    target.setStartAfter(figure);
    target.collapse(true);
    root.focus();
    placeCaret(target);
    savedRangeRef.current = target.cloneRange();
    emitChange();
  };

  const handleImageFile = (file: File, range: Range) => {
    setError('');
    setIsLoadingImage(true);
    readImageFile(file).then(url => insertImage(url, range)).catch(() => {
      setError('Không thể đọc ảnh. Hãy thử lại với tệp PNG, JPG hoặc WebP.');
    }).finally(() => setIsLoadingImage(false));
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const root = editorRef.current;
    if (!root) return;
    const clipboardHtml = event.clipboardData.getData('text/html');
    const safeHtml = clipboardHtml ? sanitizeRichHtml(clipboardHtml) : '';
    const clipboardText = event.clipboardData.getData('text/plain');
    const sourceParts = safeHtml ? parseArticleDocument(RICH_DOCUMENT_PREFIX + safeHtml) : parseArticleText(clipboardText);
    const hasStructure = sourceParts.some(part => ['heading', 'step', 'code', 'diagram'].includes(part.kind));
    const hasMarkdownImage = /!\[[^\]]*\]\(/.test(clipboardText);
    const formattedHtml = hasStructure && !hasMarkdownImage ? articlePartsToHtml(sourceParts) : '';
    const htmlToInsert = formattedHtml || (safeHtml && /<(?:table|p|div|h[1-6]|ul|ol|strong|b|em|i|u|img|br|pre)\b/i.test(safeHtml) ? safeHtml : '');
    if (htmlToInsert) {
      event.preventDefault();
      const range = selectionRange(root);
      const fragment = range.createContextualFragment(htmlToInsert);
      const last = fragment.lastChild;
      range.deleteContents();
      range.insertNode(fragment);
      if (last) {
        range.setStartAfter(last);
        range.collapse(true);
        placeCaret(range);
      }
      richModeRef.current = true;
      emitChange();
      return;
    }
    const imageItem = Array.from(event.clipboardData.items).find(item => item.type.startsWith('image/'));
    const file = imageItem?.getAsFile();
    if (file) {
      event.preventDefault();
      handleImageFile(file, selectionRange(root));
      return;
    }
    // Single plain lines and standalone clipboard images retain the original editor behavior.
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const root = editorRef.current;
    if (file && root) handleImageFile(file, savedRangeRef.current?.cloneRange() || selectionRange(root));
    event.target.value = '';
  };

  const selectFigure = (figure: HTMLElement | null) => {
    if (selectedFigureRef.current) delete selectedFigureRef.current.dataset.selected;
    selectedFigureRef.current = figure;
    if (figure) figure.dataset.selected = 'true';
    setHasSelectedImage(Boolean(figure));
    setSelectedImageWidth(figure?.style.width ? parseInt(figure.style.width, 10) : null);
  };

  const resizeSelectedImage = (width: number | null) => {
    const figure = selectedFigureRef.current;
    if (!figure) return;
    figure.style.width = width === null ? '' : `${width}%`;
    setSelectedImageWidth(width);
    richModeRef.current = true;
    emitChange();
  };

  const removeSelectedImage = () => {
    const figure = selectedFigureRef.current;
    if (!figure) return;
    figure.remove();
    selectFigure(null);
    editorRef.current?.focus();
    emitChange();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2 text-xs">
        <span className="font-semibold text-foreground">{compact ? 'Nội dung' : 'Nội dung bài học'} <span className="font-normal text-muted-foreground">· Dán ảnh Ctrl+V tại con trỏ</span></span>
        <div className="flex items-center gap-3">
          {isLoadingImage && <span className="text-muted-foreground">Đang thêm ảnh...</span>}
          {hasSelectedImage && <div className="flex items-center gap-2" onMouseDown={event => event.stopPropagation()}>
            <span className="whitespace-nowrap text-muted-foreground">Kích thước ảnh: {selectedImageWidth === null ? 'Tự động' : `${selectedImageWidth}%`}</span>
            <input aria-label="Chỉnh kích thước ảnh" type="range" min="20" max="100" step="5" value={selectedImageWidth ?? 100}
              onChange={event => resizeSelectedImage(Number(event.target.value))} className="w-20 accent-amber-500" />
            <button type="button" onClick={() => resizeSelectedImage(null)} className="whitespace-nowrap text-amber-600 hover:text-amber-500 dark:text-amber-400">Vừa khung</button>
          </div>}
          {hasSelectedImage && <button type="button" onClick={removeSelectedImage} className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Xóa ảnh</button>}
          <label className="inline-flex cursor-pointer items-center gap-1 font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400">
            <Upload className="h-3.5 w-3.5" /> Thêm ảnh
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-label="Nội dung bài học" aria-multiline="true"
        data-placeholder="Nhập hoặc dán văn bản, đặt con trỏ rồi Ctrl+V để dán ảnh..."
        onInput={emitChange}
        onPaste={handlePaste}
        onKeyUp={rememberCaret}
        onMouseUp={rememberCaret}
        onBlur={() => { rememberCaret(); emitChange(); }}
        onClick={event => {
          const target = event.target as HTMLElement;
          let figure = target.closest('figure[data-doc-image]') as HTMLElement | null;
          if (!figure && target.tagName === 'IMG') {
            figure = document.createElement('figure');
            figure.className = 'doc-inline-image';
            figure.dataset.docImage = 'true';
            figure.contentEditable = 'false';
            target.replaceWith(figure);
            figure.appendChild(target);
            richModeRef.current = true;
            emitChange();
          }
          selectFigure(figure);
          rememberCaret();
        }}
        onDoubleClick={event => {
          const image = (event.target as HTMLElement).closest('figure[data-doc-image]')?.querySelector('img');
          if (image) setZoomUrl(image.getAttribute('src'));
        }}
        onKeyDown={event => {
          if (hasSelectedImage && (event.key === 'Backspace' || event.key === 'Delete')) {
            event.preventDefault();
            removeSelectedImage();
          } else if (event.key !== 'Shift' && event.key !== 'Control') {
            selectFigure(null);
          }
        }}
        className={'doc-rich-editor w-full outline-none ' + (compact ? 'min-h-[130px] p-3' : 'min-h-[280px] p-4 sm:p-5')}
      />
      {error && <p role="alert" className="border-t border-border px-3 py-2 text-xs text-destructive">{error}</p>}
      <ImageLightbox src={zoomUrl} alt="Ảnh minh họa" onClose={() => setZoomUrl(null)} />
    </div>
  );
}
