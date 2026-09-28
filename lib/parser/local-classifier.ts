import { PasteItemParsed, ClassificationType } from '../types';

export function classifyLocalText(rawInput: string): PasteItemParsed[] {
  const blocks = rawInput
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  const results: PasteItemParsed[] = [];

  blocks.forEach((block, index) => {
    let classification: ClassificationType = 'Theory';
    let title = `Pasted Item #${index + 1}`;
    let tags: string[] = ['PastedContent'];

    const lines = block.split('\n');
    const firstLine = lines[0];

    // Cisco prompt or CLI commands
    if (/^[A-Za-z0-9_-]+(\(config[^)]*\))?[#$]/.test(firstLine) || /^(switchport|vlan|interface|router ospf|ip route|spanning-tree)/i.test(firstLine)) {
      if (lines.some(l => /^show\s+/i.test(l) || /VLAN Name|Interface\s+IP-Address|Protocol/i.test(l))) {
        classification = 'Command Output';
        title = 'Cisco CLI Command Verification Output';
        tags.push('CLI', 'Verification');
      } else if (lines.length > 2) {
        classification = 'Configuration';
        title = 'Cisco IOS Configuration Block';
        tags.push('CLI', 'Config');
      } else {
        classification = 'Command';
        title = `Command: ${firstLine.substring(0, 40)}`;
        tags.push('CLI', 'Command');
      }
    }
    // Troubleshooting patterns
    else if (/symptom|issue|error|bug|ping failed|cannot reach|mismatch|troubleshoot/i.test(block)) {
      classification = 'Troubleshooting';
      title = 'Troubleshooting Note';
      tags.push('Troubleshooting', 'Fix');
    }
    // Exercise / Homework patterns
    else if (/bài tập|exercise|question|câu hỏi|task|challenge/i.test(block)) {
      classification = 'Exercise';
      title = 'Practice Exercise Scenario';
      tags.push('Exercise', 'Practice');
    }
    // Warning / Note patterns
    else if (/lưu ý|important|warning|chú ý|note|remember/i.test(block)) {
      classification = 'Important Note';
      title = 'Important CCNA Key Note';
      tags.push('MemoryKey', 'Note');
    }
    // Definition patterns
    else if (/là gì|definition|khái niệm|dùng để|presents/i.test(block)) {
      classification = 'Definition';
      title = 'Concept Definition';
      tags.push('Concept', 'Theory');
    }
    // Default Theory
    else {
      classification = 'Theory';
      title = 'Networking Concept & Theory';
      tags.push('Theory');
    }

    // Tag detection for networking protocols
    if (/vlan/i.test(block)) tags.push('VLAN');
    if (/stp|spanning-tree/i.test(block)) tags.push('STP');
    if (/ospf/i.test(block)) tags.push('OSPF');
    if (/trunk|dot1q/i.test(block)) tags.push('Trunk');
    if (/dhcp/i.test(block)) tags.push('DHCP');
    if (/nat|pat/i.test(block)) tags.push('NAT');
    if (/acl|access-list/i.test(block)) tags.push('ACL');

    results.push({
      id: `local-paste-${Date.now()}-${index}`,
      classification,
      title,
      rawContent: block,
      formattedContent: block,
      suggestedTags: Array.from(new Set(tags)),
      action: 'create-new'
    });
  });

  return results;
}
