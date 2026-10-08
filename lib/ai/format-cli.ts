import { normalizeCiscoCommand } from '@/lib/explained-command-index';

// Dialer/PPP subcommands complement the shared IOS recognizer used by the library.
const additionalCommands = /^(?:no ip domain-lookup|dialer\s+(?:pool\s+\d+|persistent|idle-timeout\s+\d+)|dialer-group\s+\d+|encapsulation\s+ppp|ip\s+address\s+negotiated|ppp\s+(?:authentication\s+(?:chap|pap)(?:\s+(?:callin|chap|pap))*|chap\s+(?:hostname|password)\s+\S+|pap\s+sent-username\s+\S+\s+password\s+\S+)|mtu\s+\d+|ip\s+mtu\s+\d+)$/i;

function commandLine(line: string): { command: string; note: string } | null {
  const plain = line.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '');
  const clean = (value: string) => value.trim().replace(/^(?:`+|\*\*)|(?:`+|\*\*)$/g, '').replace(/^[\w.-]+(?:\([^)]*\))?[#>]\s*/, '').trim();
  const recognized = (value: string) => !/[^\x20-\x7E]/.test(value) && Boolean(normalizeCiscoCommand(value) || additionalCommands.test(value));
  // A range dash (Fa0/1 - 5) is part of a command, not an explanation separator.
  for (const match of Array.from(plain.matchAll(/(?:\s+(?:\/\/|—|–|-)\s+|:\s+)/g)).reverse()) {
    const command = clean(plain.slice(0, match.index));
    const note = plain.slice((match.index || 0) + match[0].length).trim();
    if (recognized(command) && !/^\d+(?:\s|$)/.test(note)) return { command, note };
  }
  const command = clean(plain);
  return recognized(command) ? { command, note: '' } : null;
}

/** Preserve existing fences and turn bare IOS lines into copyable terminal blocks. */
export function formatCiscoCliMarkdown(markdown: string): string {
  return markdown.split(/(```[\s\S]*?```)/g).map(part => {
    if (part.startsWith('```')) return part;
    const output: string[] = [];
    const commands: { command: string; note: string }[] = [];
    const flush = () => {
      if (!commands.length) return;
      if (output.length && output[output.length - 1] !== '') output.push('');
      const annotated = commands.some(item => item.note);
      output.push(annotated ? '```cisco-explained' : '```cisco', ...commands.map(item => item.command + (item.note ? '\t' + item.note : '')), '```', '');
      commands.length = 0;
    };
    for (const line of part.split('\n')) {
      const parsed = commandLine(line);
      if (parsed) commands.push(parsed);
      else { flush(); output.push(line); }
    }
    flush();
    return output.join('\n');
  }).join('');
}
