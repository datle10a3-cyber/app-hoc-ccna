import { demoLessons, demoCommands, demoNotes, demoTopologies } from '../seed/minimal-seed-data';
import { Lesson, CiscoCommand, CiscoCommandExplanation, Topology, PersonalNote, DashboardStats } from '../types';
import { supabase, isSupabaseConfigured } from './supabase-client';
import { matchesCommandItem } from '../command-items';

const KEYS = {
  LESSONS: 'ccna_notes_lessons',
  COMMANDS: 'ccna_notes_commands',
  TOPOLOGIES: 'ccna_notes_topologies',
  NOTES: 'ccna_notes_notes',
  IMAGES: 'ccna_notes_images',
  TOMBSTONES: 'ccna_notes_deleted',
  SYNCED_IDS: 'ccna_notes_synced_ids',
  COMMAND_EXPLANATIONS: 'ccna_notes_command_explanations',
  LAST_SYNC: 'ccna_notes_last_sync'
};

const DATA_KEYS = [KEYS.LESSONS, KEYS.COMMANDS, KEYS.TOPOLOGIES, KEYS.NOTES, KEYS.IMAGES, KEYS.TOMBSTONES, KEYS.SYNCED_IDS, KEYS.COMMAND_EXPLANATIONS] as const;
let activeUserId: string | null = null;
const scopedKey = (key: string) => activeUserId ? `${key}:user:${activeUserId}` : key;
function notifyDataChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('ccna:data-sync'));
}

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(scopedKey(key));
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(value));
  } catch (err) {
    console.error('Error writing to localStorage:', err);
  }
}

function setItemOrThrow<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') localStorage.setItem(scopedKey(key), JSON.stringify(value));
}

type DeletedRows = Partial<Record<'lessons'|'commands'|'topologies'|'notes', string[]>>;
function deletedRows(): DeletedRows { return getItem<DeletedRows>(KEYS.TOMBSTONES, {}); }
function markDeleted(type: keyof DeletedRows, id: string): void {
  const all = deletedRows();
  all[type] = Array.from(new Set([...(all[type] || []), id]));
  setItem(KEYS.TOMBSTONES, all);
}

function rowTimestamp(row: any): number {
  const timestamp = Date.parse(row.updated_at || row.created_at || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mapRemoteCommandExplanation(row: any): CiscoCommandExplanation {
  return {
    commandPattern: row.command_pattern,
    explanation: row.explanation,
    category: row.category || 'Cisco IOS',
    configMode: row.config_mode || 'Không xác định',
    relatedCommands: Array.isArray(row.related_commands) ? row.related_commands : [],
    userEdited: Boolean(row.user_edited),
    confidence: typeof row.confidence === 'number' ? row.confidence : undefined,
    updatedAt: row.updated_at || new Date(0).toISOString()
  };
}

function mergeRows<T extends { id: string }>(local: T[], remote: any[], mapRemote: (row: any) => T): T[] {
  const merged = new Map<string, T>();
  for (const row of remote || []) merged.set(row.id, mapRemote(row));
  for (const row of local || []) {
    const cloud = (remote || []).find(item => item.id === row.id);
    const localTime = Date.parse((row as any).updatedAt || (row as any).createdAt || '') || 0;
    if (!cloud || localTime >= rowTimestamp(cloud)) merged.set(row.id, row);
  }
  return Array.from(merged.values());
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id || null;
}

export const repository = {
  isCloudSyncEnabled: (): boolean => isSupabaseConfigured,

  setActiveUser: async (userId: string | null): Promise<void> => {
    if (activeUserId === userId) return;
    if (typeof window !== 'undefined' && !activeUserId && userId) {
      // One-time migration: move this device's existing local-only content to the first signed-in account.
      for (const key of DATA_KEYS) {
        const oldValue = localStorage.getItem(key);
        const nextKey = `${key}:user:${userId}`;
        if (oldValue && !localStorage.getItem(nextKey)) localStorage.setItem(nextKey, oldValue);
        if (oldValue) localStorage.removeItem(key);
      }
    }
    activeUserId = userId;
  },

  // Async cloud sync function to pull latest remote SQL data
  syncFromCloud: async (): Promise<{ success: boolean; message: string }> => {
    if (!supabase || !isSupabaseConfigured) {
      return { success: false, message: 'Chưa cấu hình Supabase ENV (NEXT_PUBLIC_SUPABASE_URL)' };
    }

    try {
      const userId = await currentUserId();
      if (!userId) return { success: false, message: 'Đăng nhập để đồng bộ dữ liệu giữa các thiết bị.' };
      // 1. Fetch Lessons
      const [{ data: remoteLessons, error: errL }, { data: remoteCmds, error: errC }, { data: remoteTopos, error: errT }, { data: remoteNotes, error: errN }, { data: remoteImages, error: errI }] = await Promise.all([
        supabase.from('ccna_lessons').select('*'), supabase.from('ccna_cisco_commands').select('*'),
        supabase.from('ccna_topologies').select('*'), supabase.from('ccna_personal_notes').select('*'),
        supabase.from('ccna_user_images').select('id,data_url')
      ]);
      const errors = [errL, errC, errT, errN, errI].filter(Boolean);
      if (errors.length) throw errors[0];
      const remoteIdLists = {
        lessons: (remoteLessons || []).map(row => row.id), commands: (remoteCmds || []).map(row => row.id),
        topologies: (remoteTopos || []).map(row => row.id), notes: (remoteNotes || []).map(row => row.id)
      };
      const previousIds = getItem<Partial<Record<keyof DeletedRows, string[]>>>(KEYS.SYNCED_IDS, {});
      for (const type of ['lessons','commands','topologies','notes'] as const) {
        const present = new Set(remoteIdLists[type]);
        for (const id of previousIds[type] || []) if (!present.has(id)) markDeleted(type, id);
      }
      const removals = deletedRows();
      const deleted = (type: keyof DeletedRows) => new Set(removals[type] || []);
      const deleteResults = await Promise.all([
        ...(removals.lessons?.length ? [supabase.from('ccna_lessons').delete().in('id', removals.lessons).eq('user_id', userId)] : []),
        ...(removals.commands?.length ? [supabase.from('ccna_cisco_commands').delete().in('id', removals.commands).eq('user_id', userId)] : []),
        ...(removals.topologies?.length ? [supabase.from('ccna_topologies').delete().in('id', removals.topologies).eq('user_id', userId)] : []),
        ...(removals.notes?.length ? [supabase.from('ccna_personal_notes').delete().in('id', removals.notes).eq('user_id', userId)] : [])
      ]);
      const failedDelete = deleteResults.find(result => result.error);
      if (failedDelete?.error) throw failedDelete.error;
      const localLessons = getItem<Lesson[]>(KEYS.LESSONS, demoLessons).filter(row => !deleted('lessons').has(row.id));
      const safeRemoteLessons = (remoteLessons || []).filter(row => !deleted('lessons').has(row.id));
      const formatted: Lesson[] = mergeRows(localLessons, safeRemoteLessons, l => ({
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

      // 2. Fetch Cisco Commands
      const localCmds = repository.getCommands();
      const formattedCmds: CiscoCommand[] = mergeRows(localCmds.filter(row => !deleted('commands').has(row.id)), (remoteCmds || []).filter(row => !deleted('commands').has(row.id)), c => ({
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
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));
      setItem(KEYS.COMMANDS, formattedCmds);

      // 3. Fetch Topologies
      const formattedTopos: Topology[] = mergeRows(repository.getTopologies().filter(row => !deleted('topologies').has(row.id)), (remoteTopos || []).filter(row => !deleted('topologies').has(row.id)), t => ({
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
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
      setItem(KEYS.TOPOLOGIES, formattedTopos);

      // 4. Fetch Personal Notes
      const formattedNotes: PersonalNote[] = mergeRows(repository.getNotes().filter(row => !deleted('notes').has(row.id)), (remoteNotes || []).filter(row => !deleted('notes').has(row.id)), n => ({
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
      setItem(KEYS.NOTES, formattedNotes);

      // This table is an additive feature: when an older Supabase project has not run
      // the migration yet, keep local explanations and let the existing sync continue.
      const explanationResult = await supabase.from('ccna_command_explanations').select('*').eq('user_id', userId);
      if (!explanationResult.error) {
        const remoteExplanations = (explanationResult.data || []).map(mapRemoteCommandExplanation);
        const remoteByPattern = new Map(remoteExplanations.map(row => [row.commandPattern, row]));
        const mergedByPattern = new Map(remoteExplanations.map(row => [row.commandPattern, row]));
        const localExplanations = repository.getCommandExplanations();
        for (const local of localExplanations) {
          const remote = remoteByPattern.get(local.commandPattern);
          const sameEditType = remote?.userEdited === local.userEdited;
          const localWins = !remote || (local.userEdited && !remote.userEdited) ||
            (sameEditType && (Date.parse(local.updatedAt) || 0) >= (Date.parse(remote.updatedAt) || 0));
          if (localWins) mergedByPattern.set(local.commandPattern, local);
        }
        const mergedExplanations = Array.from(mergedByPattern.values());
        setItem(KEYS.COMMAND_EXPLANATIONS, mergedExplanations);
        const explanationWrites = mergedExplanations.filter(local => {
          const remote = remoteByPattern.get(local.commandPattern);
          const sameEditType = remote?.userEdited === local.userEdited;
          return !remote || (local.userEdited && !remote.userEdited) ||
            (sameEditType && (Date.parse(local.updatedAt) || 0) > (Date.parse(remote.updatedAt) || 0));
        }).map(row => supabase!.from('ccna_command_explanations').upsert({
          user_id: userId,
          command_pattern: row.commandPattern,
          explanation: row.explanation,
          category: row.category,
          config_mode: row.configMode,
          related_commands: row.relatedCommands,
          user_edited: row.userEdited,
          confidence: row.confidence ?? null,
          updated_at: row.updatedAt
        }));
        const explanationWriteResults = await Promise.all(explanationWrites);
        const explanationWriteError = explanationWriteResults.find(result => result.error)?.error;
        if (explanationWriteError) console.warn('Could not sync command explanations:', explanationWriteError.message);
      } else if (!['42P01', 'PGRST205'].includes(explanationResult.error.code || '')) {
        console.warn('Could not read synced command explanations:', explanationResult.error.message);
      }

      const images = getItem<Record<string, string>>(KEYS.IMAGES, {});
      for (const image of remoteImages || []) if (!images[image.id]) images[image.id] = image.data_url;
      setItem(KEYS.IMAGES, images);

      // Upload local and merged rows. RLS binds every write to the authenticated user.
      const owner = { user_id: userId };
      const shouldUpload = (local: any, remote: any[]) => {
        const cloud = remote.find(row => row.id === local.id);
        if (!cloud) return true;
        const localTime = Date.parse(local.updatedAt || local.createdAt || '') || 0;
        return localTime > rowTimestamp(cloud);
      };
      const writes = await Promise.all([
        ...formatted.filter(row => shouldUpload(row, safeRemoteLessons)).map(l => supabase!.from('ccna_lessons').upsert({ ...owner, id:l.id,title:l.title,topic:l.topic,tags:l.tags,summary:l.summary,image_url:l.imageUrl||null,blocks:l.blocks,related_command_ids:l.relatedCommandIds||[],topology_id:l.topologyId||null,is_favorite:l.isFavorite,created_at:l.createdAt,updated_at:l.updatedAt||l.createdAt })),
        ...formattedCmds.filter(row => shouldUpload(row, (remoteCmds || []).filter(item => !deleted('commands').has(item.id)))).map(c => supabase!.from('ccna_cisco_commands').upsert({ ...owner,id:c.id,command:c.command,title:c.title,description:c.description,category:c.category,device:c.device,mode:c.mode,example:c.example,notes:c.notes||null,image_url:c.imageUrl||null,steps:c.steps||[],tags:c.tags,is_favorite:c.isFavorite,created_at:c.createdAt,updated_at:(c as any).updatedAt||c.createdAt })),
        ...formattedTopos.filter(row => shouldUpload(row, (remoteTopos || []).filter(item => !deleted('topologies').has(item.id)))).map(t => supabase!.from('ccna_topologies').upsert({ ...owner,id:t.id,title:t.title,description:t.description,image_url:t.imageUrl||null,nodes:t.nodes,links:t.links,devices:t.devices,ip_list:t.ipList||[],notes:t.notes||null,related_command_ids:t.relatedCommandIds||[],is_favorite:t.isFavorite,created_at:t.createdAt,updated_at:(t as any).updatedAt||t.createdAt })),
        ...formattedNotes.filter(row => shouldUpload(row, (remoteNotes || []).filter(item => !deleted('notes').has(item.id)))).map(n => supabase!.from('ccna_personal_notes').upsert({ ...owner,id:n.id,title:n.title,type:n.type,content:n.content,image_url:n.imageUrl||null,tags:n.tags,is_favorite:n.isFavorite,created_at:n.createdAt,updated_at:n.updatedAt||n.createdAt })),
        ...Object.entries(images).filter(([id]) => !(remoteImages || []).some(row => row.id === id)).map(([id,data_url]) => supabase!.from('ccna_user_images').upsert({ ...owner,id,data_url,updated_at:new Date().toISOString() }))
      ]);
      const failedWrite = writes.find(result => result.error);
      if (failedWrite?.error) throw failedWrite.error;
      setItem(KEYS.TOMBSTONES, {});
      setItem(KEYS.SYNCED_IDS, {
        lessons: formatted.map(row => row.id), commands: formattedCmds.map(row => row.id),
        topologies: formattedTopos.map(row => row.id), notes: formattedNotes.map(row => row.id)
      });

      setItem(KEYS.LAST_SYNC, new Date().toISOString());
      notifyDataChanged();
      return { success: true, message: `Đồng bộ hoàn tất: ${formatted.length} bài học, ${formattedCmds.length} lệnh, ${formattedTopos.length} mô hình, ${formattedNotes.length} ghi chú.` };
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
    const pendingDeletes = deletedRows(); pendingDeletes.lessons = (pendingDeletes.lessons || []).filter(id => id !== lesson.id); setItem(KEYS.TOMBSTONES, pendingDeletes);
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
    notifyDataChanged();

    // Sync to Supabase in background
    if (supabase && isSupabaseConfigured) {
      void currentUserId().then(user_id => user_id ? supabase!.from('ccna_lessons').upsert({
        user_id,
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
      }) : null).then(result => {
        const error = result && result.error;
        if (error) console.error('Error upserting lesson to Supabase:', error);
      });
    }

    return lesson;
  },
  deleteLesson: (id: string): void => {
    markDeleted('lessons', id);
    const list = repository.getLessons().filter(l => l.id !== id);
    setItem(KEYS.LESSONS, list);
    notifyDataChanged();
    if (supabase && isSupabaseConfigured) {
      void currentUserId().then(user_id => user_id ? supabase!.from('ccna_lessons').delete().eq('id', id).eq('user_id', user_id) : null).then(result => {
        const error = result && result.error;
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
  getCommandExplanations: (): CiscoCommandExplanation[] => getItem<CiscoCommandExplanation[]>(KEYS.COMMAND_EXPLANATIONS, []),
  saveCommandExplanation: (record: Omit<CiscoCommandExplanation, 'updatedAt'> & { updatedAt?: string }): boolean => {
    const existing = repository.getCommandExplanations();
    const current = existing.find(item => item.commandPattern === record.commandPattern);
    // A generated explanation must never replace an explanation the learner edited.
    if (current?.userEdited && !record.userEdited) return false;

    const saved: CiscoCommandExplanation = { ...record, updatedAt: record.updatedAt || new Date().toISOString() };
    setItem(KEYS.COMMAND_EXPLANATIONS, [
      ...existing.filter(item => item.commandPattern !== saved.commandPattern), saved
    ]);
    notifyDataChanged();

    if (supabase && isSupabaseConfigured) {
      void currentUserId().then(async user_id => {
        if (!user_id) return;
        const { data: remote, error: readError } = await supabase!.from('ccna_command_explanations')
          .select('user_edited,explanation,category,config_mode,related_commands,confidence,updated_at')
          .eq('user_id', user_id).eq('command_pattern', saved.commandPattern).maybeSingle();
        if (!readError && remote?.user_edited && (!saved.userEdited || (Date.parse(remote.updated_at) || 0) > (Date.parse(saved.updatedAt) || 0))) {
          const merged = repository.getCommandExplanations().filter(item => item.commandPattern !== saved.commandPattern);
          merged.push(mapRemoteCommandExplanation({ ...remote, command_pattern: saved.commandPattern }));
          setItem(KEYS.COMMAND_EXPLANATIONS, merged);
          notifyDataChanged();
          return;
        }
        if (readError && !['42P01', 'PGRST205'].includes(readError.code || '')) {
          console.warn('Could not read synced command explanation:', readError.message);
          return;
        }
        if (readError) return;
        const { error } = await supabase!.from('ccna_command_explanations').upsert({
          user_id,
          command_pattern: saved.commandPattern,
          explanation: saved.explanation,
          category: saved.category,
          config_mode: saved.configMode,
          related_commands: saved.relatedCommands,
          user_edited: saved.userEdited,
          confidence: saved.confidence ?? null,
          updated_at: saved.updatedAt
        });
        if (error && !['42P01', 'PGRST205'].includes(error.code || '')) console.warn('Could not sync command explanation:', error.message);
      }).catch(error => console.warn('Could not sync command explanation:', error));
    }
    return true;
  },
  getCommandById: (id: string): CiscoCommand | undefined => {
    return repository.getCommands().find(c => c.id === id);
  },
  saveCommand: (cmd: CiscoCommand): CiscoCommand => {
    const pendingDeletes = deletedRows(); pendingDeletes.commands = (pendingDeletes.commands || []).filter(id => id !== cmd.id); setItem(KEYS.TOMBSTONES, pendingDeletes);
    const list = repository.getCommands();
    const idx = list.findIndex(c => c.id === cmd.id);
    let updated: CiscoCommand[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = { ...cmd, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...cmd, updatedAt: new Date().toISOString() }, ...list];
    }
    setItem(KEYS.COMMANDS, updated);
    notifyDataChanged();

    if (supabase && isSupabaseConfigured) {
      void currentUserId().then(user_id => user_id ? supabase!.from('ccna_cisco_commands').upsert({
        user_id,
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
        created_at: cmd.createdAt,
        updated_at: (cmd as any).updatedAt || cmd.createdAt
      }) : null).then(result => {
        const error = result && result.error;
        if (error) console.error('Error upserting command to Supabase:', error);
      });
    }

    return cmd;
  },
  deleteCommand: (id: string): void => {
    markDeleted('commands', id);
    const list = repository.getCommands().filter(c => c.id !== id);
    setItem(KEYS.COMMANDS, list);
    notifyDataChanged();
    if (supabase && isSupabaseConfigured) {
      void currentUserId().then(user_id => user_id ? supabase!.from('ccna_cisco_commands').delete().eq('id', id).eq('user_id', user_id) : null).then(result => {
        const error = result && result.error;
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
    const pendingDeletes = deletedRows(); pendingDeletes.topologies = (pendingDeletes.topologies || []).filter(id => id !== topo.id); setItem(KEYS.TOMBSTONES, pendingDeletes);
    const list = repository.getTopologies();
    const idx = list.findIndex(t => t.id === topo.id);
    let updated: Topology[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = { ...topo, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...topo, updatedAt: new Date().toISOString() }, ...list];
    }
    setItem(KEYS.TOPOLOGIES, updated);
    notifyDataChanged();

    if (supabase && isSupabaseConfigured) {
      void currentUserId().then(user_id => user_id ? supabase!.from('ccna_topologies').upsert({
        user_id,
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
        created_at: topo.createdAt,
        updated_at: (topo as any).updatedAt || topo.createdAt
      }) : null).then(result => {
        const error = result && result.error;
        if (error) console.error('Error upserting topology to Supabase:', error);
      });
    }

    return topo;
  },
  deleteTopology: (id: string): void => {
    markDeleted('topologies', id);
    const list = repository.getTopologies().filter(t => t.id !== id);
    setItem(KEYS.TOPOLOGIES, list);
    notifyDataChanged();
    if (supabase && isSupabaseConfigured) {
      void currentUserId().then(user_id => user_id ? supabase!.from('ccna_topologies').delete().eq('id', id).eq('user_id', user_id) : null).then(result => {
        const error = result && result.error;
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
    const pendingDeletes = deletedRows(); pendingDeletes.notes = (pendingDeletes.notes || []).filter(id => id !== note.id); setItem(KEYS.TOMBSTONES, pendingDeletes);
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
    notifyDataChanged();

    if (supabase && isSupabaseConfigured) {
      void currentUserId().then(user_id => user_id ? supabase!.from('ccna_personal_notes').upsert({
        user_id,
        id: note.id,
        title: note.title,
        type: note.type,
        content: note.content,
        image_url: note.imageUrl || null,
        tags: note.tags,
        is_favorite: note.isFavorite,
        created_at: note.createdAt,
        updated_at: new Date().toISOString()
      }) : null).then(result => {
        const error = result && result.error;
        if (error) console.error('Error upserting note to Supabase:', error);
      });
    }

    return note;
  },
  deleteNote: (id: string): void => {
    markDeleted('notes', id);
    const list = repository.getNotes().filter(n => n.id !== id);
    setItem(KEYS.NOTES, list);
    notifyDataChanged();
    if (supabase && isSupabaseConfigured) {
      void currentUserId().then(user_id => user_id ? supabase!.from('ccna_personal_notes').delete().eq('id', id).eq('user_id', user_id) : null).then(result => {
        const error = result && result.error;
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
    if (supabase) void currentUserId().then(user_id => user_id ? supabase!.from('ccna_user_images').upsert({ user_id, id, data_url: dataUrl, updated_at: new Date().toISOString() }) : null).then(result => {
      if (result?.error) console.error('Error syncing image to Supabase:', result.error);
    });
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
      notes: repository.getNotes(),
      images: getItem<Record<string, string>>(KEYS.IMAGES, {})
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
      if (parsed.images && typeof parsed.images === 'object' && !Array.isArray(parsed.images)) {
        const currentImages = getItem<Record<string, string>>(KEYS.IMAGES, {});
        setItem(KEYS.IMAGES, { ...currentImages, ...parsed.images });
      }

      if (repository.isCloudSyncEnabled()) {
        repository.syncFromCloud();
      }
      notifyDataChanged();

      return { success: true, count, message: `Khôi phục thành công ${count} mục dữ liệu.` };
    } catch (err: any) {
      return { success: false, count: 0, message: 'File JSON không hợp lệ.' };
    }
  }
};
