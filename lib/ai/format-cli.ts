const cliStart = /^(?:enable(?:\s+secret\b|\s+password\b)?|configure\s+terminal|conf\s+t|hostname\s+\S+|no\s+ip\s+domain-lookup|interface\s+\S+|ip\s+(?:address|route|routing|helper-address|default-gateway|dhcp)\b|line\s+(?:vty|console|aux)\b|login(?:\s+local)?$|transport\s+input\b|switchport\b|vlan\s+\d+\b|router\s+(?:ospf|eigrp|bgp|rip)\b|network\s+\S+|encapsulation\s+dot1q\b|spanning-tree\b|channel-group\b|username\s+\S+|crypto\s+key\b|service\s+password-encryption|no\s+shutdown$|shutdown$|description\s+\S+|name\s+\S+|exit$|end$|write\s+memory$|copy\s+running-config\s+startup-config$)(?:\s|$)/i;

function commandLine(line: string): { command: string; note: string } | null {
  const plain = line.trim()
    .replace(/^(?:[-*]\s+|\d+[.)]\s+)/, '')
    .replace(/^[\w.-]+(?:\([^)]*\))?[#>]\s*/, '');
  const separator = plain.search(/\s+\/\/\s*/);
  const command = (separator >= 0 ? plain.slice(0, separator) : plain).trim();
  if (!cliStart.test(command) || /[^\x20-\x7E]/.test(command)) return null;
  if (/^hostname\s/i.test(command) && !/^hostname\s+\S+$/i.test(command)) return null;
  if (/^interface\s/i.test(command) && !/^interface\s+(?:range\s+)?[\w/.-]+(?:\s*-\s*[\w/.-]+)?$/i.test(command)) return null;
  return { command, note: separator >= 0 ? plain.slice(separator).replace(/^\s*\/\/\s*/, '').trim() : '' };
}

/** Make Cisco configuration commands copyable even when a model wrote bare lines with // notes. */
export function formatCiscoCliMarkdown(markdown: string): string {
  return markdown.split(/(```[\s\S]*?```)/g).map(part => {
    if (part.startsWith('```')) return part;
    const output: string[] = [];
    const commands: { command: string; note: string }[] = [];
    const flush = () => {
      if (!commands.length) return;
      if (output.length && output[output.length - 1] !== '') output.push('');
      output.push('```cisco', ...commands.map(item => item.command), '```');
      const notes = commands.filter(item => item.note);
      if (notes.length) output.push('', ...notes.map(item => `- \`${item.command}\` — ${item.note}`));
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
