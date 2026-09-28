import { demoLessons, demoCommands, demoNotes, demoTopologies } from '../seed/minimal-seed-data';
import { Lesson, CiscoCommand, Topology, PersonalNote, DashboardStats } from '../types';
import { supabase, isSupabaseConfigured } from './supabase-client';
import { matchesCommandItem } from '../command-items';

const KEYS = {
  LESSONS: 'ccna_notes_lessons',
  COMMANDS: 'ccna_notes_commands',
  TOPOLOGIES: 'ccna_notes_topologies',
  NOTES: 'ccna_notes_notes',
  IMAGES: 'ccna_notes_images',
  LAST_SYNC: 'ccna_notes_last_sync'
};

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Error writing to localStorage:', err);
  }
}

function setItemOrThrow<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

export const repository = {
  isCloudSyncEnabled: (): boolean => isSupabaseConfigured,

  // Async cloud sync function to pull latest remote SQL data
  syncFromCloud: async (): Promise<{ success: boolean; message: string }> => {
    if (!supabase || !isSupabaseConfigured) {
      return { success: false, message: 'Chưa cấu hình Supabase ENV (NEXT_PUBLIC_SUPABASE_URL)' };
    }

    try {
      // 1. Fetch Lessons
      const { data: remoteLessons, error: errL } = await supabase.from('lessons').select('*');
      if (!errL && remoteLessons && remoteLessons.length > 0) {
        const formatted: Lesson[] = remoteLessons.map(l => ({
          id: l.id,
          title: l.title,
          topic: l.topic,
          tags: l.tags || [],
          summary: l.summary || '',
          imageUrl: l.image_url,
          blocks: l.blocks || [],
          relatedCommandIds: l.related_command_ids || [],
          topologyId: l.topology_id,
          isFavorite: Boolean(l.is_favorite),
          createdAt: l.created_at,
          updatedAt: l.updated_at
        }));
        setItem(KEYS.LESSONS, formatted);
      }

      // 2. Fetch Cisco Commands
      const { data: remoteCmds, error: errC } = await supabase.from('cisco_commands').select('*');
      if (!errC && remoteCmds && remoteCmds.length > 0) {
        const formatted: CiscoCommand[] = remoteCmds.map(c => ({
          id: c.id,
          command: c.command,
          title: c.title,
          description: c.description || '',
          category: c.category,
          device: c.device,
          mode: c.mode,
          example: c.example || '',
          notes: c.notes,
          imageUrl: c.image_url,
          steps: c.steps || [],
          tags: c.tags || [],
          isFavorite: Boolean(c.is_favorite),
          createdAt: c.created_at
        }));
        setItem(KEYS.COMMANDS, formatted);
      }

      // 3. Fetch Topologies
      const { data: remoteTopos, error: errT } = await supabase.from('topologies').select('*');
      if (!errT && remoteTopos && remoteTopos.length > 0) {
        const formatted: Topology[] = remoteTopos.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          imageUrl: t.image_url,
          nodes: t.nodes || [],
          links: t.links || [],
          devices: t.devices || [],
          ipList: t.ip_list || [],
          notes: t.notes,
          relatedCommandIds: t.related_command_ids || [],
          isFavorite: Boolean(t.is_favorite),
          createdAt: t.created_at
        }));
        setItem(KEYS.TOPOLOGIES, formatted);
      }

      // 4. Fetch Personal Notes
      const { data: remoteNotes, error: errN } = await supabase.from('personal_notes').select('*');
      if (!errN && remoteNotes && remoteNotes.length > 0) {
        const formatted: PersonalNote[] = remoteNotes.map(n => ({
          id: n.id,
          title: n.title,
          type: n.type,
          content: n.content,
          imageUrl: n.image_url,
          tags: n.tags || [],
          isFavorite: Boolean(n.is_favorite),
          createdAt: n.created_at,
          updatedAt: n.updated_at
        }));
        setItem(KEYS.NOTES, formatted);
      }

      setItem(KEYS.LAST_SYNC, new Date().toISOString());
      return { success: true, message: 'Đã đồng bộ thành công dữ liệu với SQL Supabase!' };
    } catch (err: any) {
      console.error('Supabase sync error:', err);
      return { success: false, message: err?.message || 'Lỗi khi đồng bộ dữ liệu.' };
    }
  },

  // Lessons CRUD
  getLessons: (): Lesson[] => getItem(KEYS.LESSONS, demoLessons),
  getLessonById: (id: string): Lesson | undefined => {
    return repository.getLessons().find(l => l.id === id);
  },
  saveLesson: (lesson: Lesson): Lesson => {
    const list = repository.getLessons();
    const idx = list.findIndex(l => l.id === lesson.id);
    let updated: Lesson[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = { ...lesson, updatedAt: new Date().toISOString() };
    } else {
      updated = [lesson, ...list];
    }
    setItemOrThrow(KEYS.LESSONS, updated);

    // Sync to Supabase in background
    if (supabase && isSupabaseConfigured) {
      supabase.from('lessons').upsert({
        id: lesson.id,
        title: lesson.title,
        topic: lesson.topic,
        tags: lesson.tags,
        summary: lesson.summary,
        image_url: lesson.imageUrl || null,
        blocks: lesson.blocks,
        related_command_ids: lesson.relatedCommandIds || [],
        topology_id: lesson.topologyId || null,
        is_favorite: lesson.isFavorite,
        created_at: lesson.createdAt,
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.error('Error upserting lesson to Supabase:', error);
      });
    }

    return lesson;
  },
  deleteLesson: (id: string): void => {
    const list = repository.getLessons().filter(l => l.id !== id);
    setItem(KEYS.LESSONS, list);
    if (supabase && isSupabaseConfigured) {
      supabase.from('lessons').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting lesson from Supabase:', error);
      });
    }
  },

  // Cisco Commands CRUD
  getCommands: (): CiscoCommand[] => {
    const stored = getItem(KEYS.COMMANDS, demoCommands);
    const demoIds = new Set(['cmd-demo-vlan-config', 'cmd-demo-show-vlan']);
    const cleaned = stored.filter(command => !demoIds.has(command.id));
    if (cleaned.length !== stored.length) setItem(KEYS.COMMANDS, cleaned);
    return cleaned;
  },
  getCommandById: (id: string): CiscoCommand | undefined => {
    return repository.getCommands().find(c => c.id === id);
  },
  saveCommand: (cmd: CiscoCommand): CiscoCommand => {
    const list = repository.getCommands();
    const idx = list.findIndex(c => c.id === cmd.id);
    let updated: CiscoCommand[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = cmd;
    } else {
      updated = [cmd, ...list];
    }
    setItem(KEYS.COMMANDS, updated);

    if (supabase && isSupabaseConfigured) {
      supabase.from('cisco_commands').upsert({
        id: cmd.id,
        command: cmd.command,
        title: cmd.title,
        description: cmd.description,
        category: cmd.category,
        device: cmd.device,
        mode: cmd.mode,
        example: cmd.example,
        notes: cmd.notes || null,
        image_url: cmd.imageUrl || null,
        steps: cmd.steps || [],
        tags: cmd.tags,
        is_favorite: cmd.isFavorite,
        created_at: cmd.createdAt
      }).then(({ error }) => {
        if (error) console.error('Error upserting command to Supabase:', error);
      });
    }

    return cmd;
  },
  deleteCommand: (id: string): void => {
    const list = repository.getCommands().filter(c => c.id !== id);
    setItem(KEYS.COMMANDS, list);
    if (supabase && isSupabaseConfigured) {
      supabase.from('cisco_commands').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting command from Supabase:', error);
      });
    }
  },

  // Topologies CRUD
  getTopologies: (): Topology[] => getItem(KEYS.TOPOLOGIES, demoTopologies),
  getTopologyById: (id: string): Topology | undefined => {
    return repository.getTopologies().find(t => t.id === id);
  },
  saveTopology: (topo: Topology): Topology => {
    const list = repository.getTopologies();
    const idx = list.findIndex(t => t.id === topo.id);
    let updated: Topology[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = topo;
    } else {
      updated = [topo, ...list];
    }
    setItem(KEYS.TOPOLOGIES, updated);

    if (supabase && isSupabaseConfigured) {
      supabase.from('topologies').upsert({
        id: topo.id,
        title: topo.title,
        description: topo.description,
        image_url: topo.imageUrl || null,
        nodes: topo.nodes,
        links: topo.links,
        devices: topo.devices,
        ip_list: topo.ipList || [],
        notes: topo.notes || null,
        related_command_ids: topo.relatedCommandIds || [],
        is_favorite: topo.isFavorite,
        created_at: topo.createdAt
      }).then(({ error }) => {
        if (error) console.error('Error upserting topology to Supabase:', error);
      });
    }

    return topo;
  },
  deleteTopology: (id: string): void => {
    const list = repository.getTopologies().filter(t => t.id !== id);
    setItem(KEYS.TOPOLOGIES, list);
    if (supabase && isSupabaseConfigured) {
      supabase.from('topologies').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting topology from Supabase:', error);
      });
    }
  },

  // Personal Notes CRUD
  getNotes: (): PersonalNote[] => getItem(KEYS.NOTES, demoNotes),
  getNoteById: (id: string): PersonalNote | undefined => {
    return repository.getNotes().find(n => n.id === id);
  },
  saveNote: (note: PersonalNote): PersonalNote => {
    const list = repository.getNotes();
    const idx = list.findIndex(n => n.id === note.id);
    let updated: PersonalNote[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = { ...note, updatedAt: new Date().toISOString() };
    } else {
      updated = [note, ...list];
    }
    setItemOrThrow(KEYS.NOTES, updated);

    if (supabase && isSupabaseConfigured) {
      supabase.from('personal_notes').upsert({
        id: note.id,
        title: note.title,
        type: note.type,
        content: note.content,
        image_url: note.imageUrl || null,
        tags: note.tags,
        is_favorite: note.isFavorite,
        created_at: note.createdAt,
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.error('Error upserting note to Supabase:', error);
      });
    }

    return note;
  },
  deleteNote: (id: string): void => {
    const list = repository.getNotes().filter(n => n.id !== id);
    setItem(KEYS.NOTES, list);
    if (supabase && isSupabaseConfigured) {
      supabase.from('personal_notes').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting note from Supabase:', error);
      });
    }
  },

  // Image Storage 🖼️
  saveImage: (id: string, dataUrl: string): string => {
    if (!id) id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const images = getItem<Record<string, string>>(KEYS.IMAGES, {});
    images[id] = dataUrl;
    setItem(KEYS.IMAGES, images);
    return id;
  },
  getImage: (id: string): string | undefined => {
    if (!id) return undefined;
    if (id.startsWith('data:image/') || id.startsWith('http') || id.startsWith('/')) return id;
    const images = getItem<Record<string, string>>(KEYS.IMAGES, {});
    return images[id];
  },

  // Toggle Favorite ⭐
  toggleFavorite: (type: 'lesson' | 'command' | 'topology' | 'note', id: string): void => {
    if (type === 'lesson') {
      const item = repository.getLessonById(id);
      if (item) { item.isFavorite = !item.isFavorite; repository.saveLesson(item); }
    } else if (type === 'command') {
      const item = repository.getCommandById(id);
      if (item) { item.isFavorite = !item.isFavorite; repository.saveCommand(item); }
    } else if (type === 'topology') {
      const item = repository.getTopologyById(id);
      if (item) { item.isFavorite = !item.isFavorite; repository.saveTopology(item); }
    } else if (type === 'note') {
      const item = repository.getNoteById(id);
      if (item) { item.isFavorite = !item.isFavorite; repository.saveNote(item); }
    }
  },

  // Dashboard Metrics
  getDashboardStats: (): DashboardStats => {
    return {
      totalLessons: repository.getLessons().length,
      totalCommands: repository.getCommands().length,
      totalTopologies: repository.getTopologies().length,
      totalNotes: repository.getNotes().length
    };
  },

  // Global Search
  searchAll: (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return { lessons: [], commands: [], topologies: [], notes: [] };

    return {
      lessons: repository.getLessons().filter(l => l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q)),
      commands: repository.getCommands().filter(c => matchesCommandItem(c, q)),
      topologies: repository.getTopologies().filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
      notes: repository.getNotes().filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    };
  },

  // Export / Import JSON Backup Data
  exportData: (): string => {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      lessons: repository.getLessons(),
      commands: repository.getCommands(),
      topologies: repository.getTopologies(),
      notes: repository.getNotes()
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (jsonString: string): { success: boolean; count: number; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      let count = 0;

      if (Array.isArray(parsed.lessons)) {
        setItem(KEYS.LESSONS, parsed.lessons);
        count += parsed.lessons.length;
      }
      if (Array.isArray(parsed.commands)) {
        setItem(KEYS.COMMANDS, parsed.commands);
        count += parsed.commands.length;
      }
      if (Array.isArray(parsed.topologies)) {
        setItem(KEYS.TOPOLOGIES, parsed.topologies);
        count += parsed.topologies.length;
      }
      if (Array.isArray(parsed.notes)) {
        setItem(KEYS.NOTES, parsed.notes);
        count += parsed.notes.length;
      }

      if (repository.isCloudSyncEnabled()) {
        repository.syncFromCloud();
      }

      return { success: true, count, message: `Khôi phục thành công ${count} mục dữ liệu.` };
    } catch (err: any) {
      return { success: false, count: 0, message: 'File JSON không hợp lệ.' };
    }
  }
};
