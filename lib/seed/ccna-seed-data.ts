export const initialCategories = [
  {
    id: 'cat-1',
    name: 'Căn Bản Mạng (Fundamentals)',
    slug: 'network-fundamentals',
    description: 'Kiến trúc mạng, mô hình OSI/TCP-IP, cáp mạng, cấu trúc địa chỉ IPv4/IPv6 và chia subnetting.',
    icon: 'Network',
    color: '#049fd9',
    topicCount: 4
  },
  {
    id: 'cat-2',
    name: 'Truy Cập Mạng (Network Access)',
    slug: 'network-access',
    description: 'Chuyển mạch Layer 2, VLAN, 802.1Q Trunking, Spanning Tree Protocol (STP), EtherChannel và Wi-Fi.',
    icon: 'Layers',
    color: '#8b5cf6',
    topicCount: 5
  },
  {
    id: 'cat-3',
    name: 'Kết Nối IP (IP Connectivity)',
    slug: 'ip-connectivity',
    description: 'Nguyên lý định tuyến IPv4/IPv6, tuyến tĩnh (Static Route), Default Route và Single-Area OSPFv2.',
    icon: 'Route',
    color: '#06b6d4',
    topicCount: 3
  },
  {
    id: 'cat-4',
    name: 'Dịch Vụ IP (IP Services)',
    slug: 'ip-services',
    description: 'Dự phòng Router (HSRP), cấu hình DHCP Server/Relay, biên dịch NAT/PAT, NTP và Syslog.',
    icon: 'Server',
    color: '#10b981',
    topicCount: 4
  },
  {
    id: 'cat-5',
    name: 'Bảo Mật Mạng (Security)',
    slug: 'security-fundamentals',
    description: 'Khái niệm bảo mật, Port Security, Access Control Lists (Standard/Extended ACL), AAA và WPA3.',
    icon: 'ShieldCheck',
    color: '#ef4444',
    topicCount: 3
  },
  {
    id: 'cat-6',
    name: 'Tự Động Hóa (Automation)',
    slug: 'automation',
    description: 'Kiến trúc Controller, Cisco DNA Center, REST API, cấu trúc JSON và Ansible.',
    icon: 'Cpu',
    color: '#f97316',
    topicCount: 2
  }
];

export const initialTopics = [
  {
    id: 'top-vlan',
    categoryId: 'cat-2',
    categoryName: 'Truy Cập Mạng (Network Access)',
    title: 'Nguyên Lý & Cấu Hình VLAN',
    slug: 'vlan-fundamentals',
    description: 'Phân chia broadcast domain, tạo VLAN trên Switch Cisco và gán cổng Access Port.',
    difficulty: 'Intermediate',
    lessonCount: 3
  },
  {
    id: 'top-trunking',
    categoryId: 'cat-2',
    categoryName: 'Truy Cập Mạng (Network Access)',
    title: '802.1Q Trunking & Native VLAN',
    slug: '8021q-trunking',
    description: 'Giao thức DTP, gán nhãn VLAN 802.1Q, bảo mật Native VLAN và cấu hình allowed vlan.',
    difficulty: 'Intermediate',
    lessonCount: 2
  },
  {
    id: 'top-stp',
    categoryId: 'cat-2',
    categoryName: 'Truy Cập Mạng (Network Access)',
    title: 'Giao Thức Chống Vòng Lặp Spanning Tree (STP)',
    slug: 'spanning-tree-protocol',
    description: 'Bầu chọn Root Bridge, BPDU, các trạng thái cổng STP (Root, Designated, Blocking) và PortFast.',
    difficulty: 'Advanced',
    lessonCount: 3
  },
  {
    id: 'top-ospf',
    categoryId: 'cat-3',
    categoryName: 'Kết Nối IP (IP Connectivity)',
    title: 'Định Tuyến Động Single-Area OSPFv2',
    slug: 'single-area-ospfv2',
    description: 'Thuật toán Link-State, thiết lập láng giềng OSPF, Hello/Dead timers, tính Cost và Wildcard mask.',
    difficulty: 'Intermediate',
    lessonCount: 3
  },
  {
    id: 'top-nat',
    categoryId: 'cat-4',
    categoryName: 'Dịch Vụ IP (IP Services)',
    title: 'Biên Dịch Địa Chỉ Mạng NAT & PAT',
    slug: 'nat-pat',
    description: 'Static NAT, Dynamic NAT, Port Address Translation (NAT Overload) và kiểm tra bảng biên dịch.',
    difficulty: 'Intermediate',
    lessonCount: 2
  },
  {
    id: 'top-acl',
    categoryId: 'cat-5',
    categoryName: 'Bảo Mật Mạng (Security)',
    title: 'Tường Lửa Access Control Lists (ACLs)',
    slug: 'access-control-lists',
    description: 'Standard vs Extended ACLs, nguyên lý Implicit Deny, tính toán Wildcard mask và vị trí áp dụng.',
    difficulty: 'Intermediate',
    lessonCount: 3
  }
];

export const initialLessons = [
  {
    id: 'les-vlan-1',
    topicId: 'top-vlan',
    topicTitle: 'Nguyên Lý & Cấu Hình VLAN',
    categoryName: 'Truy Cập Mạng',
    title: 'Khái Niệm VLAN & Cấu Hình Switch Port Access',
    slug: 'vlan-concepts-config',
    summary: 'Hiểu bản chất VLAN: Tại sao cần chia nhỏ broadcast domain, tạo VLAN trên Switch Cisco và gán cổng Access Port.',
    difficulty: 'Intermediate',
    status: 'Understood',
    isFavorite: true,
    readTimeMinutes: 12,
    tags: ['VLAN', 'Layer2', 'Switching', 'CiscoIOS', 'CCNA'],
    sections: [
      {
        id: 'sec-1',
        title: '1. Định Nghĩa & Mục Đích Của VLAN',
        blocks: [
          {
            id: 'b-1',
            type: 'paragraph',
            content: 'VLAN (Virtual Local Area Network) là một mạng LAN ảo giúp phân chia logic một Switch vật lý thành nhiều miền quảng bá (broadcast domain) độc lập. Các thiết bị thuộc các VLAN khác nhau không thể giao tiếp trực tiếp ở Layer 2 nếu không qua Router/L3 Switch.'
          },
          {
            id: 'b-2',
            type: 'important',
            title: 'Lợi Ích Cốt Lõi Khi Thi CCNA',
            content: 'VLAN tăng cường bảo mật mạng, ngăn ngừa nghẽn mạng do Broadcast Storm, tối ưu hóa quản lý theo phòng ban (Ví dụ: VLAN 10 SALES, VLAN 20 ADMIN).'
          }
        ]
      },
      {
        id: 'sec-2',
        title: '2. Các Bước Cấu Hình VLAN Trên Cisco IOS',
        blocks: [
          {
            id: 'b-3',
            type: 'paragraph',
            content: 'Để cấu hình VLAN trên Switch Cisco Catalyst, truy cập mode Global Configuration, tạo VLAN ID, đặt tên và gán giao diện vật lý thành Access Port.'
          },
          {
            id: 'b-4',
            type: 'cisco-command',
            title: 'Cấu hình Tạo VLAN 10 và Gán Cổng Fa0/1',
            content: `SW1# configure terminal
SW1(config)# vlan 10
SW1(config-vlan)# name SALES
SW1(config-vlan)# exit
SW1(config)# interface FastEthernet0/1
SW1(config-if)# switchport mode access
SW1(config-if)# switchport access vlan 10
SW1(config-if)# no shutdown
SW1(config-if)# end`
          },
          {
            id: 'b-5',
            type: 'verification',
            title: 'Lệnh Kiểm Tra VLAN Active',
            content: `SW1# show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/2, Fa0/3, Fa0/4, Fa0/5
10   SALES                            active    Fa0/1
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup`
          }
        ]
      },
      {
        id: 'sec-3',
        title: '3. Lỗi Thường Gặp Khi Cấu Hình',
        blocks: [
          {
            id: 'b-6',
            type: 'warning',
            title: 'Lưu Ý Tên VLAN Mặc Định',
            content: 'Nếu gán `switchport access vlan 20` mà chưa tạo VLAN 20 trước, Cisco IOS sẽ tự động tạo VLAN 20 nhưng đặt tên mặc định là `VLAN0020`. Luôn tạo và đặt tên rõ ràng cho VLAN!'
          }
        ]
      }
    ],
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-25T14:30:00Z'
  }
];

export const initialCommands = [
  {
    id: 'cmd-show-vlan-brief',
    command: 'show vlan brief',
    title: 'Kiểm Tra Bảng Tóm Tắt Tất Cả VLAN',
    description: 'Hiển thị danh sách VLAN đang hoạt động trên Switch, trạng thái active/shutdown và danh sách cổng Access Port tương ứng.',
    category: 'VLAN',
    device: 'Cisco L2 Switch',
    mode: 'Privileged EXEC',
    syntax: 'show vlan brief',
    parameters: 'Không có. Có thể thêm `id <vlan-id>` để xem riêng 1 VLAN.',
    example: 'SW1# show vlan brief',
    expectedOutput: `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/2, Fa0/3, Fa0/4
10   SALES                            active    Fa0/1
20   ENGINEERING                      active    Fa0/5, Fa0/6`,
    explanation: 'Lệnh kiểm tra quan trọng hàng đầu để xác nhận cổng Access đã được gán đúng VLAN chưa.',
    verificationCommand: 'show vlan id 10',
    commonErrors: 'VLAN hiển thị trạng thái "act/lshut" nếu bị shutdown thủ công.',
    importantNotes: 'Lệnh này KHÔNG hiển thị cổng Trunk! Cổng Trunk cần kiểm tra bằng lệnh `show interfaces trunk`.',
    tags: ['VLAN', 'KiểmTra', 'Layer2', 'CơBản'],
    isFavorite: true,
    difficulty: 'Beginner',
    createdAt: '2026-09-15T08:00:00Z'
  },
  {
    id: 'cmd-show-interfaces-trunk',
    command: 'show interfaces trunk',
    title: 'Kiểm Tra Các Cổng Trunking 802.1Q',
    description: 'Hiển thị tất cả các cổng Trunk đang hoạt động, chuẩn đóng gói 802.1Q, Native VLAN ID, danh sách VLAN được phép truyền qua (allowed vlan).',
    category: 'Trunk',
    device: 'Cisco L2 Switch',
    mode: 'Privileged EXEC',
    syntax: 'show interfaces trunk',
    parameters: 'Không có.',
    example: 'SW1# show interfaces trunk',
    expectedOutput: `Port        Mode         Encapsulation  Status        Native vlan
Fa0/24      on           802.1q         trunking      99

Port        Vlans allowed on trunk
Fa0/24      10,20,30,99`,
    explanation: 'Kiểm tra trạng thái đường Trunk giữa các Switch và chẩn đoán lỗi lệch Native VLAN.',
    verificationCommand: 'show interface Fa0/24 switchport',
    commonErrors: 'Lệch Native VLAN giữa 2 đầu dây sẽ sinh ra thông báo lỗi CDP (%CDP-4-NATIVE_VLAN_MISMATCH).',
    importantNotes: 'Luôn đảm bảo Native VLAN giống nhau ở cả 2 đầu liên kết Trunk!',
    tags: ['Trunk', '802.1Q', 'KiểmTra', 'SựCố'],
    isFavorite: true,
    difficulty: 'Intermediate',
    createdAt: '2026-09-16T09:30:00Z'
  }
];

export const initialTemplates = [
  {
    id: 'tpl-basic-switch',
    title: 'Cấu Hình Chuẩn Baseline Cho Switch Cisco L2',
    category: 'Basic',
    purpose: 'Cấu hình bảo mật và quản lý ban đầu: Hostname, mật khẩu Enable Secret, tạo User Admin, bật SSHv2, IP quản lý VLAN 99.',
    topologyAssumptions: 'Switch SW1 kết nối tới Gateway quản lý IP 192.168.1.1.',
    configuration: `hostname SW1
!
no ip domain-lookup
ip domain-name ccnamastery.lab
crypto key generate rsa general-keys modulus 2048
!
enable secret Cisco123!
username admin privilege 15 secret AdminPass123!
!
vlan 99
 name MANAGEMENT
!
interface vlan 99
 ip address 192.168.1.10 255.255.255.0
 no shutdown
!
ip default-gateway 192.168.1.1
!
line con 0
 logging synchronous
 login local
!
line vty 0 15
 transport input ssh
 login local
!
service password-encryption
end
write memory`,
    explanation: 'Thiết lập quản lý an toàn qua SSH, tắt Telnet, bảo vệ mật khẩu cấu hình và gán IP quản lý.',
    verification: 'show ip interface brief | include Vlan99\nshow ip ssh',
    expectedResult: 'Bật thành công SSH v2, ping thành công tới Gateway 192.168.1.1.',
    tags: ['Baseline', 'Switching', 'BảoMật', 'SSH']
  }
];

export const initialLabs = [
  {
    id: 'lab-basic-vlan-trunk',
    title: 'Bài Lab 1: Cấu Hình VLAN & 802.1Q Trunking',
    description: 'Cấu hình VLAN 10 (USERS) và VLAN 20 (ADMIN) trên 2 Switch SW1 & SW2 nối với nhau qua cổng Trunk Fa0/24. Kiểm tra khả năng ping thông nội bộ VLAN và cô lập giữa các VLAN.',
    difficulty: 'Intermediate',
    status: 'In Progress',
    topology: {
      nodes: [
        { id: 'pc1', label: 'PC1 (VLAN 10)', type: 'PC', x: 80, y: 80, ip: '10.10.10.10/24' },
        { id: 'pc2', label: 'PC2 (VLAN 20)', type: 'PC', x: 80, y: 220, ip: '10.10.20.10/24' },
        { id: 'sw1', label: 'SW1 (Access)', type: 'Cisco L2 Switch', x: 260, y: 150 },
        { id: 'sw2', label: 'SW2 (Access)', type: 'Cisco L2 Switch', x: 480, y: 150 },
        { id: 'pc3', label: 'PC3 (VLAN 10)', type: 'PC', x: 660, y: 80, ip: '10.10.10.20/24' },
        { id: 'pc4', label: 'PC4 (VLAN 20)', type: 'PC', x: 660, y: 220, ip: '10.10.20.20/24' }
      ],
      links: [
        { from: 'pc1', to: 'sw1', label: 'Fa0/1' },
        { from: 'pc2', to: 'sw1', label: 'Fa0/2' },
        { from: 'sw1', to: 'sw2', label: 'Fa0/24 (Trunk)' },
        { from: 'sw2', to: 'pc3', label: 'Fa0/1' },
        { from: 'sw2', to: 'pc4', label: 'Fa0/2' }
      ]
    },
    objective: 'Tạo VLAN 10 & 20, gán cổng Access Fa0/1 và Fa0/2 trên SW1 & SW2, cấu hình đường Trunk Fa0/24 với Native VLAN 99, kiểm tra PC1 ping thông PC3.',
    devices: ['SW1 (Cisco 2960)', 'SW2 (Cisco 2960)', 'PC1', 'PC2', 'PC3', 'PC4'],
    ipAddressingTable: [
      { device: 'PC1', interfaceName: 'ETH0', ipAddress: '10.10.10.10', subnetMask: '255.255.255.0', vlan: '10' },
      { device: 'PC2', interfaceName: 'ETH0', ipAddress: '10.10.20.10', subnetMask: '255.255.255.0', vlan: '20' },
      { device: 'PC3', interfaceName: 'ETH0', ipAddress: '10.10.10.20', subnetMask: '255.255.255.0', vlan: '10' },
      { device: 'PC4', interfaceName: 'ETH0', ipAddress: '10.10.20.20', subnetMask: '255.255.255.0', vlan: '20' }
    ],
    vlanTable: [
      { vlanId: 10, name: 'USERS', ports: 'SW1 Fa0/1, SW2 Fa0/1', subnet: '10.10.10.0/24' },
      { vlanId: 20, name: 'ADMIN', ports: 'SW1 Fa0/2, SW2 Fa0/2', subnet: '10.10.20.0/24' },
      { vlanId: 99, name: 'NATIVE', ports: 'SW1 Fa0/24, SW2 Fa0/24', subnet: '10.10.99.0/24' }
    ],
    requirements: [
      'Tạo VLAN 10 (USERS) và VLAN 20 (ADMIN) trên SW1 và SW2',
      'Cấu hình cổng Fa0/1 thành Access Port thuộc VLAN 10',
      'Cấu hình cổng Fa0/2 thành Access Port thuộc VLAN 20',
      'Cấu hình Fa0/24 thành liên kết Trunking 802.1Q với Native VLAN 99'
    ],
    steps: [
      { stepNumber: 1, title: 'Tạo VLAN trên SW1 & SW2', instruction: 'Truy cập mode global config để tạo VLAN 10 và 20.', expectedCommand: 'vlan 10 -> name USERS', completed: true },
      { stepNumber: 2, title: 'Cấu hình Cổng Access Port', instruction: 'Gán Fa0/1 vào VLAN 10 và Fa0/2 vào VLAN 20.', expectedCommand: 'switchport mode access -> switchport access vlan 10', completed: true },
      { stepNumber: 3, title: 'Cấu hình Đường Trunking', instruction: 'Chuyển cổng Fa0/24 sang mode trunk và set Native VLAN 99.', expectedCommand: 'switchport mode trunk -> switchport trunk native vlan 99', completed: false }
    ],
    configurations: [
      {
        device: 'SW1',
        config: `hostname SW1
vlan 10
 name USERS
vlan 20
 name ADMIN
vlan 99
 name NATIVE
!
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
!
interface FastEthernet0/2
 switchport mode access
 switchport access vlan 20
!
interface FastEthernet0/24
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk native vlan 99`
      }
    ],
    verification: 'SW1# show interfaces trunk\nSW1# show vlan brief',
    expectedResults: 'PC1 ping thông PC3 (cùng VLAN 10, tỷ lệ 100%). PC1 ping PC2 thất bại vì chưa cấu hình Inter-VLAN Routing.',
    mistakes: 'Quên tạo VLAN 10 trên SW2. SW2 vẫn nhận gói tin gắn nhãn VLAN 10 nhưng hủy gói tin (drop) vì VLAN 10 không tồn tại trong cơ sở dữ liệu của SW2.',
    isFavorite: true,
    createdAt: '2026-09-21T08:00:00Z',
    updatedAt: '2026-09-26T16:00:00Z'
  }
];

export const initialExercises = [
  {
    id: 'ex-stp-root-primary',
    title: 'Bài Tập: Chọn Lệnh Đặt SW1 Làm Primary Root Bridge STP',
    category: 'STP',
    question: 'Bạn cần cấu hình Switch SW1 đảm bảo luôn trở thành Root Bridge cho VLAN 10 và VLAN 20. Chọn câu lệnh cấu hình phù hợp nhất trên Cisco IOS?',
    scenario: 'SW1 là Core Switch nối với SW2 và SW3. Priority STP mặc định trên tất cả Switch là 32768.',
    requirements: ['Ép Priority thấp hơn mặc định 32768', 'Áp dụng đồng thời cho cả VLAN 10 và 20'],
    hints: ['Sử dụng lệnh macro `spanning-tree vlan ... root primary` hoặc gán priority thủ công.'],
    solution: 'spanning-tree vlan 10,20 root primary\nHOẶC\nspanning-tree vlan 10,20 priority 24576',
    explanation: 'Lệnh `spanning-tree vlan 10,20 root primary` sẽ kiểm tra priority của Root Bridge hiện tại và tự động hạ priority của SW1 xuống 24576 (hoặc thấp hơn 4096) để SW1 chiến thắng bầu chọn.',
    difficulty: 'Intermediate',
    tags: ['STP', 'Switching', 'RootBridge'],
    isCompleted: true,
    userAnswer: 'spanning-tree vlan 10,20 root primary',
    createdAt: '2026-09-24T11:00:00Z'
  }
];

export const initialQuizzes = [
  {
    id: 'quiz-ccna-l2',
    title: 'Bài Trắc Nghiệm: Layer 2 Switching & VLAN',
    category: 'Truy Cập Mạng',
    description: 'Kiểm tra kiến thức về VLAN, đàm phán DTP, cấu trúc khung 802.1Q và trạng thái STP.',
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'VLAN mặc định và Native VLAN mặc định trên Switch Cisco Catalyst chưa cấu hình là VLAN nào?',
        options: ['VLAN 0', 'VLAN 1', 'VLAN 10', 'VLAN 99'],
        correctAnswer: 'VLAN 1',
        explanation: 'Tất cả các cổng trên Switch Cisco mặc định đều thuộc VLAN 1 khi xuất xưởng.'
      },
      {
        id: 'q2',
        type: 'true-false',
        question: 'Chuẩn đóng gói 802.1Q bổ sung một trường Header Tag 4-byte vào khung Ethernet ban đầu.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Chính xác. 802.1Q chèn nhãn 4-byte chứa VLAN ID (12-bit) vào giữa trường Source Address và Type/Length.'
      }
    ]
  }
];

export const initialFlashcards = [
  {
    id: 'fc-1',
    front: 'Lệnh nào hiển thị bảng địa chỉ MAC (MAC Address Table) trên Switch Cisco?',
    back: 'show mac address-table',
    category: 'Truy Cập Mạng',
    tags: ['Layer2', 'MAC', 'CiscoIOS'],
    interval: 3,
    easeFactor: 2.5,
    repetitions: 2,
    dueDate: new Date().toISOString(),
    isFavorite: true,
    createdAt: '2026-09-15T10:00:00Z'
  },
  {
    id: 'fc-2',
    front: 'Chỉ số Administrative Distance (AD) mặc định của tuyến định tuyến tĩnh (Static Route) là bao nhiêu?',
    back: '1',
    category: 'Kết Nối IP',
    tags: ['StaticRoute', 'AD', 'Routing'],
    interval: 1,
    easeFactor: 2.5,
    repetitions: 1,
    dueDate: new Date().toISOString(),
    isFavorite: false,
    createdAt: '2026-09-16T10:00:00Z'
  }
];

export const initialNotes = [
  {
    id: 'note-native-vlan-mismatch',
    title: 'Hiện Tượng & Cách Khắc Phục Lệch Native VLAN',
    category: 'Important',
    content: `Khi Native VLAN ID ở 2 đầu đường Trunk 802.1Q không giống nhau (Ví dụ: SW1 Fa0/24 dùng Native VLAN 99, SW2 Fa0/24 dùng Native VLAN 1):

1. Thông báo cảnh báo %CDP-4-NATIVE_VLAN_MISMATCH xuất hiện liên tục trên Console.
2. Giao thức STP sẽ khóa cổng để ngăn ngừa vòng lặp broadcast.
3. Gói tin không gắn nhãn gửi từ SW1 thuộc VLAN 99 sẽ bị SW2 nhận nhầm vào VLAN 1!

CÁCH SỬA: Đảm bảo cả 2 đầu Switch chạy lệnh:
SW1(config-if)# switchport trunk native vlan 99
SW2(config-if)# switchport trunk native vlan 99`,
    tags: ['NativeVLAN', 'Trunk', 'CDP', 'MeoThiCCNA'],
    isFavorite: true,
    createdAt: '2026-09-22T14:20:00Z',
    updatedAt: '2026-09-25T11:00:00Z'
  }
];

export const initialTroubleshootingEntries = [
  {
    id: 'tb-dhcp-relay-missing',
    title: 'Sự Cố: Máy PC thuộc VLAN 20 Không Nhận Được IP Từ DHCP Server',
    symptoms: 'PC2 cắm vào cổng SW1 Fa0/2 (VLAN 20) bị nhận IP APIPA (169.254.x.x). DHCP Server nằm trên Router R1 ở VLAN 10 (10.10.10.1).',
    topology: 'PC2 (VLAN 20) -> SW1 -> Router R1 (Sub-interface G0/0.20 cho VLAN 20, G0/0.10 cho VLAN 10 chứa DHCP Pool).',
    expectedBehavior: 'PC2 nhận được IP 10.10.20.100/24 từ DHCP Pool.',
    actualBehavior: 'Gói tin DHCP Discover bị timeout. ipconfig hiển thị 169.254.14.89.',
    commandsChecked: [
      'ipconfig /renew',
      'show ip dhcp binding (trên R1)',
      'show interfaces GigabitEthernet 0/0.20 (trên R1)'
    ],
    commandOutput: 'R1# show ip dhcp binding\n(Không có IP nào được cấp cho mạng 10.10.20.0)',
    possibleCauses: [
      'Chưa cấu hình DHCP Pool trên R1',
      'Sub-interface G0/0.20 bị shutdown',
      'Thiếu lệnh ip helper-address trên Sub-interface G0/0.20'
    ],
    rootCause: 'DHCP Discover là gói tin Quảng bá Layer 2 (255.255.255.255). Sub-interface G0/0.20 của Router chặn gói tin broadcast và không chuyển tiếp sang DHCP Server.',
    solution: `Cấu hình IP Helper Address trên sub-interface G0/0.20 của R1:

R1(config)# interface GigabitEthernet0/0.20
R1(config-subif)# ip helper-address 10.10.10.1
R1(config-subif)# end`,
    lessonsLearned: 'Router chặn broadcast mặc định. Lệnh `ip helper-address` đóng vai trò DHCP Relay Agent giúp chuyển gói broadcast UDP (DHCP port 67/68) thành unicast tới IP Server.',
    tags: ['DHCP', 'IPServices', 'SuCo', 'IPHelper'],
    createdAt: '2026-09-23T15:30:00Z',
    updatedAt: '2026-09-23T15:30:00Z'
  }
];

export const initialProgressStats = {
  totalTopics: 18,
  lessonsCompleted: 14,
  totalLessons: 24,
  commandsSaved: 42,
  labsCompleted: 5,
  totalLabs: 12,
  flashcardsDue: 3,
  exercisesCompleted: 8,
  totalExercises: 15,
  notesCreated: 19,
  studyStreak: 7,
  categoryProgress: [
    { categoryName: 'Căn Bản Mạng (Fundamentals)', completedPercentage: 85, completedLessons: 6, totalLessons: 7 },
    { categoryName: 'Truy Cập Mạng (Network Access)', completedPercentage: 70, completedLessons: 5, totalLessons: 7 },
    { categoryName: 'Kết Nối IP (IP Connectivity)', completedPercentage: 60, completedLessons: 3, totalLessons: 5 },
    { categoryName: 'Dịch Vụ IP (IP Services)', completedPercentage: 40, completedLessons: 2, totalLessons: 5 }
  ],
  weeklyActivity: [
    { day: 'T2', hours: 2.5, itemsCompleted: 4 },
    { day: 'T3', hours: 1.8, itemsCompleted: 3 },
    { day: 'T4', hours: 3.0, itemsCompleted: 6 },
    { day: 'T5', hours: 2.2, itemsCompleted: 5 },
    { day: 'T6', hours: 1.5, itemsCompleted: 2 },
    { day: 'T7', hours: 4.0, itemsCompleted: 8 },
    { day: 'CN', hours: 3.5, itemsCompleted: 7 }
  ]
};
