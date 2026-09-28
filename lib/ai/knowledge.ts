import { repository } from '@/lib/db/repository';
import { richDocumentPlainText } from '@/lib/rich-document';

export type KnowledgeKind = 'lesson' | 'command' | 'note' | 'topology';

export interface KnowledgeSource {
  id: string;
  group: string;
  kind: KnowledgeKind;
  title: string;
  href: string;
  content: string;
}

function clean(value: string | undefined): string {
  return richDocumentPlainText(value || '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, alt: string) => alt ? `[Ảnh: ${alt}]` : '[Ảnh]')
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi, '[Ảnh]')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunks(value: string, maxLength = 3500): string[] {
  if (!value) return [];
  const result: string[] = [];
  let rest = value;
  while (rest.length > maxLength) {
    const boundary = Math.max(rest.lastIndexOf('\n', maxLength), rest.lastIndexOf(' ', maxLength));
    const cut = boundary > maxLength / 2 ? boundary : maxLength;
    result.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) result.push(rest);
  return result;
}

function addChunks(target: KnowledgeSource[], source: Omit<KnowledgeSource, 'content'>, text: string) {
  chunks(text).forEach((content, index) => target.push({
    ...source,
    id: `${source.id}:${index + 1}`,
    title: index ? `${source.title} (phần ${index + 1})` : source.title,
    content
  }));
}

/** Build a fresh text index from every locally available record when the user asks. */
export function buildKnowledgeIndex(): KnowledgeSource[] {
  const sources: KnowledgeSource[] = [];

  for (const lesson of repository.getLessons()) {
    const group = `lesson:${lesson.id}`;
    const href = `/learn/${encodeURIComponent(lesson.id)}`;
    const summary = [lesson.topic, ...(lesson.tags || []), lesson.summary].filter(Boolean).join(' · ');
    if (!lesson.blocks?.length) {
      addChunks(sources, { id: group, group, kind: 'lesson', title: lesson.title, href }, summary);
    }
    (lesson.blocks || []).forEach((block, index) => {
      addChunks(sources, {
        id: `${group}:${block.id || index}`,
        group,
        kind: 'lesson',
        title: `${lesson.title}${block.title ? ` — ${block.title}` : ''}`,
        href
      }, [summary, clean(block.content)].filter(Boolean).join('\n\n'));
    });
  }

  for (const command of repository.getCommands()) {
    const group = `command:${command.id}`;
    const steps = (command.steps || []).map((step, index) => [
      `Bước ${index + 1}: ${step.explanation || ''}`,
      step.command ? `Lệnh Cisco:\n${step.command}` : ''
    ].filter(Boolean).join('\n')).join('\n\n');
    addChunks(sources, {
      id: group,
      group,
      kind: 'command',
      title: command.title,
      href: `/commands/${encodeURIComponent(command.id)}`
    }, [
      `Chủ đề: ${command.category || ''}. Thiết bị: ${command.device || ''}. Chế độ: ${command.mode || ''}.`,
      `Thẻ: ${(command.tags || []).join(', ')}`,
      clean(command.description),
      steps || clean(command.example || command.command),
      clean(command.notes)
    ].filter(Boolean).join('\n\n'));
  }

  for (const note of repository.getNotes()) {
    const group = `note:${note.id}`;
    addChunks(sources, {
      id: group,
      group,
      kind: 'note',
      title: note.title,
      href: `/notes?note=${encodeURIComponent(note.id)}`
    }, [`Loại ghi chú: ${note.type}. Thẻ: ${(note.tags || []).join(', ')}`, clean(note.content)].join('\n\n'));
  }

  for (const topology of repository.getTopologies()) {
    const group = `topology:${topology.id}`;
    addChunks(sources, {
      id: group,
      group,
      kind: 'topology',
      title: topology.title,
      href: `/topologies/${encodeURIComponent(topology.id)}`
    }, [
      clean(topology.description),
      `Thiết bị: ${(topology.devices || []).join(', ')}`,
      `Nodes: ${(topology.nodes || []).map(node => [node.label, node.type, node.ip, node.vlan && `VLAN ${node.vlan}`].filter(Boolean).join(' ')).join('; ')}`,
      `Kết nối: ${(topology.links || []).map(link => `${link.from} ↔ ${link.to} ${link.label || ''}`).join('; ')}`,
      `Địa chỉ IP: ${(topology.ipList || []).map(entry => `${entry.device} ${entry.interfaceName} ${entry.ip} ${entry.vlan || ''}`).join('; ')}`,
      clean(topology.notes)
    ].filter(Boolean).join('\n\n'));
  }

  return sources;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
}

const stopWords = new Set('toi ban cho ve la cua gi the nao cach huong dan lenh cau hinh hay cho biet can muon xem tim trong app du lieu nhung mot cac va voi tren nay do dung de lam kiem tra lap bang tao so sanh trinh bay'.split(' '));

/** Search every local record, then send a small, varied set of relevant passages. */
export function selectKnowledgeSources(all: KnowledgeSource[], question: string, limit = 8): KnowledgeSource[] {
  const query = normalize(question)
    .replace(/\bsw\s*l\s*2\b/g, 'switch l2')
    .replace(/\bsw\s*l\s*3\b/g, 'switch l3');
  const terms = Array.from(new Set((query.match(/[a-z0-9]+/g) || []).filter(term => term.length > 1 && !stopWords.has(term))));
  if (!terms.length) return [];

  const documents = all.map(source => {
    const title = normalize(source.title);
    const body = normalize(source.content);
    return { source, title, body, titleWords: new Set(title.match(/[a-z0-9]+/g) || []), bodyWords: new Set(body.match(/[a-z0-9]+/g) || []) };
  });
  const documentFrequency = new Map(terms.map(term => [term, documents.filter(doc => doc.titleWords.has(term) || doc.bodyWords.has(term)).length]));

  const ranked = documents.map(doc => {
    let score = 0;
    let hits = 0;
    for (const term of terms) {
      const inTitle = doc.titleWords.has(term);
      const inBody = doc.bodyWords.has(term);
      const weight = 1 + Math.log(1 + documents.length / (1 + (documentFrequency.get(term) || 0)));
      if (inTitle || inBody) hits += 1;
      if (inTitle) score += 7 * weight;
      if (inBody) score += 2 * weight;
    }
    if (hits === terms.length) score += 8;
    if (terms.length > 1) {
      const phrase = terms.join(' ');
      if (doc.body.includes(phrase)) score += 10;
      if (doc.title.includes(phrase)) score += 15;
    }
    if (doc.source.kind === 'command' && /\b(lenh|show|configure|switchport|vlan)\b/.test(query)) score += 4;
    return { source: doc.source, score, hits };
  }).filter(item => item.hits > 0).sort((a, b) => b.score - a.score);

  const counts = new Map<string, number>();
  const selected: KnowledgeSource[] = [];
  for (const item of ranked) {
    const count = counts.get(item.source.group) || 0;
    if (count >= 3) continue;
    counts.set(item.source.group, count + 1);
    selected.push(item.source);
    if (selected.length >= limit) break;
  }
  return selected;
}
