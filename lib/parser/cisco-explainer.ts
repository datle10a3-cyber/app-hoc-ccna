export interface LineExplanation {
  line: string;
  explanation: string;
  mode?: string;
  type?: 'prompt' | 'config' | 'comment' | 'command';
}

export function parseCiscoConfig(rawText: string): LineExplanation[] {
  const lines = rawText.split('\n');
  const results: LineExplanation[] = [];
  let currentMode = 'Global Configuration';

  for (let rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check comments
    if (trimmed.startsWith('!') || trimmed.startsWith('#')) {
      results.push({
        line: trimmed,
        explanation: 'Comment / Divider line (ignored by Cisco IOS execution engine)',
        type: 'comment'
      });
      continue;
    }

    // Check hostname / prompt line
    if (trimmed.match(/^[A-Za-z0-9_-]+(\(config[^)]*\))?#/)) {
      if (trimmed.includes('(config-if)#')) currentMode = 'Interface Configuration';
      else if (trimmed.includes('(config-vlan)#')) currentMode = 'VLAN Configuration';
      else if (trimmed.includes('(config-router)#')) currentMode = 'Router Configuration';
      else if (trimmed.includes('(config)#')) currentMode = 'Global Configuration';
      else currentMode = 'Privileged EXEC';
    }

    // Extract exact command if prompt prefix exists
    let commandText = trimmed.replace(/^[A-Za-z0-9_-]+(\(config[^)]*\))?#\s*/, '');
    let explanation = '';

    // Match common Cisco CLI patterns
    if (/^interface\s+/i.test(commandText)) {
      explanation = `Enters Interface Configuration mode for specified physical or logical interface (${commandText.replace(/interface\s+/i, '')})`;
      currentMode = 'Interface Configuration';
    } else if (/^switchport\s+mode\s+access/i.test(commandText)) {
      explanation = 'Forces the interface to operate strictly as an access port (non-trunking) for a single VLAN';
    } else if (/^switchport\s+access\vlan\s+(\d+)/i.test(commandText)) {
      const match = commandText.match(/(\d+)/);
      explanation = `Assigns the access port to VLAN ${match ? match[1] : ''}, placing untagged frames into this broadcast domain`;
    } else if (/^switchport\s+mode\s+trunk/i.test(commandText)) {
      explanation = 'Forces the port into permanent 802.1Q trunking mode to carry multi-VLAN traffic across inter-switch links';
    } else if (/^switchport\s+trunk\s+native\s+vlan\s+(\d+)/i.test(commandText)) {
      const match = commandText.match(/(\d+)/);
      explanation = `Sets native (untagged) VLAN to ${match ? match[1] : ''}. Untagged frames traversing this trunk will belong to VLAN ${match ? match[1] : ''}`;
    } else if (/^switchport\s+trunk\s+allowed\vlan\s+(.+)/i.test(commandText)) {
      const match = commandText.match(/vlan\s+(.+)/i);
      explanation = `Restricts trunk link to carry ONLY specified VLAN traffic (${match ? match[1] : ''})`;
    } else if (/^spanning-tree\s+portfast/i.test(commandText)) {
      explanation = 'Allows edge access port to transition immediately to forwarding state, bypassing 30-second STP listening/learning delay';
    } else if (/^spanning-tree\s+bpduguard\s+enable/i.test(commandText)) {
      explanation = 'Enables BPDU Guard. Put interface into err-disabled state if unauthorized switch sends BPDU packets on edge port';
    } else if (/^vlan\s+(\d+)/i.test(commandText)) {
      const match = commandText.match(/(\d+)/);
      explanation = `Creates Virtual LAN ID ${match ? match[1] : ''} in the local switch VLAN database and enters VLAN configuration mode`;
      currentMode = 'VLAN Configuration';
    } else if (/^name\s+(.+)/i.test(commandText)) {
      explanation = `Assigns descriptive name label "${commandText.replace(/^name\s+/i, '')}" to current VLAN`;
    } else if (/^ip\s+address\s+([0-9.]+)\s+([0-9.]+)/i.test(commandText)) {
      const parts = commandText.split(/\s+/);
      explanation = `Assigns static Layer 3 IPv4 address ${parts[2] || ''} with subnet mask ${parts[3] || ''} to this interface`;
    } else if (/^no\s+shutdown/i.test(commandText)) {
      explanation = 'Administrative enable command. Brings the physical/logical interface UP from administratively down state';
    } else if (/^shutdown/i.test(commandText)) {
      explanation = 'Administratively disables interface, shutting down physical link and Layer 2 protocol state';
    } else if (/^ip\s+route\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+|[A-Za-z0-9/]+)/i.test(commandText)) {
      explanation = 'Configures manual static route entry in the IPv4 routing table toward destination prefix';
    } else if (/^router\s+ospf\s+(\d+)/i.test(commandText)) {
      explanation = `Starts OSPFv2 link-state routing process with local process ID ${commandText.replace(/^router\s+ospf\s+/i, '')}`;
      currentMode = 'Router Configuration';
    } else if (/^network\s+([0-9.]+)\s+([0-9.]+)\s+area\s+(\d+)/i.test(commandText)) {
      explanation = 'Enables OSPF routing on matching interfaces using wildcard mask and places them into designated OSPF Area';
    } else if (/^show\s+/i.test(commandText)) {
      explanation = 'Verification CLI command. Requests system status or operational table from Cisco IOS kernel';
    } else if (/^copy\s+running-config\s+startup-config/i.test(commandText) || /^write\s+memory/i.test(commandText)) {
      explanation = 'Saves active volatile NVRAM running configuration to non-volatile startup configuration file';
    } else {
      explanation = `Executes Cisco IOS syntax: "${commandText}" under ${currentMode}`;
    }

    results.push({
      line: trimmed,
      explanation,
      mode: currentMode,
      type: 'command'
    });
  }

  return results;
}
