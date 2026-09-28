// CCNA NOTES Domain Model Types

export type CategorySlug =
  | 'network-fundamentals'
  | 'network-access'
  | 'ip-connectivity'
  | 'ip-services'
  | 'security-fundamentals'
  | 'automation';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type ClassificationType = 'Theory' | 'Definition' | 'Command' | 'Configuration' |
  'Command Output' | 'Explanation' | 'Example' | 'Important Note' | 'Warning' |
  'Troubleshooting' | 'Exercise' | 'Solution' | 'Lab' | 'IP Address';

export interface PasteItemParsed {
  id: string;
  classification: ClassificationType;
  title: string;
  rawContent: string;
  formattedContent: string;
  suggestedTags: string[];
  action: 'create-new' | 'use-existing' | 'merge';
  duplicateMatch?: { type: 'command' | 'lesson'; existingId: string; existingTitle: string; confidence: number };
}

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'bullet-list'
  | 'note'
  | 'warning'
  | 'example'
  | 'cisco-command'
  | 'command-output'
  | 'table'
  | 'topology';

export interface LessonBlock {
  id: string;
  type: BlockType;
  content: string;
  title?: string;
  language?: string;
  imageUrl?: string;
}

export interface Lesson {
  id: string;
  title: string;
  topic: string;
  tags: string[];
  summary: string;
  imageUrl?: string;
  blocks: LessonBlock[];
  relatedCommandIds?: string[];
  topologyId?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DeviceType =
  | 'Cisco Router'
  | 'Cisco L2 Switch'
  | 'Cisco L3 Switch'
  | 'PC'
  | 'Server'
  | 'Access Point'
  | 'Cloud/Internet';

// These labels are user managed. Keep them open so users can add their own groups and modes.
export type CiscoMode = string;
export type CommandGroup = string;

export interface CommandStep {
  id: string;
  explanation?: string;
  command: string;
}

export interface CiscoCommand {
  id: string;
  command: string;
  title: string;
  description: string;
  category: CommandGroup;
  device: DeviceType;
  mode: CiscoMode;
  example: string;
  notes?: string;
  imageUrl?: string;
  steps?: CommandStep[];
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  type: DeviceType;
  x: number;
  y: number;
  ip?: string;
  vlan?: string;
}

export interface TopologyLink {
  from: string;
  to: string;
  label?: string; // e.g. "Fa0/1 -> Fa0/24"
  status?: 'blocking' | 'forwarding';
}

export type NetworkTopology = Topology;

export interface IPAddressEntry {
  device: string;
  interfaceName: string;
  ipAddress: string;
  subnetMask: string;
  defaultGateway?: string;
  vlan?: string;
}

export interface Topology {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  nodes: TopologyNode[];
  links: TopologyLink[];
  devices: string[];
  ipList?: { device: string; interfaceName: string; ip: string; vlan?: string }[];
  notes?: string;
  relatedCommandIds?: string[];
  isFavorite: boolean;
  createdAt: string;
}

export type NoteType = string;

export interface PersonalNote {
  id: string;
  title: string;
  type: NoteType;
  content: string;
  imageUrl?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalLessons: number;
  totalCommands: number;
  totalTopologies: number;
  totalNotes: number;
}
