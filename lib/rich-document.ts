export const RICH_DOCUMENT_PREFIX = '<!--ccna-rich-doc:v1-->';

const allowedTags = new Set([
  'p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'ul', 'ol', 'li', 'table', 'caption', 'colgroup', 'col', 'thead',
  'tbody', 'tfoot', 'tr', 'th', 'td', 'figure', 'figcaption', 'img', 'a'
]);
const discardTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'meta', 'link']);

export function isRichDocument(value: string): boolean {
  return value.startsWith(RICH_DOCUMENT_PREFIX);
}

export function richDocumentHtml(value: string): string {
  return value.slice(RICH_DOCUMENT_PREFIX.length);
}

function safeImageUrl(value: string): boolean {
  return /^(https?:\/\/|\/[^/]|img_[\w-]+$|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(value);
}

function sanitizeNode(node: Node, output: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return output.createTextNode(node.textContent || '');
  if (!(node instanceof Element)) return null;
  const tag = node.tagName.toLowerCase();
  if (discardTags.has(tag)) return null;

  const element = allowedTags.has(tag) ? output.createElement(tag) : output.createDocumentFragment();
  if (element instanceof Element) {
    if (tag === 'img') {
      const src = node.getAttribute('data-original-url') || node.getAttribute('src') || '';
      if (!safeImageUrl(src)) return null;
      element.setAttribute('src', src);
      element.setAttribute('alt', node.getAttribute('alt') || 'Ảnh minh họa');
    }
    if (tag === 'figure') {
      const width = (node as HTMLElement).style?.width || '';
      if (/^(?:[2-9]\d|100)%$/.test(width)) element.setAttribute('style', `width: ${width}`);
    }
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) {
        element.setAttribute('href', href);
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (tag === 'td' || tag === 'th') {
      for (const attr of ['colspan', 'rowspan']) {
        const count = Number(node.getAttribute(attr));
        if (Number.isInteger(count) && count > 1 && count <= 100) element.setAttribute(attr, String(count));
      }
    }
    if (['p', 'div', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const align = (node.getAttribute('align') || (node as HTMLElement).style?.textAlign || '').toLowerCase();
      if (['left', 'center', 'right', 'justify'].includes(align)) element.setAttribute('style', `text-align: ${align}`);
    }
    if (tag === 'span') {
      const style = (node as HTMLElement).style;
      const declarations: string[] = [];
      if (style?.fontWeight === 'bold' || Number(style?.fontWeight) >= 600) declarations.push('font-weight: bold');
      if (style?.fontStyle === 'italic') declarations.push('font-style: italic');
      if (style?.textDecorationLine?.includes('underline') || style?.textDecoration?.includes('underline')) declarations.push('text-decoration: underline');
      if (declarations.length) element.setAttribute('style', declarations.join('; '));
    }
    if (tag === 'ol') {
      const start = Number(node.getAttribute('start'));
      if (Number.isInteger(start) && start > 1 && start <= 10000) element.setAttribute('start', String(start));
    }
  }
  for (const child of Array.from(node.childNodes)) {
    const clean = sanitizeNode(child, output);
    if (clean) element.appendChild(clean);
  }
  return element;
}

/** Keep document structure while removing pasted scripts, event handlers and unsafe URLs. */
export function sanitizeRichHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const input = new DOMParser().parseFromString(html, 'text/html');
  const output = document.implementation.createHTMLDocument('');
  for (const child of Array.from(input.body.childNodes)) {
    const clean = sanitizeNode(child, output);
    if (clean) output.body.appendChild(clean);
  }
  return output.body.innerHTML;
}

export function richDocumentPlainText(value: string): string {
  if (!isRichDocument(value)) return value;
  const html = richDocumentHtml(value);
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,img').forEach(node => node.remove());
    doc.querySelectorAll('th,td').forEach(node => node.append('\t'));
    doc.querySelectorAll('br,tr,p,div,li,h1,h2,h3,h4,h5,h6').forEach(node => node.append('\n'));
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').trim();
}
