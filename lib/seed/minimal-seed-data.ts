import { Lesson, CiscoCommand, Topology, PersonalNote, DashboardStats } from '../types';

export const demoLessons: Lesson[] = [
  {
    id: 'les-demo-vlan',
    title: 'VLAN Cơ Bản & Cấu Hình Switch Port Access',
    topic: 'Network Access',
    tags: ['VLAN', 'Switching', 'Layer2'],
    summary: 'Hiểu bản chất VLAN và các bước gán cổng Access Port trên Switch Cisco Catalyst.',
    isFavorite: true,
    createdAt: '2026-09-25T10:00:00Z',
    updatedAt: '2026-09-25T10:00:00Z',
    blocks: [
      {
        id: 'b-1',
        type: 'heading',
        title: '1. Khái Niệm VLAN',
        content: 'VLAN (Virtual Local Area Network) là mạng LAN ảo giúp chia nhỏ broadcast domain trên một Switch vật lý.'
      },
      {
        id: 'b-2',
        type: 'cisco-command',
        title: 'Cấu hình tạo VLAN 10 và gán cổng Fa0/1',
        content: `SW1# configure terminal
SW1(config)# vlan 10
SW1(config-vlan)# name SALES
SW1(config-vlan)# exit
SW1(config)# interface FastEthernet0/1
SW1(config-if)# switchport mode access
SW1(config-if)# switchport access vlan 10
SW1(config-if)# no shutdown`
      },
      {
        id: 'b-3',
        type: 'note',
        title: 'Ghi Chú Trọng Tâm',
        content: 'Hai thiết bị thuộc khác VLAN không thể giao tiếp trực tiếp ở Layer 2 nếu chưa cấu hình Router hoặc L3 Switch để định tuyến.'
      },
      {
        id: 'b-4',
        type: 'warning',
        title: 'Lỗi Thường Gặp',
        content: 'Quên tạo VLAN trước khi gán cổng access. IOS sẽ tự động tạo VLAN nhưng sử dụng tên mặc định VLAN0010.'
      }
    ]
  }
];

// A starter Cisco command library is bundled with the app so a fresh device
// has useful content even before cloud sync or a manual data import is set up.
export const demoCommands: CiscoCommand[] = [
  {
    id: 'cmd-default-switch-layer2-cisco',
    command: 'Switch Layer 2 Cisco',
    title: 'Switch Layer 2 Cisco',
    description: 'Xóa cấu hình cũ',
    category: 'Switch Layer 2 Cisco',
    device: 'Cisco L2 Switch',
    mode: 'Global Configuration',
    example: `# Xóa cấu hình cũ\nenable\nwrite erase\ndelete flash:vlan.dat\nreload\n\n# Vào cấu hình\nenable\nconfigure terminal\nhostname SW1\n\n# Tạo VLAN\nvlan 10\nname VLAN10\nexit\n\nvlan 20\nname VLAN20\nexit\n\nvlan 30\nname VLAN30\nexit\n\nvlan 40\nname VLAN40\nexit\n\n# Chia port access\nPort 1–5 → VLAN10\nPort 6–10 → VLAN20\nPort 11–15 → VLAN30\nPort 16–20 → VLAN40\ninterface range fa0/1-5\nswitchport mode access\nswitchport access vlan 10\nexit\n\ninterface range fa0/6-10\nswitchport mode access\nswitchport access vlan 20\nexit\n\ninterface range fa0/11-15\nswitchport mode access\nswitchport access vlan 30\nexit\n\ninterface range fa0/16-20\nswitchport mode access\nswitchport access vlan 40\nexit\n\n# Cấu hình cổng trunk\nVí dụ Gi0/1 nối Router/L3/Switch khác:\ninterface gi0/1\nswitchport mode trunk\nswitchport trunk allowed vlan 10,20,30,40\nno shutdown\nexit\n\n# Nếu Fa0/24 là trunk:\ninterface fa0/24\nswitchport mode trunk\nswitchport trunk allowed vlan 10,20,30,40\nno shutdown\nexit\n\n# Lưu cấu hình\nend\nwrite memory\n\nhoặc:\ncopy running-config startup-config\n\n# Lệnh kiểm tra\nshow vlan brief\nshow interfaces trunk\nshow interfaces status\nshow running-config\nshow mac address-table\nshow interfaces description`,
    steps: [
      { id: 'default-l2-reset', explanation: 'Xóa cấu hình cũ', command: 'enable\nwrite erase\ndelete flash:vlan.dat\nreload' },
      { id: 'default-l2-configure', explanation: 'Vào cấu hình', command: 'enable\nconfigure terminal\nhostname SW1' },
      { id: 'default-l2-vlans', explanation: 'Tạo VLAN', command: 'vlan 10\nname VLAN10\nexit\n\nvlan 20\nname VLAN20\nexit\n\nvlan 30\nname VLAN30\nexit\n\nvlan 40\nname VLAN40\nexit' },
      { id: 'default-l2-access', explanation: 'Chia port access\nPort 1–5 → VLAN10\nPort 6–10 → VLAN20\nPort 11–15 → VLAN30\nPort 16–20 → VLAN40', command: 'interface range fa0/1-5\nswitchport mode access\nswitchport access vlan 10\nexit\n\ninterface range fa0/6-10\nswitchport mode access\nswitchport access vlan 20\nexit\n\ninterface range fa0/11-15\nswitchport mode access\nswitchport access vlan 30\nexit\n\ninterface range fa0/16-20\nswitchport mode access\nswitchport access vlan 40\nexit' },
      { id: 'default-l2-trunk', explanation: 'Cấu hình cổng trunk\nVí dụ Gi0/1 nối Router/L3/Switch khác:', command: 'interface gi0/1\nswitchport mode trunk\nswitchport trunk allowed vlan 10,20,30,40\nno shutdown\nexit' },
      { id: 'default-l2-trunk-fa24', explanation: 'Nếu Fa0/24 là trunk:', command: 'interface fa0/24\nswitchport mode trunk\nswitchport trunk allowed vlan 10,20,30,40\nno shutdown\nexit' },
      { id: 'default-l2-save', explanation: 'Lưu cấu hình', command: 'end\nwrite memory\n\nhoặc:\ncopy running-config startup-config' },
      { id: 'default-l2-verify', explanation: 'Kiểm tra VLAN, trunk, port và bảng MAC', command: 'show vlan brief\nshow interfaces trunk\nshow interfaces status\nshow running-config\nshow mac address-table\nshow interfaces description' }
    ],
    tags: ['Cisco', 'Switch', 'Layer 2', 'VLAN', 'Trunk'],
    isFavorite: false,
    createdAt: '2026-09-28T00:00:00.000Z'
  }
];

export const demoNotes: PersonalNote[] = [
  {
    id: 'note-demo-trunk',
    title: 'Trunk Không Chạy VLAN 30',
    type: 'Lỗi gặp phải',
    content: `Quên allow VLAN 30 trên đường liên kết Trunking Fa0/24 giữa 2 switch SW1 và SW2.

Sửa lại bằng lệnh:
SW1(config-if)# switchport trunk allowed vlan 10,20,30`,
    tags: ['Trunk', 'SựCố'],
    isFavorite: true,
    createdAt: '2026-09-25T10:00:00Z',
    updatedAt: '2026-09-25T10:00:00Z'
  }
];

export const demoTopologies: Topology[] = [
  {
    id: 'topo-demo-ros',
    title: 'VLAN + Router-on-a-Stick',
    description: 'Mô hình định tuyến giữa các VLAN bằng Router kết nối cổng Sub-interface với Switch L2 Trunk.',
    nodes: [
      { id: 'r1', label: 'R1 (Gateway)', type: 'Cisco Router', x: 260, y: 60, ip: '10.10.10.1/24' },
      { id: 'sw1', label: 'SW1 (Core)', type: 'Cisco L2 Switch', x: 260, y: 160 },
      { id: 'pc1', label: 'PC1 (VLAN 10)', type: 'PC', x: 120, y: 260, ip: '10.10.10.10', vlan: '10' },
      { id: 'pc2', label: 'PC2 (VLAN 20)', type: 'PC', x: 400, y: 260, ip: '10.10.20.10', vlan: '20' }
    ],
    links: [
      { from: 'r1', to: 'sw1', label: 'G0/0/0 (Trunk)' },
      { from: 'sw1', to: 'pc1', label: 'Fa0/1 (Access 10)' },
      { from: 'sw1', to: 'pc2', label: 'Fa0/2 (Access 20)' }
    ],
    devices: ['R1 (Cisco 4331)', 'SW1 (Cisco 2960)', 'PC1', 'PC2'],
    isFavorite: true,
    createdAt: '2026-09-25T10:00:00Z'
  }
];

export const demoStats: DashboardStats = {
  totalLessons: 1,
  totalCommands: 0,
  totalTopologies: 1,
  totalNotes: 1
};
