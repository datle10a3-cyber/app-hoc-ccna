import { CiscoCommand } from '@/lib/types';

export function commandItemText(item: CiscoCommand): string {
  if (item.steps?.length) return item.steps.map(step => step.command).filter(Boolean).join('\n\n');
  const legacy = item.example?.trim() || item.command?.trim() || '';
  return legacy === item.title.trim() ? '' : legacy;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();
}

export function matchesCommandItem(item: CiscoCommand, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const content = normalize([
    item.title,
    item.category,
    item.mode,
    item.description,
    item.notes,
    item.command,
    item.example,
    item.imageUrl ? 'sơ đồ so do diagram' : '',
    ...(item.tags || []),
    ...(item.steps || []).flatMap(step => [step.command, step.explanation || ''])
  ].filter(Boolean).join(' '));
  return words.every(word => content.includes(word));
}

export function matchingCommandLines(item: CiscoCommand, query: string): string[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = commandItemText(item).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const exact = lines.filter(line => words.every(word => normalize(line).includes(word)));
  const partial = lines.filter(line => !exact.includes(line) && words.some(word => normalize(line).includes(word)));
  return Array.from(new Set([...exact, ...partial])).slice(0, 5);
}
