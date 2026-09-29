import { CiscoCommand, CiscoCommandExplanation, Lesson, PersonalNote, Topology } from './types';

export interface ExplainedCiscoCommand {
  command: string;
  commandPattern: string;
  explanation: string;
  category: string;
  configMode: string;
  relatedCommands: string[];
  examples: string[];
  contexts: string[];
  devices: string[];
  sources: string[];
  tags: string[];
  userEdited: boolean;
  confidence?: number;
}

type CommandSource = { title: string; type: string; content: string; tags?: string[]; devices?: string[]; trustedCli?: boolean };

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|tr|td|th)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function isCiscoCommand(raw: string, protectedBlock: boolean): string | null {
  let line = raw.trim().replace(/^(?:[-*•>]\s+|\d{1,3}[.)]\s+)/, '');
  const prompt = /^(?:[\w.-]+(?:\([^)]*\))?[#>])\s*(.*)$/.exec(line);
  const hasPrompt = Boolean(prompt);
  if (prompt) line = prompt[1].trim();
  line = line.replace(/^do\s+(?=show\s)/i, '');
  if (!line || line.length > 180 || /^[!#]/.test(line) || /[.!?]$/.test(line)) return null;
  if (/[<>]|https?:\/\//i.test(line)) return null;

  const full = (pattern: RegExp) => pattern.test(line);
  const recognized = [
    /^(?:enable|disable|end|exit|logout|reload|shutdown|no shutdown|write memory|write erase|erase startup-config|copy running-config startup-config|copy run start|delete flash:[\w.-]+)$/i,
    /^(?:configure terminal|conf t|configure memory)$/i,
    /^(?:hostname|enable secret|enable password|username)\s+[\w.-]+(?:\s+.+)?$/i,
    /^(?:interface|int)\s+(?:range\s+)?[\w./:-]+(?:\s*(?:-|,|\s)\s*[\w./:-]+)*$/i,
    /^vlan\s+\d{1,4}$/i,
    /^name\s+[\w.-]+(?:[ -][\w.-]+){0,4}$/i,
    /^description\s+[\w./:() -]{1,100}$/i,
    /^switchport\s+(?:mode\s+(?:access|trunk|dynamic\s+(?:auto|desirable))|access\s+vlan\s+\d{1,4}|trunk\s+(?:allowed\s+vlan\s+(?:(?:add|remove|except)\s+)?[\d,-]+|native\s+vlan\s+\d{1,4})|voice\s+vlan\s+\d{1,4}|port-security(?:\s+.+)?)$/i,
    /^switchport\s+trunk\s+encapsulation\s+dot1q$/i,
    /^spanning-tree\s+(?:mode\s+(?:rapid-pvst|pvst|mst)|vlan\s+[\d,-]+\s+(?:root\s+(?:primary|secondary)|priority\s+\d+)|portfast(?:\s+(?:default|edge|network|bpduguard\s+default))?|bpduguard\s+(?:enable|disable)|cost\s+\d+|port-priority\s+\d+)$/i,
    /^channel-(?:group\s+\d+\s+mode\s+(?:active|passive|on|auto|desirable)|protocol\s+(?:lacp|pagp))$/i,
    /^port-channel\s+load-balance\s+[\w -]+$/i,
    /^ip\s+(?:routing|default-gateway\s+[\d.]+|address\s+(?:dhcp|[\d.]+\s+[\d.]+)(?:\s+.+)?|route\s+[\d./]+\s+[\d.]+(?:\s+[\w./-]+)?(?:\s+\d+)?|nat\s+(?:inside|outside|pool|source)(?:\b.+)?|dhcp\s+(?:excluded-address\s+[\d.]+(?:\s+[\d.]+)?|pool\s+[\w.-]+|helper-address\s+[\d.]+|access-group\s+.+|domain-name\s+\S+|name-server\s+[\d.]+|ssh\s+version\s+\d+|ospf\s+.+|sla\s+.+)|name-server\s+[\d.]+|access-group\s+\S+\s+(?:in|out)|ospf\s+.+|helper-address\s+[\d.]+)$/i,
    /^(?:default-router|dns-server)\s+[\d.]+(?:\s+[\d.]+)*$/i,
    /^lease\s+\d+(?:\s+(?:hours|minutes|seconds))?$/i,
    /^ipv6\s+(?:unicast-routing|address\s+.+|route\s+.+)$/i,
    /^no\s+(?:ip\s+address|ip\s+routing|switchport|cdp\s+enable|spanning-tree\s+.+|standby\s+.+)$/i,
    /^router\s+(?:ospf\s+\d+|eigrp\s+\d+|rip|bgp\s+\d+)$/i,
    /^network\s+[\d.]+(?:\s+[\d.]+)?\s+area\s+[\w.]+$/i,
    /^network\s+[\d.]+\s+[\d.]+$/i,
    /^passive-interface\s+(?:default|[\w./]+)$/i,
    /^standby\s+\d+\s+(?:ip\s+[\d.]+|priority\s+\d+|preempt(?:\s+.*)?|track\s+\d+(?:\s+decrement\s+\d+)?|timers\s+.+|authentication\s+.+)$/i,
    /^access-list\s+\d+\s+(?:permit|deny)\s+.+$/i,
    /^ip\s+access-list\s+(?:standard|extended)\s+\S+$/i,
    /^(?:permit|deny)\s+(?:ip|tcp|udp|icmp|\d{1,3})\s+.+$/i,
    /^line\s+(?:console|vty|aux)\s+[\d -]+$/i,
    /^(?:login|login\s+local|transport\s+input\s+[\w -]+|exec-timeout\s+\d+\s+\d+|password\s+\S+|secret\s+\S+)$/i,
    /^(?:service password-encryption|ip domain-name\s+\S+|crypto key generate rsa(?:\s+.+)?|ip ssh version\s+\d+|banner motd\s+.+)$/i,
    /^show\s+(?:running-config|startup-config|version|ip\s+(?:interface\s+brief|route|protocols|ospf\s+neighbor|nat\s+translations|dhcp\s+(?:binding|pool))|interfaces?(?:\s+(?:status|trunk|description|switchport|port-channel|[\w./-]+))?|vlan\s+brief|spanning-tree(?:\s+vlan\s+\d+)?|etherchannel\s+summary|mac\s+address-table|arp|standby(?:\s+brief)?|track|access-lists?|cdp\s+neighbors?(?:\s+detail)?|lldp\s+neighbors?|flash|inventory|clock|users|logging|processes|controllers)\b.*$/i,
    /^(?:do\s+)?(?:ping|traceroute)\s+[\w.:/]+(?:\s+.+)?$/i,
    /^default-information\s+originate(?:\s+.+)?$/i,
    /^encapsulation\s+dot1q\s+\d+(?:\s+native)?$/i,
    /^pppoe(?:-client)?\s+.+$/i,
    /^ip sla\s+\d+$/i,
    /^track\s+\d+\s+interface\s+[\w./-]+\s+line-protocol$/i,
    /^end$/i
  ];
  if (!recognized.some(full)) return null;
  // Ambiguous short words are accepted only inside a CLI code block or with an IOS prompt.
  if (!hasPrompt && !protectedBlock && /^(?:name|description|network|permit|deny|password|login|passive-interface)\b/i.test(line)) return null;
  return line.replace(/\s+/g, ' ').trim();
}

export function normalizeCiscoCommand(raw: string): string | null {
  const command = isCiscoCommand(raw, true);
  if (!command) return null;
  return command.replace(/^int\s+/i, 'interface ')
    .replace(/^conf\s+t$/i, 'configure terminal')
    .replace(/^copy\s+run\s+start$/i, 'copy running-config startup-config');
}

export function normalizeCommandPattern(command: string, context = ''): string {
  const value = command.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^network\s+[\d.]+\s+[\d.]+$/.test(value)) {
    if (/router\s+eigrp/i.test(context)) return 'network <network> <wildcard-mask> [EIGRP process]';
    if (/ip dhcp pool/i.test(context)) return 'network <network> <subnet-mask> [DHCP pool]';
  }
  const acl = /^access-list\s+(\d+)\s+(permit|deny)\s+(.+)$/i.exec(value);
  if (acl) {
    const number = Number(acl[1]);
    const kind = (number >= 100 && number <= 199) || (number >= 2000 && number <= 2699) ? 'extended' : 'standard';
    return `access-list <${kind}-acl-number> ${acl[2]} <match-criteria>`;
  }
  const route = /^ip\s+route\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\S+))?(?:\s+\d+)?$/.exec(value);
  if (route) {
    const isDefault = route[1] === '0.0.0.0' && route[2] === '0.0.0.0';
    const firstHop = route[3];
    const hasNextHop = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(firstHop);
    const adminDistance = /\s\d+$/.test(value);
    const target = isDefault ? 'ip route 0.0.0.0 0.0.0.0' : 'ip route <network> <mask>';
    const suffix = adminDistance ? ' <admin-distance>' : '';
    if (hasNextHop) return `${target} <next-hop>${suffix}`;
    return `${target} <exit-interface>${route[4] ? ' <next-hop>' : ''}${suffix}`;
  }
  const patterns: Array<[RegExp, string]> = [
    [/^interface\s+range\s+.+$/, 'interface range <interface-range>'],
    [/^interface\s+vlan\s+\d+$/, 'interface vlan <vlan-id>'],
    [/^interface\s+port-channel\s+\d+$/, 'interface port-channel <group-id>'],
    [/^interface\s+loopback\s+\d+$/, 'interface loopback <id>'],
    [/^interface\s+.+\.\d+$/, 'interface <subinterface-id>'],
    [/^(?:interface|int)\s+.+$/, 'interface <interface-id>'],
    [/^switchport\s+access\s+vlan\s+\d+$/, 'switchport access vlan <vlan-id>'],
    [/^switchport\s+trunk\s+native\s+vlan\s+\d+$/, 'switchport trunk native vlan <vlan-id>'],
    [/^switchport\s+trunk\s+allowed\s+vlan\s+(add|remove|except)\s+.+$/, 'switchport trunk allowed vlan $1 <vlan-list>'],
    [/^switchport\s+trunk\s+allowed\s+vlan\s+.+$/, 'switchport trunk allowed vlan <vlan-list>'],
    [/^switchport\s+voice\s+vlan\s+\d+$/, 'switchport voice vlan <vlan-id>'],
    [/^switchport\s+port-security\s+maximum\s+\d+$/, 'switchport port-security maximum <count>'],
    [/^switchport\s+port-security\s+violation\s+\w+$/, 'switchport port-security violation <action>'],
    [/^vlan\s+\d+$/, 'vlan <vlan-id>'],
    [/^name\s+.+$/, 'name <vlan-name>'],
    [/^encapsulation\s+dot1q\s+\d+\s+native$/, 'encapsulation dot1q <vlan-id> native'],
    [/^encapsulation\s+dot1q\s+\d+$/, 'encapsulation dot1q <vlan-id>'],
    [/^channel-group\s+\d+\s+mode\s+(active|passive|on|auto|desirable)$/, 'channel-group <group-id> mode $1'],
    [/^spanning-tree\s+vlan\s+[\d,-]+\s+root\s+(primary|secondary)$/, 'spanning-tree vlan <vlan-list> root $1'],
    [/^spanning-tree\s+vlan\s+[\d,-]+\s+priority\s+\d+$/, 'spanning-tree vlan <vlan-list> priority <value>'],
    [/^spanning-tree\s+cost\s+\d+$/, 'spanning-tree cost <value>'],
    [/^spanning-tree\s+port-priority\s+\d+$/, 'spanning-tree port-priority <value>'],
    [/^standby\s+\d+\s+ip\s+[\d.]+$/, 'standby <group-id> ip <virtual-ip>'],
    [/^standby\s+\d+\s+priority\s+\d+$/, 'standby <group-id> priority <value>'],
    [/^standby\s+\d+\s+preempt\s+delay\s+minimum\s+\d+$/, 'standby <group-id> preempt delay minimum <seconds>'],
    [/^standby\s+\d+\s+preempt$/, 'standby <group-id> preempt'],
    [/^standby\s+\d+\s+track\s+\d+\s+decrement\s+\d+$/, 'standby <group-id> track <track-id> decrement <value>'],
    [/^standby\s+\d+\s+track\s+\d+$/, 'standby <group-id> track <track-id>'],
    [/^standby\s+\d+\s+timers\s+.+$/, 'standby <group-id> timers <hello> <hold>'],
    [/^track\s+\d+\s+interface\s+.+\s+line-protocol$/, 'track <track-id> interface <interface-id> line-protocol'],
    [/^ip\s+route\s+0\.0\.0\.0\s+0\.0\.0\.0\s+.+$/, 'ip route 0.0.0.0 0.0.0.0 <next-hop>'],
    [/^ip\s+route\s+.+$/, 'ip route <network> <mask> <next-hop>'],
    [/^ip\s+address\s+dhcp$/, 'ip address dhcp'],
    [/^ip\s+address\s+[\d.]+\s+[\d.]+$/, 'ip address <ipv4> <subnet-mask>'],
    [/^hostname\s+.+$/, 'hostname <name>'],
    [/^router\s+ospf\s+\d+$/, 'router ospf <process-id>'],
    [/^router\s+eigrp\s+\d+$/, 'router eigrp <autonomous-system>'],
    [/^network\s+[\d.]+\s+[\d.]+\s+area\s+[\w.]+$/, 'network <network> <wildcard-mask> area <area-id>'],
    [/^ip\s+dhcp\s+pool\s+.+$/, 'ip dhcp pool <name>'],
    [/^ip\s+dhcp\s+excluded-address\s+.+$/, 'ip dhcp excluded-address <start-ip> [<end-ip>]'],
    [/^default-router\s+[\d.]+$/, 'default-router <gateway-ip>'],
    [/^dns-server\s+[\d.]+$/, 'dns-server <dns-ip>'],
    [/^enable\s+secret\s+.+$/, 'enable secret <password>'],
    [/^username\s+\S+\s+secret\s+.+$/, 'username <name> secret <password>'],
    [/^description\s+.+$/, 'description <text>'],
    [/^ip\s+nat\s+inside\s+source\s+list\s+\S+\s+interface\s+\S+\s+overload$/, 'ip nat inside source list <acl> interface <outside-interface> overload'],
    [/^ip\s+nat\s+inside\s+source\s+list\s+\S+\s+pool\s+\S+\s+overload$/, 'ip nat inside source list <acl> pool <pool> overload'],
    [/^ip\s+nat\s+inside\s+source\s+static\s+.+$/, 'ip nat inside source static <local-address> <global-address>'],
    [/^ip\s+nat\s+inside\s+source\s+.+$/, value],
    [/^ip\s+nat\s+pool\s+\S+\s+.+$/, 'ip nat pool <name> <address-range>'],
    [/^ip\s+nat\s+(inside|outside)$/, 'ip nat $1'],
    [/^ip\s+dhcp\s+excluded-address\s+.+$/, 'ip dhcp excluded-address <start-ip> [<end-ip>]'],
    [/^ip\s+dhcp\s+pool\s+.+$/, 'ip dhcp pool <name>'],
    [/^ip\s+dhcp\s+helper-address\s+[\d.]+$/, 'ip helper-address <dhcp-server-ip>'],
    [/^ip\s+helper-address\s+[\d.]+$/, 'ip helper-address <dhcp-server-ip>'],
    [/^ip\s+access-list\s+(standard|extended)\s+\S+$/, 'ip access-list $1 <name>'],
    [/^access-list\s+\d+\s+(permit|deny)\s+.+$/, 'access-list <acl-number> $1 <match-criteria>'],
    [/^access-list\s+\d+\s+.+$/, 'access-list <acl-number> <action> <match-criteria>'],
    [/^ip\s+access-group\s+\S+\s+(in|out)$/, 'ip access-group <acl> $1'],
    [/^show\s+interfaces\s+port-channel\s+\d+$/, 'show interfaces port-channel <group-id>'],
    [/^show\s+interfaces\s+(?:fa|fastethernet|gi|gigabitethernet|te|tengigabitethernet|eth|ethernet)\S+$/, 'show interfaces <interface-id>'],
    [/^show\s+ip\s+route$/, 'show ip route'],
    [/^show\s+ip\s+ospf\s+neighbor$/, 'show ip ospf neighbor'],
    [/^show\s+ip\s+nat\s+translations$/, 'show ip nat translations'],
    [/^show\s+standby\s+brief$/, 'show standby brief'],
    [/^show\s+standby$/, 'show standby'],
    [/^show\s+spanning-tree\s+vlan\s+\d+$/, 'show spanning-tree vlan <vlan-id>'],
    [/^show\s+spanning-tree$/, 'show spanning-tree'],
    [/^show\s+etherchannel\s+summary$/, 'show etherchannel summary'],
    [/^show\s+ip\s+dhcp\s+binding$/, 'show ip dhcp binding'],
    [/^show\s+vlan\s+brief$/, 'show vlan brief'],
    [/^show\s+.+$/, value]
  ];
  for (const [pattern, replacement] of patterns) if (pattern.test(value)) return value.replace(pattern, replacement);
  return value;
}

function contextFor(source: string, command: string, trustedCli = false): string {
  const lines = decodeHtml(source).replace(/<[^>]*>/g, ' ').replace(/\r/g, '').split('\n');
  const normalizedTarget = command.toLowerCase();
  const positions = lines.map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => normalizeCiscoCommand(line)?.toLowerCase() === normalizedTarget);
  if (!positions.length) return '';
  const index = positions[0].index;
  return lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 3))
    .map(line => line.trim()).filter(Boolean).join('\n').slice(0, 700);
}

function configMode(command: string, context: string): string {
  const value = command.toLowerCase();
  const modeContext = context.toLowerCase();
  if (/^enable$/.test(value)) return 'User EXEC';
  if (/^(?:configure terminal|conf t)$/.test(value)) return 'Privileged EXEC';
  if (/^show\s|^(?:ping|traceroute)\s/.test(value)) return 'Privileged EXEC';
  if (/^interface\s/.test(value) || /^vlan\s/.test(value) || /^router\s/.test(value) || /^line\s/.test(value)) return 'Global Configuration';
  if (/^name\s/.test(value)) return 'VLAN Configuration';
  if (/^network\s/.test(value) || /^passive-interface\s/.test(value)) {
    if (/router\s+(?:ospf|eigrp)/i.test(modeContext)) return 'Router Configuration';
    if (/ip dhcp pool/i.test(modeContext)) return 'DHCP Pool Configuration';
  }
  if (/^(?:default-router|dns-server|lease)\s/.test(value)) return 'DHCP Pool Configuration';
  if (/^(?:login|password|transport input|exec-timeout|secret)\b/.test(value)) return 'Line Configuration';
  if (/^ip\s+dhcp\s+pool\s|^ip\s+(?:route|nat\s+inside\s+source|access-list|dhcp|routing|default-gateway)|^no\s+ip\s+routing|^access-list\s|^hostname\s|^enable\s|^username\s|^service\s|^ip domain-name|^crypto\s|^ip sla\s|^track\s/.test(value)) return 'Global Configuration';
  if (/^spanning-tree\s+mode\s|^spanning-tree\s+vlan\s+.+\s+(?:root\s+(?:primary|secondary)|priority\s+\d+)/.test(value)) return 'Global Configuration';
  if (/^ip\s+nat\s+(?:inside|outside)$/.test(value)) return 'Interface Configuration';
  if (/^ip\s+access-group\s/.test(value)) return 'Interface Configuration';
  if (/^switchport\s|^spanning-tree\s|^channel-group\s|^encapsulation\s|^standby\s|^ip\s+address\s|^no\s+ip\s+address|^no\s+shutdown|^shutdown$|^description\s|^ip\s+helper-address/.test(value)) return 'Interface Configuration';
  if (/^network\s.+\sarea\s|^passive-interface\s/.test(value)) return 'Router Configuration';
  if (/^(?:write|copy|reload|erase|delete)\b/.test(value)) return 'Privileged EXEC';
  return 'Không xác định';
}

export function isQualityCommandExplanation(text: string): boolean {
  const value = text.trim();
  if (value.length < 12 || value.length > 420 || /\n|```/i.test(value)) return false;
  if (/^(?:lệnh này\s+)?dùng để\s+(?:cấu hình|thiết lập|kiểm tra|hiển thị|bật|tạo)\b/i.test(value)) return false;
  if (/\b(?:cấu hình hoặc kiểm tra|theo dõi trạng thái|hiển thị thông tin)\b/i.test(value)) return false;
  if (/^(?:lệnh\s+)?[\w.-]+\s+(?:dùng để|cấu hình|kiểm tra)\b/i.test(value)) return false;
  const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.length <= 3;
}

function commandsInText(text: string, trustedCli = false): string[] {
  const found: string[] = [];
  let source = text || '';
  // Read code blocks first, then remove them so they are not counted twice.
  const protectedBlocks: string[] = [];
  source = source.replace(/<!--[\s\S]*?-->/g, ' ');
  source = source.replace(/<pre\b[^>]*>[\s\S]*?<\/pre\s*>/gi, block => {
    protectedBlocks.push(decodeHtml(block));
    return '\n';
  });
  source = source.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, block: string) => {
    protectedBlocks.push(block);
    return '\n';
  });
  source = source.replace(/<code\b[^>]*>([\s\S]*?)<\/code\s*>/gi, (_, block: string) => {
    protectedBlocks.push(decodeHtml(block));
    return '\n';
  });
  for (const block of protectedBlocks) {
    for (const line of block.split(/\r?\n/)) {
      const command = normalizeCiscoCommand(line);
      if (command) found.push(command);
    }
  }
  const plain = decodeHtml(source).replace(/\r/g, '\n');
  for (const line of plain.split('\n')) {
    const command = isCiscoCommand(line, trustedCli);
    if (command) found.push(normalizeCiscoCommand(command) || command);
  }
  return found;
}

function explain(command: string, context = ''): { explanation: string; category: string; configMode: string; relatedCommands: string[] } {
  const value = command.toLowerCase();
  const networkStatement = /^network\s+[\d.]+\s+[\d.]+$/.test(value);
  if (networkStatement && /router\s+ospf/i.test(context)) return {
    explanation: 'Chọn interface khớp địa chỉ và wildcard mask để chạy OSPF trong area được khai báo ở router process.',
    category: 'OSPF', configMode: 'Router Configuration', relatedCommands: ['router ospf <process-id>', 'show ip ospf neighbor']
  };
  if (networkStatement && /router\s+eigrp/i.test(context)) return {
    explanation: 'Khai báo mạng có interface tham gia EIGRP process hiện tại để router quảng bá và học route.',
    category: 'Routing', configMode: 'Router Configuration', relatedCommands: ['router eigrp <autonomous-system>', 'show ip protocols']
  };
  const standardAcl = /^access-list\s+(\d+)\s+(permit|deny)\s+(\S+)(?:\s+([\d.]+))?$/i.exec(command);
  if (standardAcl && Number(standardAcl[1]) >= 1 && Number(standardAcl[1]) <= 99 && standardAcl[2].toLowerCase() === 'permit') {
    const source = standardAcl[3].toLowerCase() === 'any'
      ? 'mọi địa chỉ nguồn'
      : `${standardAcl[3]}${standardAcl[4] ? ` với wildcard mask ${standardAcl[4]}` : ''}`;
    return {
      explanation: `Cho phép ${source} khớp ACL ${standardAcl[1]}. ACL này có thể chọn lưu lượng cho NAT; chức năng cụ thể phụ thuộc nơi ACL được áp dụng.`,
      category: 'ACL', configMode: 'Global Configuration', relatedCommands: ['show access-lists']
    };
  }
  const rules: Array<[RegExp, string, string]> = [
    [/^enable$/, 'Chuyển từ User EXEC (>) sang Privileged EXEC (#), nơi có thể chạy lệnh quản trị và vào cấu hình.', 'Cơ bản'],
    [/^disable$/, 'Trở từ Privileged EXEC (#) về User EXEC (>).', 'Cơ bản'],
    [/^end$/, 'Thoát mọi cấp cấu hình và quay thẳng về dấu #.', 'Cơ bản'],
    [/^exit$/, 'Lùi khỏi chế độ hiện tại một cấp; từ interface, lệnh này quay về Global Configuration.', 'Cơ bản'],
    [/^logout$/, 'Đóng phiên CLI hiện tại.', 'Cơ bản'],
    [/^(?:configure terminal|conf t)$/, 'Vào Global Configuration để thay đổi cấu hình thiết bị.', 'Cơ bản'],
    [/^hostname\s+/, `Đổi hostname thiết bị thành ${command.split(/\s+/).slice(1).join(' ')}.`, 'Cơ bản'],
    [/^enable secret\s+/, 'Đặt mật khẩu đã mã hóa để bảo vệ quyền vào Privileged EXEC.', 'Bảo mật'],
    [/^interface\s+range\s/, 'Chọn một dải cổng để áp dụng cùng cấu hình cho nhiều interface.', 'Interface'],
    [/^interface\s+vlan\s+(\d+)/, `Đi vào SVI VLAN ${command.split(/\s+/).at(-1)}. Đây là interface Layer 3 logic dùng làm gateway hoặc IP quản trị cho VLAN.`, 'SVI'],
    [/^interface\s+port-channel\s+(\d+)/, `Đi vào interface logic Port-Channel ${command.split(/\s+/).at(-1)}, đại diện cho các cổng vật lý đã gộp thành EtherChannel.`, 'EtherChannel'],
    [/^interface\s+\S+\.\d+$/, 'Đi vào sub-interface, một interface logic gắn với cổng vật lý; thường dùng để cấu hình từng VLAN trong Router-on-a-Stick.', 'Sub-interface'],
    [/^(?:interface|int)\s+/, 'Chọn cổng vật lý hoặc interface logic; các lệnh cấu hình tiếp theo áp dụng cho interface đó.', 'Interface'],
    [/^vlan\s+(\d+)/, `Tạo hoặc mở VLAN ${command.split(/\s+/)[1]} trên switch; lệnh này chưa tự gán cổng vào VLAN.`, 'VLAN'],
    [/^name\s+/, 'Đặt tên dễ nhận biết cho VLAN đang cấu hình.', 'VLAN'],
    [/^description\s+/, 'Ghi chú mục đích hoặc thiết bị ở đầu xa của interface hiện tại.', 'Interface'],
    [/^switchport\s+mode\s+access$/, 'Chuyển cổng switch sang Access để kết nối thiết bị đầu cuối trong một VLAN.', 'Access Port'],
    [/^switchport\s+access\s+vlan\s+(\d+)/, `Gán cổng Access hiện tại vào VLAN ${command.split(/\s+/).at(-1)}. Thiết bị cắm vào cổng này sẽ thuộc VLAN đó.`, 'VLAN'],
    [/^switchport\s+mode\s+trunk$/, 'Chuyển cổng switch sang chế độ Trunk để mang lưu lượng của nhiều VLAN. Thường dùng giữa switch với switch hoặc switch với router/L3 switch.', 'Trunk'],
    [/^switchport\s+trunk\s+allowed\s+vlan\s+/, 'Giới hạn những VLAN được phép đi qua trunk; VLAN không nằm trong danh sách sẽ không được chuyển tiếp trên đường này.', 'Trunk'],
    [/^switchport\s+trunk\s+native\s+vlan\s+(\d+)/, `Đặt VLAN ${command.split(/\s+/).at(-1)} làm Native VLAN trên trunk; frame không gắn thẻ được xử lý trong VLAN này.`, 'Trunk'],
    [/^switchport\s+voice\s+vlan\s+(\d+)/, `Gán VLAN ${command.split(/\s+/).at(-1)} cho lưu lượng thoại của IP Phone kết nối vào cổng.`, 'VLAN'],
    [/^switchport\s+port-security\s+mac-address\s+sticky$/, 'Tự học MAC đang kết nối và ghi MAC đó vào cấu hình Port Security của cổng.', 'Port Security'],
    [/^switchport\s+port-security\s+maximum\s+(\d+)/, `Giới hạn cổng chỉ học tối đa ${command.split(/\s+/).at(-1)} địa chỉ MAC.`, 'Port Security'],
    [/^switchport\s+port-security\s+violation\s+/, 'Chọn cách switch xử lý khi cổng nhận MAC vượt quá giới hạn hoặc không được phép.', 'Port Security'],
    [/^switchport\s+port-security$/, 'Bật Port Security trên cổng switch để giới hạn các địa chỉ MAC được phép kết nối.', 'Port Security'],
    [/^spanning-tree\s+mode\s+rapid-pvst$/, 'Bật Rapid-PVST+, tạo cây STP riêng cho từng VLAN và hội tụ nhanh hơn PVST cổ điển.', 'STP'],
    [/^spanning-tree\s+vlan\s+.+\s+root\s+primary$/, 'Đặt switch này làm root bridge ưu tiên cho các VLAN được nêu.', 'STP'],
    [/^spanning-tree\s+vlan\s+.+\s+root\s+secondary$/, 'Đặt switch này làm root bridge dự phòng nếu root chính ngừng hoạt động.', 'STP'],
    [/^spanning-tree\s+portfast(?:\s|$)/, 'Cho cổng access tới thiết bị đầu cuối vào trạng thái Forwarding nhanh hơn, giúp PC nhận mạng sớm sau khi cắm dây.', 'STP'],
    [/^spanning-tree\s+bpduguard\s+enable$/, 'Đưa cổng vào err-disabled nếu nhận BPDU, giúp ngăn switch không mong muốn nối vào cổng edge.', 'Bảo mật'],
    [/^spanning-tree\s+vlan\s+.+\s+priority\s+(\d+)/, `Đặt bridge priority STP cho VLAN; giá trị thấp hơn có lợi thế được bầu làm root bridge. Priority đang đặt là ${command.split(/\s+/).at(-1)}.`, 'STP'],
    [/^spanning-tree\s+cost\s+(\d+)/, `Đặt path cost STP của cổng là ${command.split(/\s+/).at(-1)} để ảnh hưởng đường được chọn tới root bridge.`, 'STP'],
    [/^spanning-tree\s+port-priority\s+(\d+)/, `Đặt port priority STP là ${command.split(/\s+/).at(-1)} để phân xử khi các cổng có cùng path cost.`, 'STP'],
    [/^channel-group\s+(\d+)\s+mode\s+active$/, `Đưa cổng vào EtherChannel group ${command.split(/\s+/)[1]} và bật LACP Active để chủ động thương lượng với thiết bị bên kia.`, 'LACP'],
    [/^channel-group\s+(\d+)\s+mode\s+passive$/, `Đưa cổng vào EtherChannel group ${command.split(/\s+/)[1]} và bật LACP Passive; cổng chỉ thương lượng khi phía bên kia khởi tạo.`, 'LACP'],
    [/^channel-group\s+(\d+)\s+mode\s+(?:auto|desirable)$/, 'Đưa cổng vào EtherChannel bằng PAgP; desirable chủ động thương lượng, còn auto chờ phía bên kia.', 'PAgP'],
    [/^ip\s+routing$/, 'Bật chuyển tiếp và định tuyến IPv4 giữa các interface Layer 3 trên switch.', 'Routing'],
    [/^ip\s+address\s+dhcp$/, 'Yêu cầu DHCP cấp địa chỉ IPv4 cho interface hiện tại.', 'IPv4'],
    [/^ip\s+address\s+/, 'Gán địa chỉ IPv4 và subnet mask cho interface hiện tại.', 'IPv4'],
    [/^no\s+ip\s+address$/, 'Xóa địa chỉ IP đang cấu hình trực tiếp trên interface.', 'IPv4'],
    [/^no\s+switchport$/, 'Chuyển cổng switch Layer 3 từ Layer 2 sang routed port để định tuyến IP trực tiếp trên cổng.', 'Layer 3 Switch'],
    [/^ip\s+route\s+0\.0\.0\.0\s+0\.0\.0\.0\s+/, `Tạo Default Route. Gói tin không khớp tuyến cụ thể nào trong Routing Table sẽ đi tới next-hop ${command.split(/\s+/)[4]}.`, 'Routing'],
    [/^ip\s+route\s+/, `Tạo tuyến tĩnh tới mạng ${command.split(/\s+/)[2]} ${command.split(/\s+/)[3]}, chuyển gói tin tới next-hop/interface kế tiếp.`, 'Routing'],
    [/^ip\s+nat\s+inside\s+source\s+list\s+.+\s+overload$/, 'Bật PAT: dịch các địa chỉ nguồn khớp ACL để nhiều thiết bị nội bộ dùng chung IP phía ngoài.', 'NAT/PAT'],
    [/^ip\s+nat\s+inside\s+source\s+/, 'Tạo quy tắc NAT ánh xạ địa chỉ nguồn nội bộ sang địa chỉ phía ngoài.', 'NAT/PAT'],
    [/^ip\s+nat\s+inside$/, 'Đánh dấu interface hiện tại là phía mạng nội bộ của NAT.', 'NAT/PAT'],
    [/^ip\s+nat\s+outside$/, 'Đánh dấu interface hiện tại là phía mạng ngoài của NAT, thường hướng về ISP.', 'NAT/PAT'],
    [/^ip\s+access-group\s+/, 'Gắn ACL lên interface để lọc gói tin vào (in) hoặc ra (out).', 'ACL'],
    [/^router\s+ospf\s+/, `Khởi tạo OSPFv2 process ${command.split(/\s+/)[2]} và chuyển vào chế độ cấu hình OSPF.`, 'OSPF'],
    [/^network\s+.+\s+area\s+/, `Chọn interface khớp địa chỉ và wildcard mask để chạy OSPF trong area ${command.match(/\sarea\s+(\S+)/i)?.[1] || 'được chỉ định'}.`, 'OSPF'],
    [/^passive-interface\s+/, 'Ngừng gửi hello và hình thành neighbor trên interface đó nhưng vẫn có thể quảng bá mạng của interface vào OSPF.', 'OSPF'],
    [/^ip\s+dhcp\s+excluded-address\s+/, 'Loại trừ IP hoặc dải IP khỏi DHCP để switch/router không cấp các địa chỉ đó cho máy khách.', 'DHCP'],
    [/^ip\s+dhcp\s+pool\s+/, 'Tạo DHCP pool để khai báo mạng và các thông số cấp cho máy khách.', 'DHCP'],
    [/^network\s+[\d.]+\s+[\d.]+$/, 'Khai báo mạng và subnet mask mà DHCP pool sẽ cấp địa chỉ cho máy khách.', 'DHCP'],
    [/^default-router\s+/, `Chỉ định Default Gateway ${command.split(/\s+/).slice(1).join(' ')} mà DHCP sẽ gửi cho máy khách.`, 'DHCP'],
    [/^dns-server\s+/, `Chỉ định DNS Server ${command.split(/\s+/).slice(1).join(' ')} mà DHCP sẽ gửi cho máy khách.`, 'DHCP'],
    [/^lease\s+/, 'Đặt khoảng thời gian máy khách được giữ địa chỉ IP đã nhận từ DHCP.', 'DHCP'],
    [/^ip\s+helper-address\s+/, `Chuyển tiếp DHCP broadcast từ mạng hiện tại tới DHCP Server ${command.split(/\s+/).at(-1)} ở mạng khác.`, 'DHCP'],
    [/^access-list\s+\d+\s+permit\s+/, 'Cho phép địa chỉ hoặc mạng khớp điều kiện trong ACL này; ACL còn có thể được dùng để match lưu lượng cho NAT.', 'ACL'],
    [/^access-list\s+\d+\s+deny\s+/, 'Từ chối địa chỉ hoặc lưu lượng khớp điều kiện trong ACL này; tác dụng thực tế phụ thuộc nơi ACL được áp dụng.', 'ACL'],
    [/^ip\s+access-list\s+standard\s+/, 'Tạo ACL standard có tên để so khớp địa chỉ IPv4 nguồn.', 'ACL'],
    [/^ip\s+access-list\s+extended\s+/, 'Tạo ACL extended có tên để so khớp IP nguồn/đích, giao thức và cổng.', 'ACL'],
    [/^standby\s+(\d+)\s+ip\s+/, `Đặt ${command.split(/\s+/).at(-1)} làm Virtual IP của HSRP group ${command.split(/\s+/)[1]}; máy trong VLAN dùng địa chỉ này làm Default Gateway.`, 'HSRP'],
    [/^standby\s+(\d+)\s+priority\s+(\d+)/, `Đặt HSRP priority của group ${command.split(/\s+/)[1]} là ${command.split(/\s+/).at(-1)}. Router có priority cao hơn được ưu tiên làm Active.`, 'HSRP'],
    [/^standby\s+(\d+)\s+preempt/, `Cho router có priority cao hơn giành lại vai trò Active của HSRP group ${command.split(/\s+/)[1]} khi hoạt động trở lại.`, 'HSRP'],
    [/^standby\s+(\d+)\s+track\s+(\d+)\s+decrement\s+(\d+)/, `Cho HSRP group ${command.split(/\s+/)[1]} theo dõi Track ${command.split(/\s+/)[3]}. Nếu Track Down, priority của router giảm ${command.split(/\s+/).at(-1)} để router dự phòng có thể lên Active.`, 'HSRP'],
    [/^standby\s+(\d+)\s+track\s+(\d+)/, `Cho HSRP group ${command.split(/\s+/)[1]} theo dõi Track ${command.split(/\s+/)[3]}; priority giảm theo cấu hình track mặc định hoặc chỉ định riêng.`, 'HSRP'],
    [/^track\s+(\d+)\s+interface\s+(.+)\s+line-protocol$/, `Tạo Track ${command.split(/\s+/)[1]} để theo dõi line protocol của ${command.split(/\s+/)[3]}. Nếu interface Down, đối tượng Track cũng Down.`, 'High Availability'],
    [/^ip\s+sla\s+(\d+)$/, `Tạo IP SLA operation ${command.split(/\s+/).at(-1)}; cần thêm probe và lịch chạy để đo khả năng tới đích.`, 'High Availability'],
    [/^no\s+shutdown$/, 'Bỏ trạng thái shutdown quản trị để bật interface.', 'Interface'],
    [/^shutdown$/, 'Tắt interface ở mức quản trị; interface ngừng chuyển tiếp lưu lượng.', 'Interface'],
    [/^write\s+memory$|^copy\s+(?:running-config|run)\s+(?:startup-config|start)$/, 'Lưu running-config vào startup-config để cấu hình vẫn còn sau khi thiết bị khởi động lại.', 'Lưu cấu hình'],
    [/^delete\s+flash:vlan\.dat$/, 'Xóa file vlan.dat, nơi switch lưu cơ sở dữ liệu VLAN. Các VLAN tùy chỉnh sẽ mất sau khi khởi động lại.', 'Quản trị'],
    [/^write\s+erase$|^erase\s+startup-config$/, 'Xóa startup-config; cấu hình hiện tại trong RAM chưa bị xóa cho tới khi reload.', 'Quản trị'],
    [/^reload$/, 'Khởi động lại thiết bị; cấu hình chưa lưu vào startup-config có thể bị mất.', 'Quản trị'],
    [/^show\s+vlan\s+brief$/, 'Hiển thị danh sách VLAN trên switch và các cổng access đang thuộc từng VLAN.', 'Kiểm tra'],
    [/^show\s+interfaces\s+trunk$/, 'Hiển thị các cổng đang hoạt động ở chế độ Trunk, Native VLAN và danh sách VLAN được phép đi qua.', 'Kiểm tra'],
    [/^show\s+etherchannel\s+summary$/, 'Kiểm tra trạng thái EtherChannel, giao thức đang dùng và các cổng thành viên đã bundle hay chưa.', 'Kiểm tra'],
    [/^show\s+ip\s+interface\s+brief$/, 'Tóm tắt địa chỉ IP và trạng thái up/down của các interface.', 'Kiểm tra'],
    [/^show\s+ip\s+route$/, 'Hiển thị Routing Table IPv4, gồm các mạng đã biết và next-hop được chọn.', 'Kiểm tra'],
    [/^show\s+ip\s+protocols$/, 'Hiển thị giao thức định tuyến đang chạy và các mạng/thông số mà router quảng bá.', 'Kiểm tra'],
    [/^show\s+ip\s+ospf\s+neighbor$/, 'Kiểm tra router OSPF láng giềng và trạng thái adjacency giữa hai router.', 'Kiểm tra'],
    [/^show\s+standby\s+brief$/, 'Hiển thị nhanh HSRP Active/Standby, priority và Virtual IP của từng group.', 'Kiểm tra'],
    [/^show\s+standby$/, 'Hiển thị chi tiết trạng thái, priority, timer và Virtual IP của các HSRP group.', 'Kiểm tra'],
    [/^show\s+track$/, 'Hiển thị trạng thái Up/Down của các đối tượng Track đang được theo dõi.', 'Kiểm tra'],
    [/^show\s+spanning-tree/, 'Hiển thị root bridge và vai trò/trạng thái STP của các cổng trong VLAN.', 'Kiểm tra'],
    [/^show\s+mac\s+address-table$/, 'Hiển thị các MAC switch đã học, VLAN tương ứng và cổng switch đi tới thiết bị đó.', 'Kiểm tra'],
    [/^show\s+interfaces\s+status$/, 'Hiển thị trạng thái cổng switch, VLAN, duplex và speed.', 'Kiểm tra'],
    [/^show\s+interfaces\s+description$/, 'Hiển thị trạng thái up/down và description của từng interface.', 'Kiểm tra'],
    [/^show\s+interfaces\s+port-channel/, 'Hiển thị trạng thái và bộ đếm lưu lượng của interface Port-Channel.', 'Kiểm tra'],
    [/^show\s+interfaces(?:\s+\S+)?$/, 'Hiển thị trạng thái, lỗi và bộ đếm lưu lượng của interface được chỉ định.', 'Kiểm tra'],
    [/^show\s+running-config$/, 'Hiển thị cấu hình đang chạy trong RAM.', 'Kiểm tra'],
    [/^show\s+startup-config$/, 'Hiển thị cấu hình sẽ được nạp khi thiết bị khởi động.', 'Kiểm tra'],
    [/^show\s+arp$/, 'Hiển thị bảng ánh xạ địa chỉ IPv4 sang MAC mà thiết bị đã học.', 'Kiểm tra'],
    [/^show\s+cdp\s+neighbors(?:\s+detail)?$/, 'Tìm thiết bị Cisco kết nối trực tiếp và cổng hai đầu; detail còn hiển thị IP, model và phiên bản.', 'Kiểm tra'],
    [/^show\s+version$/, 'Hiển thị model, phiên bản IOS, thời gian hoạt động và thông tin phần cứng.', 'Kiểm tra'],
    [/^show\s+ip\s+nat\s+translations$/, 'Hiển thị các ánh xạ NAT/PAT đang hoạt động giữa địa chỉ inside và outside.', 'Kiểm tra'],
    [/^show\s+access-lists?$/, 'Hiển thị các dòng ACL và bộ đếm số lần từng dòng permit/deny khớp.', 'Kiểm tra'],
    [/^show\s+/, 'Hiển thị thông tin cụ thể theo đối tượng mà lệnh show chỉ định.', 'Kiểm tra'],
    [/^ping\s+/, 'Gửi ICMP Echo tới đích để kiểm tra khả năng kết nối IP.', 'Kiểm tra'],
    [/^traceroute\s+/, 'Hiển thị từng router trung gian trên đường tới địa chỉ đích.', 'Kiểm tra'],
    [/^encapsulation\s+dot1q\s+(\d+)/, `Gán sub-interface hiện tại cho VLAN ${command.split(/\s+/)[2]} bằng chuẩn IEEE 802.1Q; thường dùng trong Router-on-a-Stick.`, 'Router-on-a-Stick'],
    [/^pppoe(?:-client)?\s+/, 'Gắn cấu hình PPPoE lên interface hoặc Dialer để thiết lập kết nối WAN qua nhà mạng.', 'PPPoE'],
    [/^dialer\s+pool\s+/, 'Gắn interface Dialer với dialer pool tương ứng để dùng cấu hình kết nối PPPoE.', 'PPPoE'],
    [/^line\s+(?:console|vty|aux)/, 'Chọn line Console, VTY hoặc AUX để cấu hình cách đăng nhập thiết bị.', 'Quản trị'],
    [/^transport\s+input\s+ssh$/, 'Chỉ cho phép SSH truy cập từ xa vào các line VTY.', 'Bảo mật'],
    [/^username\s+/, 'Tạo tài khoản cục bộ để thiết bị dùng xác thực khi đăng nhập, thường đi cùng login local.', 'Bảo mật'],
    [/^crypto\s+key\s+generate\s+rsa/, 'Tạo khóa RSA mà máy chủ SSH của thiết bị cần để mã hóa phiên quản trị.', 'Bảo mật'],
    [/^ip\s+domain-name\s+/, 'Đặt domain name cho thiết bị; IOS dùng thông tin này khi tạo khóa RSA cho SSH.', 'Bảo mật'],
    [/^ip\s+ssh\s+version\s+/, `Giới hạn máy chủ SSH sử dụng phiên bản ${command.split(/\s+/).at(-1)}.`, 'Bảo mật'],
    [/^service\s+password-encryption$/, 'Mã hóa dạng hiển thị của một số mật khẩu trong running-config.', 'Bảo mật']
  ];
  const match = rules.find(([pattern]) => pattern.test(value));
  const category = match?.[2] || (/^show\s|^(?:ping|traceroute)\s/.test(value) ? 'Kiểm tra'
    : /^standby\s/.test(value) ? 'HSRP'
    : /^ip\s+nat/.test(value) ? 'NAT/PAT'
    : /^switchport\s/.test(value) ? 'Switching'
    : /^spanning-tree\s/.test(value) ? 'STP'
    : /^channel-group\s/.test(value) ? 'EtherChannel'
    : /^ip\s+route/.test(value) ? 'Routing'
    : /^ip\s+dhcp|^default-router|^dns-server/.test(value) ? 'DHCP'
    : /^access-list|^ip\s+access-list|^ip\s+access-group/.test(value) ? 'ACL'
    : /^encapsulation\s+dot1q/.test(value) ? 'Router-on-a-Stick'
    : /^interface\s+vlan/.test(value) ? 'SVI'
    : /^interface\s+\S+\.\d+/.test(value) ? 'Sub-interface'
    : /^interface\s+port-channel/.test(value) ? 'EtherChannel'
    : /^interface\s/.test(value) ? 'Interface'
    : 'Cisco IOS');

  const relatedRules: Array<[RegExp, string[]]> = [
    [/^switchport\s+mode\s+trunk$/, ['switchport trunk allowed vlan <vlan-list>', 'show interfaces trunk']],
    [/^switchport\s+access\s+vlan/, ['switchport mode access', 'show vlan brief']],
    [/^channel-group/, ['interface port-channel <group-id>', 'show etherchannel summary']],
    [/^standby\s/, ['show standby brief', 'show standby']],
    [/^ip\s+route/, ['show ip route']],
    [/^encapsulation\s+dot1q/, ['interface <subinterface-id>', 'show ip interface brief']],
    [/^ip\s+nat/, ['show ip nat translations']],
    [/^access-list|^ip\s+access-list/, ['ip access-group <acl> <in|out>', 'show access-lists']],
    [/^spanning-tree/, ['show spanning-tree']],
    [/^ip\s+dhcp/, ['show ip dhcp binding']],
    [/^router\s+ospf|^network\s/, ['show ip protocols', 'show ip ospf neighbor']],
    [/^interface\s+vlan/, ['ip routing', 'show ip interface brief']]
  ];
  const relatedCommands = relatedRules.find(([pattern]) => pattern.test(value))?.[1] || [];
  return { explanation: match?.[1] || '', category, configMode: configMode(command, context), relatedCommands };
}

function tagApplies(tag: string, command: string, details: { category: string; explanation: string }): boolean {
  const value = tag.toLocaleLowerCase('vi').replace(/[^a-z0-9à-ỹ]+/gi, ' ').trim();
  const context = `${command} ${details.category} ${details.explanation}`.toLocaleLowerCase('vi');
  if (/^(?:cisco|ccna)$/.test(value)) return true;
  if (/^(?:layer 2|l2|switch layer 2 cisco|switch l2)$/.test(value)) return /switch|vlan|stp|etherchannel|trunk|port-channel/.test(context);
  if (/^(?:layer 3|l3|switch layer 3 cisco|switch l3)$/.test(value)) return /routing|route|ip address|svi|layer 3/.test(context);
  if (/^(?:cisco router|router)$/.test(value)) return /route|routing|ospf|nat|dhcp|hsrp|ppp|interface|router-on-a-stick/.test(context);
  const words = value.split(/\s+/).filter(word => word.length > 1);
  return words.length > 0 && words.every(word => context.includes(word));
}

export function buildExplainedCommandIndex(input: {
  commands: CiscoCommand[];
  lessons: Lesson[];
  topologies: Topology[];
  notes: PersonalNote[];
}): ExplainedCiscoCommand[] {
  const sources: CommandSource[] = [];
  for (const item of input.commands) {
    const common = { title: item.title || item.command, type: 'Lệnh Cisco', tags: [...(item.tags || []), item.category, item.device].filter(Boolean), devices: [item.device].filter(Boolean) };
    if (item.example) sources.push({ ...common, content: item.example, trustedCli: true });
    for (const step of item.steps || []) if (step.command) sources.push({ ...common, content: step.command, trustedCli: true });
    if (item.command) sources.push({ ...common, content: item.command });
    if (item.description) sources.push({ ...common, content: item.description });
    if (item.notes) sources.push({ ...common, content: item.notes });
  }
  for (const item of input.lessons) {
    const tags = [...(item.tags || []), item.topic].filter(Boolean);
    for (const block of item.blocks || []) if (block.content) sources.push({ title: item.title, type: 'Bài học', content: block.content, tags, trustedCli: block.type === 'cisco-command' });
  }
  for (const item of input.topologies) {
    const tags = [...(item.devices || [])];
    if (item.description) sources.push({ title: item.title, type: 'Mô hình mạng', content: item.description, tags, devices: tags });
    if (item.notes) sources.push({ title: item.title, type: 'Mô hình mạng', content: item.notes, tags, devices: tags });
  }
  for (const item of input.notes) if (item.content) sources.push({ title: item.title, type: 'Ghi chú', content: item.content, tags: item.tags || [] });

  const entries = new Map<string, ExplainedCiscoCommand>();
  for (const source of sources) {
    for (const command of commandsInText(source.content, source.trustedCli)) {
      const context = contextFor(source.content, command, source.trustedCli);
      const key = normalizeCommandPattern(command, context);
      const existing = entries.get(key);
      if (existing) {
        if (!existing.examples.includes(command) && existing.examples.length < 30) existing.examples.push(command);
        if (context && !existing.contexts.includes(context) && existing.contexts.length < 6) existing.contexts.push(context);
        for (const device of source.devices || []) if (!existing.devices.includes(device)) existing.devices.push(device);
        if (!existing.sources.includes(`${source.type}: ${source.title}`)) existing.sources.push(`${source.type}: ${source.title}`);
        for (const tag of source.tags || []) if (tagApplies(tag, command, existing) && !existing.tags.includes(tag)) existing.tags.push(tag);
      } else {
        const details = explain(command, context);
        entries.set(key, {
          command,
          commandPattern: key,
          ...details,
          examples: [command],
          contexts: context ? [context] : [],
          devices: Array.from(new Set(source.devices || [])),
          sources: [`${source.type}: ${source.title}`],
          tags: Array.from(new Set((source.tags || []).filter(tag => tagApplies(tag, command, details)))).slice(0, 8),
          userEdited: false
        });
      }
    }
  }
  return Array.from(entries.values());
}

export function applySavedCommandExplanations(
  entries: ExplainedCiscoCommand[],
  saved: CiscoCommandExplanation[]
): ExplainedCiscoCommand[] {
  const byPattern = new Map(saved.map(item => [item.commandPattern, item]));
  return entries.map(entry => {
    const cached = byPattern.get(entry.commandPattern);
    if (!cached || (!cached.userEdited && isQualityCommandExplanation(entry.explanation))) return entry;
    return {
      ...entry,
      explanation: cached.explanation,
      category: cached.category || entry.category,
      configMode: cached.configMode || entry.configMode,
      relatedCommands: cached.relatedCommands?.length ? cached.relatedCommands : entry.relatedCommands,
      userEdited: cached.userEdited,
      confidence: cached.confidence
    };
  });
}
