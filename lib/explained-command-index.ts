import { CiscoCommand, Lesson, PersonalNote, Topology } from './types';

export interface ExplainedCiscoCommand {
  command: string;
  explanation: string;
  category: string;
  sources: string[];
  tags: string[];
}

type CommandSource = { title: string; type: string; content: string; tags?: string[]; trustedCli?: boolean };

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
    /^passive-interface\s+(?:default|[\w./]+)$/i,
    /^standby\s+\d+\s+(?:ip\s+[\d.]+|priority\s+\d+|preempt(?:\s+.*)?|track\s+\d+(?:\s+decrement\s+\d+)?|timers\s+.+|authentication\s+.+)$/i,
    /^access-list\s+\d+\s+(?:permit|deny)\s+.+$/i,
    /^ip\s+access-list\s+(?:standard|extended)\s+\S+$/i,
    /^(?:permit|deny)\s+(?:ip|tcp|udp|icmp|\d{1,3})\s+.+$/i,
    /^line\s+(?:console|vty|aux)\s+[\d -]+$/i,
    /^(?:login|login\s+local|transport\s+input\s+[\w -]+|exec-timeout\s+\d+\s+\d+|password\s+\S+|secret\s+\S+)$/i,
    /^(?:service password-encryption|ip domain-name\s+\S+|crypto key generate rsa(?:\s+.+)?|ip ssh version\s+\d+|banner motd\s+.+)$/i,
    /^show\s+(?:running-config|startup-config|version|ip\s+(?:interface\s+brief|route|protocols|ospf\s+neighbor|nat\s+translations)|interfaces?(?:\s+(?:status|trunk|description|switchport|port-channel|[\w./-]+))?|vlan\s+brief|spanning-tree(?:\s+vlan\s+\d+)?|etherchannel\s+summary|mac\s+address-table|arp|standby(?:\s+brief)?|track|access-lists?|cdp\s+neighbors?(?:\s+detail)?|lldp\s+neighbors?|flash|inventory|clock|users|logging|processes|controllers)\b.*$/i,
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
      const command = isCiscoCommand(line, true);
      if (command) found.push(command);
    }
  }
  const plain = decodeHtml(source).replace(/\r/g, '\n');
  for (const line of plain.split('\n')) {
    const command = isCiscoCommand(line, trustedCli);
    if (command) found.push(command);
  }
  return found;
}

function explain(command: string): { explanation: string; category: string } {
  const value = command.toLowerCase();
  const rules: Array<[RegExp, string, string]> = [
    [/^enable$/, 'Chuyển sang chế độ EXEC đặc quyền (dấu #), nơi có thể xem trạng thái và cấu hình thiết bị.', 'Cơ bản'],
    [/^disable$/, 'Trở về chế độ EXEC người dùng (dấu >), giới hạn các lệnh quản trị.', 'Cơ bản'],
    [/^end$/, 'Thoát mọi cấp cấu hình và quay thẳng về dấu #.', 'Cơ bản'],
    [/^exit$/, 'Lùi khỏi chế độ hiện tại một cấp; trong cấu hình interface, lệnh này quay về config toàn cục.', 'Cơ bản'],
    [/^logout$/, 'Đóng phiên CLI hiện tại.', 'Cơ bản'],
    [/^(?:configure terminal|conf t)$/, 'Từ dấu # vào cấu hình toàn cục (config)#; các lệnh sau đây sẽ thay đổi thiết bị.', 'Cơ bản'],
    [/^hostname\s+/, `Đặt tên thiết bị thành ${command.split(/\s+/).slice(1).join(' ')}.`, 'Cơ bản'],
    [/^enable secret\s+/, 'Đặt mật khẩu bí mật để bảo vệ quyền truy cập chế độ enable.', 'Bảo mật'],
    [/^interface\s+range\s/, 'Chọn nhiều cổng cùng lúc để áp dụng chung một cấu hình.', 'Interface'],
    [/^interface(?:\s|$)|^int\s/, 'Chọn cổng hoặc interface logic; các lệnh tiếp theo chỉ áp dụng cho interface này.', 'Interface'],
    [/^vlan\s+/, `Tạo hoặc mở VLAN ${command.split(/\s+/)[1]}; lệnh này chưa tự gán cổng vào VLAN.`, 'VLAN'],
    [/^name\s+/, 'Đặt tên dễ nhận biết cho VLAN đang cấu hình.', 'VLAN'],
    [/^default-router\s+/, 'Khai báo default gateway sẽ được gửi cho máy khách DHCP.', 'DHCP'],
    [/^dns-server\s+/, 'Khai báo máy chủ DNS sẽ được cấp cho máy khách DHCP.', 'DHCP'],
    [/^lease\s+/, 'Đặt thời hạn máy khách được giữ địa chỉ IP do DHCP cấp.', 'DHCP'],
    [/^description\s+/, 'Ghi chú mục đích hoặc thiết bị ở đầu xa của interface đang cấu hình.', 'Interface'],
    [/^switchport\s+mode\s+access$/, 'Đặt cổng switch ở chế độ access để kết nối một thiết bị đầu cuối trong một VLAN.', 'Switching'],
    [/^switchport\s+access\s+vlan\s+/, `Gán cổng access vào VLAN ${command.split(/\s+/).at(-1)}.`, 'VLAN'],
    [/^switchport\s+mode\s+trunk$/, 'Đặt cổng ở chế độ trunk để mang lưu lượng của nhiều VLAN.', 'Trunk'],
    [/^switchport\s+trunk\s+allowed\s+vlan\s+/, 'Chỉ định hoặc cập nhật danh sách VLAN được phép đi qua đường trunk.', 'Trunk'],
    [/^switchport\s+trunk\s+native\s+vlan\s+/, `Đặt VLAN ${command.split(/\s+/).at(-1)} làm native VLAN; frame không gắn thẻ sẽ thuộc VLAN này.`, 'Trunk'],
    [/^switchport\s+voice\s+vlan\s+/, 'Gán VLAN thoại cho điện thoại IP kết nối qua cổng switch.', 'VLAN'],
    [/^switchport\s+port-security\s+mac-address\s+sticky$/, 'Học MAC đang kết nối và đưa địa chỉ đó vào cấu hình port-security của cổng.', 'Port Security'],
    [/^switchport\s+port-security\s+maximum\s+/, 'Giới hạn số lượng địa chỉ MAC được phép học trên cổng.', 'Port Security'],
    [/^switchport\s+port-security\s+violation\s+/, 'Chọn cách xử lý khi số MAC hoặc MAC được phép trên cổng bị vi phạm.', 'Port Security'],
    [/^switchport\s+port-security$/, 'Bật Port Security trên cổng access để giới hạn thiết bị được kết nối.', 'Port Security'],
    [/^spanning-tree\s+mode\s+rapid-pvst$/, 'Bật Rapid-PVST+, chạy một cây spanning tree riêng cho từng VLAN với hội tụ nhanh.', 'STP'],
    [/^spanning-tree\s+vlan\s+.+\s+root\s+primary$/, 'Yêu cầu switch trở thành root bridge ưu tiên cho các VLAN được chỉ định.', 'STP'],
    [/^spanning-tree\s+vlan\s+.+\s+root\s+secondary$/, 'Đặt switch làm root bridge dự phòng cho các VLAN được chỉ định.', 'STP'],
    [/^spanning-tree\s+portfast/, 'Cho cổng kết nối thiết bị đầu cuối chuyển nhanh sang trạng thái forwarding; chỉ bật trên cổng access phù hợp.', 'STP'],
    [/^spanning-tree\s+bpduguard\s+enable$/, 'Đưa cổng vào trạng thái err-disabled nếu nhận BPDU, giúp bảo vệ cổng edge khỏi switch lạ.', 'Bảo mật'],
    [/^spanning-tree\s+vlan\s+.+\s+priority\s+/, 'Đặt STP bridge priority cho VLAN; giá trị thấp hơn có lợi thế được bầu làm root bridge.', 'STP'],
    [/^spanning-tree\s+cost\s+/, 'Đặt STP path cost trên cổng để điều khiển đường đi được chọn tới root bridge.', 'STP'],
    [/^spanning-tree\s+port-priority\s+/, 'Đặt STP port priority để phân xử khi nhiều cổng có cùng cost tới root bridge.', 'STP'],
    [/^channel-group\s+\d+\s+mode\s+(?:active|passive)$/, 'Tham gia cổng vào EtherChannel bằng LACP; active khởi tạo thương lượng, passive chờ phía kia.', 'EtherChannel'],
    [/^channel-group\s+\d+\s+mode\s+(?:auto|desirable)$/, 'Tham gia EtherChannel bằng PAgP; desirable chủ động thương lượng, auto chờ phía kia.', 'EtherChannel'],
    [/^ip\s+routing$/, 'Bật chức năng định tuyến IPv4 trên switch Layer 3.', 'Routing'],
    [/^ip\s+address\s+/, 'Gán địa chỉ IPv4 và subnet mask cho interface đang cấu hình; cổng cũng cần hoạt động để chuyển tiếp lưu lượng.', 'IPv4'],
    [/^ip\s+route\s+/, `Thêm tuyến tĩnh: đích ${command.split(/\s+/)[2]} ${command.split(/\s+/)[3]} được gửi tới next-hop/interface kế tiếp.`, 'Routing'],
    [/^ip\s+nat\s+inside\s+source\s+.+\s+overload$/, 'Bật PAT: nhiều địa chỉ nội bộ dùng chung địa chỉ IP ngoài bằng cách phân biệt cổng.', 'NAT/PAT'],
    [/^ip\s+nat\s+inside\s+source\s+/, 'Tạo luật NAT ánh xạ địa chỉ nguồn mạng trong ra mạng ngoài.', 'NAT/PAT'],
    [/^ip\s+access-group\s+/, 'Áp dụng ACL lên interface theo chiều vào (in) hoặc ra (out).', 'ACL'],
    [/^router\s+ospf\s+/, `Vào cấu hình OSPFv2 process ${command.split(/\s+/)[2]}; process ID chỉ cần nhất quán trong chính router này.`, 'OSPF'],
    [/^network\s+.+\s+area\s+/, `Đưa interface khớp địa chỉ và wildcard mask vào OSPF area ${command.match(/\sarea\s+(\S+)/i)?.[1] || 'được chọn'}.`, 'OSPF'],
    [/^passive-interface\s+/, 'Ngừng gửi gói cập nhật định tuyến trên interface đó nhưng vẫn quảng bá mạng của interface.', 'Routing'],
    [/^ip\s+dhcp\s+excluded-address/, 'Loại trừ địa chỉ hoặc dải địa chỉ khỏi DHCP pool để tránh cấp phát cho thiết bị cần IP cố định.', 'DHCP'],
    [/^ip\s+dhcp\s+pool\s+/, 'Tạo DHCP pool và chuyển vào cấu hình các tùy chọn cấp phát địa chỉ.', 'DHCP'],
    [/^ip\s+dhcp\s+helper-address\s+/, 'Chuyển tiếp yêu cầu DHCP broadcast tới máy chủ DHCP nằm ở mạng khác.', 'DHCP'],
    [/^network\s+[\d.]+\s+[\d.]+$/i, 'Khai báo mạng và subnet mask sẽ được DHCP pool cấp phát.', 'DHCP'],
    [/^default-router\s+/, 'Khai báo default gateway sẽ được gửi cho máy khách DHCP.', 'DHCP'],
    [/^ip\s+nat\s+inside$/, 'Đánh dấu interface phía mạng nội bộ để NAT/PAT xử lý lưu lượng đi ra.', 'NAT/PAT'],
    [/^ip\s+nat\s+outside$/, 'Đánh dấu interface phía mạng bên ngoài/ISP cho cấu hình NAT/PAT.', 'NAT/PAT'],
    [/^access-list\s+/, 'Tạo dòng ACL đánh giá lưu lượng theo điều kiện permit hoặc deny.', 'ACL'],
    [/^ip\s+access-list\s+/, 'Tạo ACL có tên ở chế độ cấu hình standard hoặc extended.', 'ACL'],
    [/^standby\s+\d+\s+ip\s+/, `Đặt gateway ảo ${command.split(/\s+/).at(-1)} cho nhóm HSRP ${command.split(/\s+/)[1]} trên interface.`, 'HSRP'],
    [/^standby\s+\d+\s+priority\s+/, 'Đặt mức ưu tiên HSRP; router có priority cao hơn sẽ có lợi thế làm Active.', 'HSRP'],
    [/^standby\s+\d+\s+preempt/, 'Cho router có priority cao hơn giành lại vai trò Active khi đủ điều kiện.', 'HSRP'],
    [/^standby\s+\d+\s+track\s+/, `Gắn nhóm HSRP ${command.split(/\s+/)[1]} với đối tượng track; khi đối tượng lỗi, priority giảm theo mức decrement đã đặt.`, 'HSRP'],
    [/^track\s+\d+\s+interface\s+/, 'Theo dõi trạng thái line-protocol của interface để dùng làm điều kiện cho HSRP hoặc cơ chế dự phòng.', 'High Availability'],
    [/^ip\s+sla\s+\d+$/, 'Tạo một phép đo IP SLA; thêm probe và lịch chạy để theo dõi khả năng tới đích.', 'High Availability'],
    [/^no\s+shutdown$/, 'Bỏ trạng thái tắt quản trị để bật interface; đường truyền vẫn cần kết nối và cấu hình đúng.', 'Interface'],
    [/^no\s+ip\s+address$/, 'Gỡ địa chỉ IPv4 khỏi interface; thường dùng trên cổng trunk Router-on-a-Stick.', 'Interface'],
    [/^no\s+switchport$/, 'Chuyển cổng switch Layer 3 thành routed port để gán IP và định tuyến trực tiếp.', 'Layer 3 Switch'],
    [/^no\s+ip\s+routing$/, 'Tắt chức năng định tuyến IPv4 trên switch Layer 3.', 'Routing'],
    [/^shutdown$/, 'Tắt interface ở mức quản trị.', 'Interface'],
    [/^copy\s+running-config\s+startup-config$|^copy\s+run\s+start$|^write\s+memory$/, 'Chép cấu hình RAM hiện tại vào startup-config để thiết bị giữ cấu hình sau lần khởi động tiếp theo.', 'Lưu cấu hình'],
    [/^write\s+erase$|^erase\s+startup-config$|^delete\s+flash:/, 'Xóa cấu hình lưu trên thiết bị; hãy xác nhận đúng thiết bị trước khi thực hiện.', 'Quản trị'],
    [/^reload$/, 'Khởi động lại thiết bị; cấu hình chưa lưu có thể bị mất.', 'Quản trị'],
    [/^show\s+vlan\s+brief$/, 'Hiển thị VLAN đã tạo cùng các cổng access đang được gán.', 'Kiểm tra'],
    [/^show\s+interfaces\s+trunk$/, 'Kiểm tra cổng trunk, native VLAN và danh sách VLAN đang được phép.', 'Kiểm tra'],
    [/^show\s+etherchannel\s+summary$/, 'Kiểm tra trạng thái các port-channel và cổng thành viên EtherChannel.', 'Kiểm tra'],
    [/^show\s+ip\s+interface\s+brief$/, 'Tóm tắt địa chỉ IP và trạng thái up/down của các interface.', 'Kiểm tra'],
    [/^show\s+ip\s+route$/, 'Hiển thị bảng định tuyến IPv4 và nguồn gốc của từng tuyến.', 'Kiểm tra'],
    [/^show\s+ip\s+protocols$/, 'Xem giao thức định tuyến đang chạy, network được quảng bá và thông số cập nhật.', 'Kiểm tra'],
    [/^show\s+ip\s+ospf\s+neighbor$/, 'Kiểm tra router OSPF láng giềng và trạng thái adjacency.', 'Kiểm tra'],
    [/^show\s+standby\s+brief$/, 'Tóm tắt nhóm HSRP, địa chỉ gateway ảo và trạng thái Active/Standby.', 'Kiểm tra'],
    [/^show\s+standby$/, 'Xem chi tiết timer, priority, trạng thái và router HSRP cùng nhóm.', 'Kiểm tra'],
    [/^show\s+track$/, 'Kiểm tra trạng thái up/down của các đối tượng đang được theo dõi.', 'Kiểm tra'],
    [/^show\s+spanning-tree/, 'Kiểm tra root bridge, vai trò/trạng thái cổng và bộ đếm STP.', 'Kiểm tra'],
    [/^show\s+mac\s+address-table$/, 'Tra MAC đã học, VLAN tương ứng và cổng switch đang kết nối thiết bị đó.', 'Kiểm tra'],
    [/^show\s+interfaces\s+status$/, 'Xem trạng thái, VLAN, duplex và speed của các cổng switch.', 'Kiểm tra'],
    [/^show\s+interfaces\s+description$/, 'Xem trạng thái up/down và description của từng interface.', 'Kiểm tra'],
    [/^show\s+interfaces\s+port-channel(?:\s+\d+)?$/, 'Xem trạng thái và bộ đếm lưu lượng của interface port-channel.', 'Kiểm tra'],
    [/^show\s+interfaces(?:\s+[\w./-]+)?$/, 'Xem trạng thái vật lý, lỗi và bộ đếm lưu lượng của interface.', 'Kiểm tra'],
    [/^show\s+running-config$/, 'Hiển thị cấu hình hiện đang hoạt động trong RAM.', 'Kiểm tra'],
    [/^show\s+startup-config$/, 'Hiển thị cấu hình sẽ được nạp khi thiết bị khởi động.', 'Kiểm tra'],
    [/^show\s+arp$/, 'Xem ánh xạ địa chỉ IPv4 sang địa chỉ MAC mà thiết bị đã học.', 'Kiểm tra'],
    [/^show\s+cdp\s+neighbors(?:\s+detail)?$/, 'Tìm thiết bị Cisco kết nối trực tiếp và cổng hai đầu; detail có thêm IP, model và phiên bản.', 'Kiểm tra'],
    [/^show\s+version$/, 'Xem model, phiên bản IOS, thời gian hoạt động và thông tin phần cứng.', 'Kiểm tra'],
    [/^show\s+ip\s+nat\s+translations$/, 'Hiển thị các ánh xạ NAT/PAT đang hoạt động.', 'Kiểm tra'],
    [/^show\s+access-lists?$/, 'Hiển thị nội dung ACL và bộ đếm các dòng permit/deny.', 'Kiểm tra'],
    [/^show\s+/, 'Hiển thị trạng thái hoặc cấu hình tương ứng để kiểm tra thiết bị.', 'Kiểm tra'],
    [/^ping\s+/, 'Gửi ICMP Echo để kiểm tra khả năng kết nối tới địa chỉ đích.', 'Kiểm tra'],
    [/^traceroute\s+/, 'Lần theo các hop Layer 3 trên đường tới địa chỉ đích.', 'Kiểm tra'],
    [/^encapsulation\s+dot1q\s+/, 'Gắn thẻ 802.1Q cho sub-interface để mang lưu lượng của VLAN chỉ định.', 'Router-on-a-Stick'],
    [/^pppoe(?:-client)?\s+/, 'Bật hoặc gắn cấu hình PPPoE trên interface/dialer để thiết lập kết nối WAN.', 'PPPoE'],
    [/^dialer\s+pool\s+/, 'Gán interface Dialer vào nhóm quay số PPPoE tương ứng.', 'PPPoE'],
    [/^ip\s+helper-address\s+/, 'Chuyển tiếp một số broadcast UDP, thường là DHCP, tới máy chủ ở mạng khác.', 'DHCP'],
    [/^line\s+(?:console|vty|aux)/, 'Chọn line quản trị console, VTY hoặc AUX để cấu hình truy cập.', 'Quản trị'],
    [/^transport\s+input\s+ssh$/, 'Chỉ cho phép SSH truy cập vào line VTY.', 'Bảo mật'],
    [/^username\s+/, 'Tạo tài khoản cục bộ; dùng kết hợp login local để xác thực quản trị.', 'Bảo mật'],
    [/^crypto\s+key\s+generate\s+rsa/, 'Tạo khóa RSA cần thiết để bật máy chủ SSH trên thiết bị Cisco.', 'Bảo mật'],
    [/^ip\s+domain-name\s+/, 'Đặt domain name, một điều kiện trước khi tạo khóa RSA cho SSH.', 'Bảo mật'],
    [/^ip\s+ssh\s+version\s+/, 'Chỉ định phiên bản SSH mà thiết bị sử dụng.', 'Bảo mật'],
    [/^service\s+password-encryption$/, 'Mã hóa dạng hiển thị của một số mật khẩu trong cấu hình.', 'Bảo mật']
  ];
  const match = rules.find(([pattern]) => pattern.test(value));
  if (match) return { explanation: match[1], category: match[2] };

  const category = /^(?:ip route|router|network|passive-interface|default-information)/i.test(command) ? 'Routing'
    : /^(?:switchport|spanning-tree|channel-|port-channel)/i.test(command) ? 'Switching'
    : /^(?:ip dhcp|default-router)/i.test(command) ? 'DHCP'
    : /^(?:standby|track|ip sla)/i.test(command) ? 'High Availability'
    : /^(?:ip nat)/i.test(command) ? 'NAT/PAT'
    : /^(?:show|ping|traceroute)/i.test(command) ? 'Kiểm tra'
    : 'Cisco IOS';
  return { explanation: `Lệnh ${command.split(/\s+/)[0]} cấu hình hoặc kiểm tra ${category.toLowerCase()}; các tham số phía sau xác định đối tượng và giá trị áp dụng.`, category };
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
    const common = { title: item.title || item.command, type: 'Lệnh Cisco', tags: [...(item.tags || []), item.category, item.device].filter(Boolean) };
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
    if (item.description) sources.push({ title: item.title, type: 'Mô hình mạng', content: item.description, tags });
    if (item.notes) sources.push({ title: item.title, type: 'Mô hình mạng', content: item.notes, tags });
  }
  for (const item of input.notes) if (item.content) sources.push({ title: item.title, type: 'Ghi chú', content: item.content, tags: item.tags || [] });

  const entries = new Map<string, ExplainedCiscoCommand>();
  for (const source of sources) {
    for (const command of commandsInText(source.content, source.trustedCli)) {
      const key = command.toLocaleLowerCase('en-US').replace(/\s+/g, ' ').trim();
      const existing = entries.get(key);
      if (existing) {
        if (!existing.sources.includes(`${source.type}: ${source.title}`)) existing.sources.push(`${source.type}: ${source.title}`);
        for (const tag of source.tags || []) if (tagApplies(tag, command, existing) && !existing.tags.includes(tag)) existing.tags.push(tag);
      } else {
        const details = explain(command);
        entries.set(key, { command, ...details, sources: [`${source.type}: ${source.title}`], tags: Array.from(new Set((source.tags || []).filter(tag => tagApplies(tag, command, details)))).slice(0, 8) });
      }
    }
  }
  return Array.from(entries.values());
}
