export type ParsedBlockType =
  | 'cisco-command'
  | 'theory'
  | 'note'
  | 'warning'
  | 'example';

export interface ParsedBlockItem {
  id: string;
  type: ParsedBlockType;
  title: string;
  content: string;
}

export function parsePastedText(rawText: string): ParsedBlockItem[] {
  const blocks = rawText
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  const results: ParsedBlockItem[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n');
    const firstLine = lines[0].trim();

    // Cisco CLI patterns
    const isCiscoCLI = lines.some(l =>
      /^[A-Za-z0-9_-]+(\(config[^)]*\))?[#$]/.test(l.trim()) ||
      /^(show\s+|interface\s+|switchport\s+|router\s+ospf|ip\s+route|vlan\s+|spanning-tree|channel-group|no\s+shutdown)/i.test(l.trim())
    );

    if (isCiscoCLI) {
      results.push({
        id: `parsed-${Date.now()}-${idx}`,
        type: 'cisco-command',
        title: 'Cisco IOS Command Block',
        content: block
      });
      return;
    }

    // Warning pattern
    if (/^(cảnh báo|lỗi|warning|error|chú ý)/i.test(firstLine)) {
      results.push({
        id: `parsed-${Date.now()}-${idx}`,
        type: 'warning',
        title: 'Cảnh Báo / Lỗi Hay Gặp',
        content: block.replace(/^(cảnh báo|lỗi|warning|error|chú ý)[:\s]*/i, '')
      });
      return;
    }

    // Note pattern
    if (/^(lưu ý|ghi chú|note|quan trọng|cần nhớ)/i.test(firstLine)) {
      results.push({
        id: `parsed-${Date.now()}-${idx}`,
        type: 'note',
        title: 'Ghi Chú Cần Nhớ',
        content: block.replace(/^(lưu ý|ghi chú|note|quan trọng|cần nhớ)[:\s]*/i, '')
      });
      return;
    }

    // Default Theory
    results.push({
      id: `parsed-${Date.now()}-${idx}`,
      type: 'theory',
      title: 'Lý Thuyết & Khái Niệm',
      content: block
    });
  });

  return results;
}
