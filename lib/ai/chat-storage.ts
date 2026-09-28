export type SavedChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  imageUrl?: string;
  sources?: { id: string; kind: string; title: string; href: string }[];
  offline?: boolean;
};

const DB_NAME = 'ccna_ai_chat';
const STORE_NAME = 'conversations';
const CHAT_KEY = 'current';
const FALLBACK_KEY = 'ccna_ai_chat_saved_v2';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function fromDatabase(): Promise<SavedChatMessage[] | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(CHAT_KEY);
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

async function toDatabase(messages: SavedChatMessage[]): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(messages, CHAT_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

function validMessages(value: unknown): SavedChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SavedChatMessage =>
    Boolean(item && typeof item === 'object' && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string'))
    .map(item => ({
      ...item,
      images: Array.isArray(item.images) ? item.images.filter((url: unknown): url is string => typeof url === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/.test(url))
        : item.imageUrl && /^data:image\/(?:png|jpeg|webp);base64,/.test(item.imageUrl) ? [item.imageUrl] : []
    }));
}

export async function loadChat(): Promise<SavedChatMessage[]> {
  try {
    const stored = await fromDatabase();
    if (stored) return validMessages(stored);
  } catch { /* IndexedDB may be unavailable; use local fallback. */ }
  for (const [storage, key] of [[localStorage, FALLBACK_KEY], [sessionStorage, 'ccna_ai_chat_v1']] as const) {
    try {
      const raw = storage.getItem(key);
      if (raw) return validMessages(JSON.parse(raw));
    } catch { /* Try the next local source. */ }
  }
  return [];
}

export async function saveChat(messages: SavedChatMessage[]): Promise<void> {
  try {
    await toDatabase(messages);
    try { localStorage.removeItem(FALLBACK_KEY); sessionStorage.removeItem('ccna_ai_chat_v1'); } catch { /* No effect on saved data. */ }
    return;
  } catch { /* Preserve text if IndexedDB is blocked. */ }
  const textOnly = messages.map(({ images: _images, imageUrl: _imageUrl, ...message }) => message);
  try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(textOnly)); }
  catch { /* Chat remains available while this tab stays open. */ }
}

export async function clearChatStorage(): Promise<void> {
  try { await toDatabase([]); } catch { /* Clear other available storage below. */ }
  try { localStorage.removeItem(FALLBACK_KEY); sessionStorage.removeItem('ccna_ai_chat_v1'); } catch { /* Storage may be disabled. */ }
}
