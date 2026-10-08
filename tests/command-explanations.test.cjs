const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  const resolvedRequest = request.startsWith('@/') ? path.resolve(__dirname, '..', request.slice(2)) : request;
  return originalResolveFilename.call(this, resolvedRequest, parent, ...rest);
};

function loadTypeScript(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  if (!require.extensions['.ts']) {
    require.extensions['.ts'] = (loaded, tsFilename) => {
      const source = fs.readFileSync(tsFilename, 'utf8');
      const javascript = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
      }).outputText;
      loaded._compile(javascript, tsFilename);
    };
  }
  return require(filename);
}

const index = loadTypeScript('lib/explained-command-index.ts');
const validation = loadTypeScript('lib/ai/command-explanation-validation.ts');
const cliFormatting = loadTypeScript('lib/ai/format-cli.ts');

function build(commands = '', extraLessons = []) {
  return index.buildExplainedCommandIndex({
    commands: [],
    lessons: [{
      id: 'lesson-test', title: 'Lab test', topic: 'CCNA', tags: ['CCNA'], summary: '', isFavorite: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      blocks: [{ id: 'block-test', type: 'cisco-command', content: commands }]
    }, ...extraLessons],
    topologies: [], notes: []
  });
}

test('strips IOS prompts and groups VLAN variants while retaining each real example', () => {
  const rows = build('```cisco\nSW1(config-if)#switchport access vlan 10\nSW1(config-if)#switchport access vlan 20\n```');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].commandPattern, 'switchport access vlan <vlan-id>');
  assert.deepEqual(rows[0].examples, ['switchport access vlan 10', 'switchport access vlan 20']);
  assert.match(rows[0].explanation, /VLAN 10/);
});

test('does not merge access, trunk, SVI, sub-interface, physical port, or LACP modes', () => {
  const rows = build([
    'switchport mode access',
    'switchport mode trunk',
    'interface vlan 10',
    'interface fa0/0.10',
    'interface fa0/1',
    'channel-group 1 mode active',
    'channel-group 2 mode passive'
  ].join('\n'));
  const patterns = new Set(rows.map(row => row.commandPattern));
  for (const pattern of [
    'switchport mode access', 'switchport mode trunk', 'interface vlan <vlan-id>',
    'interface <subinterface-id>', 'interface <interface-id>',
    'channel-group <group-id> mode active', 'channel-group <group-id> mode passive'
  ]) assert.ok(patterns.has(pattern), `missing ${pattern}`);
  assert.equal(rows.length, 7);
});

test('keeps HSRP command concepts separate and explains each function concretely', () => {
  const rows = build([
    'standby 10 ip 10.10.10.1',
    'standby 10 priority 120',
    'standby 10 preempt',
    'standby 10 track 1 decrement 40'
  ].join('\n'));
  assert.equal(rows.length, 4);
  assert.match(rows.find(row => row.command.includes(' priority ')).explanation, /priority.*120.*Active/i);
  assert.match(rows.find(row => row.command.endsWith('preempt')).explanation, /giành lại.*Active/i);
  assert.match(rows.find(row => row.command.includes('track')).explanation, /Track 1.*giảm 40/i);
  assert.match(rows.find(row => row.command.includes(' ip ')).explanation, /Virtual IP.*Default Gateway/i);
});

test('explains requested IOS examples accurately and preserves ACL purpose without assuming filtering', () => {
  const rows = build([
    'switchport mode trunk',
    'encapsulation dot1Q 10',
    'no ip address',
    'ip route 0.0.0.0 0.0.0.0 192.168.1.1',
    'ip nat inside',
    'ip nat outside',
    'access-list 1 permit 10.10.10.0 0.0.0.255',
    'show vlan brief',
    'show interfaces trunk',
    'show etherchannel summary',
    'show standby brief',
    'write memory',
    'delete flash:vlan.dat'
  ].join('\n'));
  const text = command => rows.find(row => row.command.toLowerCase() === command.toLowerCase()).explanation;
  assert.match(text('switchport mode trunk'), /nhiều VLAN/);
  assert.match(text('encapsulation dot1Q 10'), /sub-interface.*VLAN 10.*802\.1Q/i);
  assert.match(text('no ip address'), /Xóa địa chỉ IP.*interface/i);
  assert.match(text('ip route 0.0.0.0 0.0.0.0 192.168.1.1'), /Default Route.*192\.168\.1\.1/);
  assert.match(text('ip nat inside'), /phía mạng nội bộ/);
  assert.match(text('ip nat outside'), /phía mạng ngoài/);
  assert.match(text('access-list 1 permit 10.10.10.0 0.0.0.255'), /khớp.*NAT/i);
  assert.match(text('access-list 1 permit 10.10.10.0 0.0.0.255'), /10\.10\.10\.0.*wildcard mask 0\.0\.0\.255/i);
  assert.doesNotMatch(text('access-list 1 permit 10.10.10.0 0.0.0.255'), /lọc traffic/i);
  assert.match(text('show vlan brief'), /danh sách VLAN.*cổng access/i);
  assert.match(text('show interfaces trunk'), /Native VLAN.*VLAN được phép/i);
  assert.match(text('show etherchannel summary'), /bundle/i);
  assert.match(text('show standby brief'), /Active\/Standby.*Virtual IP/i);
  assert.match(text('write memory'), /running-config.*startup-config/i);
  assert.match(text('delete flash:vlan.dat'), /file vlan\.dat/i);
});

test('uses nearby routing context to keep EIGRP network statements distinct from DHCP', () => {
  const rows = build('router eigrp 100\nnetwork 10.0.0.0 0.0.0.255\n\n ip dhcp pool LAN\nnetwork 10.0.0.0 255.255.255.0');
  const networks = rows.filter(row => row.command.startsWith('network '));
  assert.equal(networks.length, 2);
  assert.notEqual(networks[0].commandPattern, networks[1].commandPattern);
  assert.match(networks.find(row => row.command.includes('0.0.0.255')).explanation, /EIGRP/);
  assert.match(networks.find(row => row.command.includes('255.255.255.0')).explanation, /DHCP pool/i);
});

test('does not promote numbers in ordinary prose to Cisco commands', () => {
  const rows = build('VLAN 10 dùng mạng 10.10.10.0/24. HSRP group 1 có Virtual IP 10.10.10.1.\nSố bước: 1, 2, 3.');
  assert.deepEqual(rows, []);
});

test('formats bare Cisco show command lists as copyable CLI blocks and keeps explanations readable', () => {
  const formatted = cliFormatting.formatCiscoCliMarkdown([
    'show version – hiển thị phần cứng, IOS, uptime',
    'show running-config — xem cấu hình hiện tại',
    'show vlan brief – danh sách VLAN và cổng thành viên',
    'Kiểm tra theo thứ tự trên switch.'
  ].join('\n'));
  assert.match(formatted, /```cisco-explained\nshow version\t/);
  assert.match(formatted, /show vlan brief\tdanh sách VLAN và cổng thành viên/);
  assert.match(formatted, /Kiểm tra theo thứ tự trên switch/);
  assert.match(cliFormatting.formatCiscoCliMarkdown('- **show vlan brief**: Xem VLAN.'), /show vlan brief\tXem VLAN\./);
  assert.equal(cliFormatting.formatCiscoCliMarkdown('show interfaces hiển thị trạng thái'), 'show interfaces hiển thị trạng thái');
});

test('keeps WAN, spaced interface IDs and HSRP commands in CLI while preserving prose and existing fences', () => {
  const commands = ['no ip domain-lookup', 'interface fastEthernet 0/1', 'no ip address', 'pppoe-client dial-pool-number 1', 'interface Dialer1', 'encapsulation ppp', 'dialer pool 1', 'ppp authentication chap callin', 'standby 30 priority 100', 'standby 30 preempt', 'exit'];
  const input = commands.join('\n');
  const formatted = cliFormatting.formatCiscoCliMarkdown(input);
  assert.equal(formatted, '```cisco\n' + input + '\n```\n');
  const range = cliFormatting.formatCiscoCliMarkdown('interface range fa0/1 - 5');
  assert.match(range, /interface range fa0\/1 - 5\n```/);
  const fenced = '```cisco\nencapsulation ppp\n```';
  assert.equal(cliFormatting.formatCiscoCliMarkdown(fenced), fenced);
  const prose = '1. PC kiểm tra IP 192.168.1.2.\nVLAN 10 dùng cho nhân viên.\nshow vlan brief — Xem VLAN trên switch.';
  assert.match(cliFormatting.formatCiscoCliMarkdown(prose), /^1\. PC kiểm tra IP 192\.168\.1\.2\.\nVLAN 10 dùng cho nhân viên\./);
});

test('accepts only concise, specific structured AI explanations for requested patterns', () => {
  const valid = {
    explanations: [
      { commandPattern: 'switchport mode trunk', explanation: 'Chuyển cổng switch sang Trunk để mang lưu lượng của nhiều VLAN.', category: 'Trunk', configMode: 'Interface Configuration', relatedCommands: ['show interfaces trunk'], confidence: 0.96 },
      { commandPattern: 'unexpected', explanation: 'Lệnh này cấu hình thiết bị.', category: 'Cisco IOS', configMode: 'Global Configuration', relatedCommands: [], confidence: 0.9 },
      { commandPattern: 'switchport mode trunk', explanation: 'Một bản trùng không được nhận.', category: 'Trunk', configMode: 'Interface Configuration', relatedCommands: [], confidence: 0.8 }
    ]
  };
  const result = validation.validateCommandExplanations(valid, ['switchport mode trunk']);
  assert.equal(result.length, 1);
  assert.equal(result[0].confidence, 0.96);
});

test('manual explanations override generated cache and low-quality generic text is rejected', () => {
  const entry = build('standby 10 preempt')[0];
  const saved = {
    commandPattern: entry.commandPattern,
    explanation: 'Bản giải thích do tôi tự viết, diễn đạt đúng mục đích cho bài lab.',
    category: entry.category,
    configMode: entry.configMode,
    relatedCommands: [],
    userEdited: true,
    updatedAt: new Date().toISOString()
  };
  assert.equal(index.applySavedCommandExplanations([entry], [saved])[0].explanation, saved.explanation);
  assert.equal(index.isQualityCommandExplanation('Dùng để cấu hình HSRP.'), false);
  assert.equal(index.isQualityCommandExplanation('Hiển thị thông tin.'), false);
});

test('AI endpoint validates structured JSON and reuses its normalized-command cache', async () => {
  const originalKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_MODEL;
  const originalFetch = global.fetch;
  process.env.GROQ_API_KEY = 'unit-test-key';
  process.env.GROQ_MODEL = 'unit-test-model';
  let providerCalls = 0;
  let providerContext = '';
  global.fetch = async (_url, options) => {
    providerCalls += 1;
    providerContext = JSON.parse(options.body || '{}')?.messages?.[1]?.content || '';
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ explanations: [{
      commandPattern: 'switchport access vlan <vlan-id>',
      explanation: 'Gán cổng Access hiện tại vào VLAN được chọn. Thiết bị cắm vào cổng này sẽ thuộc VLAN đó.',
      category: 'VLAN',
      configMode: 'Interface Configuration',
      relatedCommands: ['switchport mode access'],
      confidence: 0.95
    }] }) } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const { POST } = loadTypeScript('app/api/ai/command-explanation/route.ts');
    const { NextRequest } = require('next/server');
    const makeRequest = () => new NextRequest('http://localhost/api/ai/command-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.9' },
      body: JSON.stringify({ commands: [{
        command: 'SW1(config-if)#switchport access vlan 10',
        commandPattern: 'switchport access vlan <vlan-id>',
        category: 'VLAN',
        context: 'switchport mode access\nusername admin secret 5 SUPER_SECRET_HASH\nSW1(config-if)#switchport access vlan 10'
      }] })
    });
    const first = await POST(makeRequest());
    assert.equal(first.status, 200);
    const firstResult = await first.json();
    assert.equal(firstResult.explanations[0].commandPattern, 'switchport access vlan <vlan-id>');
    assert.match(providerContext, /\[đã ẩn\]/);
    assert.doesNotMatch(providerContext, /SUPER_SECRET_HASH/);
    assert.equal(providerCalls, 1);
    const second = await POST(makeRequest());
    assert.equal(second.status, 200);
    assert.equal(providerCalls, 1);

    const invalid = new NextRequest('http://localhost/api/ai/command-explanation', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
      body: JSON.stringify({ commands: [{ command: 'delete everything', commandPattern: 'unsafe', context: '', category: '' }] })
    });
    const invalidResponse = await POST(invalid);
    assert.equal(invalidResponse.status, 400);
    assert.equal(providerCalls, 1);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = originalModel;
  }
});
