import { isRichDocument, richDocumentHtml, sanitizeRichHtml } from './rich-document';

export type ArticlePart = {
  kind: 'heading' | 'step' | 'paragraph' | 'code' | 'diagram' | 'list' | 'table' | 'rich';
  content: string;
  level?: number;
};

const commandRoot = /^(?:enable|disable|configure|conf|end|exit|logout|reload|write|erase|copy|show|debug|undebug|clear|ping|traceroute|hostname|interface|vlan|name|description|switchport|spanning-tree|channel-group|channel-protocol|port-channel|router|network|neighbor|passive-interface|ip|ipv6|no|shutdown|standby|encapsulation|access-list|access-class|line|login|password|username|service|crypto|transport|banner|default-information|redistribute|ntp|logging|snmp-server|aaa|track|delay|frequency|duplex|speed|negotiation|mac-address|authentication|timers|key|string|clock|boot|cdp|lldp|errdisable|power|voice|storm-control|spanning|archive|file|license|monitor|terminal|ip-sla|ip sla|default-router|dns-server|domain-name|lease|pool|address|permit|deny|remark|sequence|seq|area|passive-interface|maximum-paths|maximum-prefix|default-metric|metric|offset-list|summary-address|aggregate-address|distribute-list|route-map|match|set|continue|call|exit-address-family|update-source|next-hop-self|local-preference|weight|remote-as|activate|send-community|soft-reconfiguration|version|authentication|ppp|pppoe|dialer|encapsulation|mtu|bandwidth|delay|load-interval|keepalive|auto|channel-group|lacp|pagp|storm-control|spanning-tree|dot1x|dot1q|switchport|vtp|snmp-server|errdisable|power|voice|!)(?:\s|$)/i;

function isCommand(value: string): boolean {
  const line = value.trim().replace(/^[\w.-]+(?:\([^)]*\))?[#>]\s*/, '');
  if (/^(?:System configuration has been modified\.|Proceed with reload\?|Would you like to enter the initial configuration dialog\?|\[confirm\]|Building configuration\.\.\.)/i.test(line)) return true;
  if (!line) return false;
  if (/^(?:show|ping|traceroute|copy)\s+\S/i.test(line)) return true;
  if (/^configure\s+(?:terminal|memory|replace)\b/i.test(line) || /^conf\s+t$/i.test(line)) return true;
  if (/^no\s+(?:ip|ipv6|shutdown|switchport|spanning-tree|standby|service|logging|cdp|lldp|router|network|passive-interface|access-list|login|aaa|crypto|username|boot|vtp|ip domain|ip routing)\b/i.test(line)) return true;
  if (/^ip\s+(?:address|route|routing|default-gateway|dhcp|nat|access-group|helper-address|ospf|domain-name|ssh|http|sla|name-server|dns|verify|arp|forward-protocol|default-network|classless|cef|flow|access-list|tcp|inspect|policy|virtual-reassembly|pim|multicast-routing|igmp|wccp|directed-broadcast|proxy-arp|unreachables|redirects|mtu|source-route)\b/i.test(line)) return true;
  if (/^ipv6\s+(?:address|route|unicast-routing|enable|nd| ospf|dhcp)\b/i.test(line)) return true;
  if (/^standby\s+\d+\s+(?:ip|priority|preempt|track|authentication|timers|name|use-bia|mac-address)\b/i.test(line)) return true;
  if (/^interface\s+[\w./:-]+(?:\s+[\w./:-]+)*$/i.test(line)) return true;
  if (/^(?:write|erase|reload|end|exit|logout|enable|disable|shutdown|login|aaa|no|!)(?:\s+.*)?$/i.test(line)) return true;
  if (/^(?:network|neighbor)\s+\S+\s+(?:area|remote-as|activate|update-source|next-hop-self|route-map|weight|password)\b/i.test(line)) return true;
  return commandRoot.test(line) && !/[.!?]$/.test(line);
}

function headingInfo(value: string): { kind: 'heading' | 'step'; level: number; content: string } | null {
  const line = value.trim();
  if (!line || line.length > 130) return null;
  const markdown = /^(#{1,4})\s+(.+)$/.exec(line);
  if (markdown) return { kind: /^(?:Bước|Step)\s+\d+/i.test(markdown[2]) ? 'step' : 'heading', level: markdown[1].length, content: markdown[2] };
  if (/^(?:Bước|Step)\s+\d+[.):-]?\s+\S/i.test(line)) return { kind: 'step', level: 3, content: line };
  if (/^(?:PHẦN|PHAN|PART)\s+[A-Z0-9]+\b/i.test(line)) return { kind: 'heading', level: 2, content: line };
  if (/^(?:[IVXLCDM]+[.)]|\d{1,2}[.)])\s+\S/i.test(line)) return { kind: 'heading', level: 2, content: line };
  if (/^(?:MÔ HÌNH|THÔNG SỐ|CẤU HÌNH|KIỂM TRA|LỖI THƯỜNG GẶP|YÊU CẦU|BẢNG IP|GIẢI THÍCH)\b.{0,80}:?$/i.test(line)) return { kind: 'heading', level: 2, content: line };
  return null;
}

function isConnector(value: string): boolean {
  const line = value.trim();
  return /^(?:[|│┃\/\\+─━=><←→↔.\-\s]){1,100}$/.test(line) && (/[|│┃\/\\+─━><←→↔]/.test(line) || /(?:-{2,}|={2,})/.test(line));
}

function isDiagramLabel(value: string): boolean {
  const line = value.trim();
  if (line.length > 120) return false;
  if (/^sau này nối\b/i.test(line)) return true;
  const tokens = line.split(/\s+/).filter(Boolean);
  const device = /^(?:Internet|ISP\S*|WAN\S*|LAN\S*|Router\S*|Switch\S*|SW\d*|R\d+|PC\d*|Server\S*|FW\d*|Cloud\S*|VLAN\d+|Fa\d\S*|Gi\d\S*|G\d\S*|Eth\d\S*|Te\d\S*|Po\d\S*)$/i;
  return tokens.some(token => device.test(token)) && tokens.every(token => device.test(token) || /^(?:L2|L3|trunk|access|[|│┃\/\\+─━=><←→↔.\-]+)$/i.test(token));
}

function diagramIndexes(lines: string[]): Set<number> {
  const found = new Set<number>();
  for (let index = 0; index < lines.length; index++) {
    if (!isConnector(lines[index])) continue;
    let start = index;
    let end = index;
    for (let cursor = index - 1; cursor >= Math.max(0, index - 4); cursor--) {
      const value = lines[cursor].trim();
      if (headingInfo(value) || isCommand(value) || (value && !isDiagramLabel(value) && !isConnector(value))) break;
      start = cursor;
    }
    for (let cursor = index + 1; cursor < Math.min(lines.length, index + 7); cursor++) {
      const value = lines[cursor].trim();
      if (headingInfo(value) || isCommand(value) || (value && !isDiagramLabel(value) && !isConnector(value))) break;
      end = cursor;
    }
    const labels = lines.slice(start, end + 1).filter(isDiagramLabel).length;
    if (labels >= 2) for (let cursor = start; cursor <= end; cursor++) found.add(cursor);
  }
  return found;
}

export function parseArticleText(source: string): ArticlePart[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const diagrams = diagramIndexes(lines);
  const result: ArticlePart[] = [];
  let index = 0;
  while (index < lines.length) {
    const value = lines[index].trim();
    if (!value) { index++; continue; }

    const fence = /^```\s*([^`]*)$/.exec(value);
    if (fence) {
      const collected: string[] = [];
      index++;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) collected.push(lines[index++]);
      if (index < lines.length) index++;
      result.push({ kind: /(?:text|ascii|diagram|plain)/i.test(fence[1]) || diagramIndexes(collected).size > 0 ? 'diagram' : 'code', content: collected.join('\n').trimEnd() });
      continue;
    }

    if (/^\|.*\|$/.test(value)) {
      const collected: string[] = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) collected.push(lines[index++].trim());
      result.push({ kind: 'table', content: collected.join('\n') });
      continue;
    }

    const heading = headingInfo(value);
    if (heading && !diagrams.has(index)) {
      result.push(heading);
      index++;
      continue;
    }

    if (diagrams.has(index)) {
      const collected: string[] = [];
      while (index < lines.length && diagrams.has(index)) collected.push(lines[index++]);
      result.push({ kind: 'diagram', content: collected.join('\n').replace(/^\n+|\n+$/g, '').replace(/\n\s*\n/g, '\n') });
      continue;
    }

    if (isCommand(value)) {
      const collected = [lines[index++].trimEnd()];
      while (index < lines.length) {
        if (isCommand(lines[index])) { collected.push(lines[index++].trimEnd()); continue; }
        if (!lines[index].trim()) {
          let next = index + 1;
          while (next < lines.length && !lines[next].trim()) next++;
          if (next < lines.length && isCommand(lines[next])) { index = next; continue; }
        }
        break;
      }
      result.push({ kind: 'code', content: collected.join('\n') });
      continue;
    }

    if (/^\s*[-•*]\s+/.test(lines[index])) {
      const collected: string[] = [];
      while (index < lines.length && /^\s*[-•*]\s+/.test(lines[index])) collected.push(lines[index++].replace(/^\s*[-•*]\s+/, ''));
      result.push({ kind: 'list', content: collected.join('\n') });
      continue;
    }

    const collected: string[] = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (!current || headingInfo(current) || isCommand(current) || diagrams.has(index) || /^```/.test(current) || /^\|.*\|$/.test(current) || /^\s*[-•*]\s+/.test(lines[index])) break;
      collected.push(current);
      index++;
    }
    if (collected.length) result.push({ kind: 'paragraph', content: collected.join('\n') });
    else index++;
  }
  return result;
}

/** Convert pasted rich HTML into text regions while retaining diagrams, images and tables. */
export function parseArticleDocument(value: string): ArticlePart[] {
  if (!isRichDocument(value) || typeof DOMParser === 'undefined') return parseArticleText(value);
  const doc = new DOMParser().parseFromString(sanitizeRichHtml(richDocumentHtml(value)), 'text/html');
  const media: string[] = [];
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (!(node instanceof Element)) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'pre') {
      const content = node.textContent || '';
      const language = /(?:language-|lang-)([\w-]+)/.exec(node.querySelector('code')?.getAttribute('class') || '')?.[1] || 'cisco';
      return `\n\n\`\`\`${language}\n${content}\n\`\`\`\n\n`;
    }
    if (['table', 'figure', 'img'].includes(tag)) {
      const index = media.push(node.outerHTML) - 1;
      return `\n\n⟦CCNA_MEDIA_${index}⟧\n\n`;
    }
    const content = Array.from(node.childNodes).map(walk).join('');
    if (/^h[1-6]$/.test(tag)) return `\n\n# ${content.trim()}\n\n`;
    if (tag === 'li') return `\n• ${content.trim()}\n`;
    if (['p', 'div', 'ul', 'ol', 'blockquote'].includes(tag)) return `\n\n${content}\n\n`;
    return content;
  };
  const source = Array.from(doc.body.childNodes).map(walk).join('');
  const parts: ArticlePart[] = [];
  source.split(/(⟦CCNA_MEDIA_\d+⟧)/).forEach(piece => {
    const match = /^⟦CCNA_MEDIA_(\d+)⟧$/.exec(piece);
    if (match) parts.push({ kind: 'rich', content: '<!--ccna-rich-doc:v1-->' + media[Number(match[1])] });
    else parts.push(...parseArticleText(piece));
  });
  if (!parts.some(part => ['heading', 'step', 'code', 'diagram'].includes(part.kind))) return [{ kind: 'rich', content: value }];
  return parts;
}

/** Build editable semantic HTML from a pasted lab writeup. Text is assigned via textContent. */
export function articlePartsToHtml(parts: ArticlePart[]): string {
  if (typeof document === 'undefined') return '';
  const root = document.createElement('div');
  for (const part of parts) {
    if (part.kind === 'rich') {
      const holder = document.createElement('div');
      holder.innerHTML = sanitizeRichHtml(richDocumentHtml(part.content));
      while (holder.firstChild) root.appendChild(holder.firstChild);
      continue;
    }
    if (part.kind === 'list') {
      const list = document.createElement('ul');
      part.content.split('\n').forEach(value => {
        const item = document.createElement('li');
        item.textContent = value;
        list.appendChild(item);
      });
      root.appendChild(list);
      continue;
    }
    const element = document.createElement(part.kind === 'heading' ? 'h2' : part.kind === 'step' ? 'h3' : part.kind === 'code' || part.kind === 'diagram' ? 'pre' : 'p');
    element.textContent = part.content;
    root.appendChild(element);
  }
  return root.innerHTML;
}
