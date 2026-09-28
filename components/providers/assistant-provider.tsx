'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { buildKnowledgeIndex, selectKnowledgeSources } from '@/lib/ai/knowledge';
import { retrievalQuery } from '@/lib/ai/conversation';
import { clearChatStorage, loadChat, saveChat, SavedChatMessage } from '@/lib/ai/chat-storage';

export type AttachedImage = { mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; data: string; preview: string };
type AiStatus = { configured: boolean; provider: string | null; model: string; geminiFallbackConfigured?: boolean };
type ChatContextValue = {
  messages: SavedChatMessage[];
  busy: boolean;
  ready: boolean;
  error: string;
  status: AiStatus | null;
  sendQuestion: (text: string, images?: AttachedImage[]) => Promise<boolean>;
  clearChat: () => Promise<void>;
  setError: (value: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<SavedChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<AiStatus | null>(null);
  const messagesRef = useRef<SavedChatMessage[]>([]);
  const busyRef = useRef(false);
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const persist = useCallback((next: SavedChatMessage[]) => {
    saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(() => saveChat(next));
  }, []);

  const updateMessages = useCallback((next: SavedChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
    persist(next);
  }, [persist]);

  useEffect(() => {
    let active = true;
    void loadChat().then(saved => {
      if (!active) return;
      messagesRef.current = saved;
      setMessages(saved);
      setReady(true);
      // Migrate the earlier session-only history into durable storage.
      persist(saved);
    });
    void fetch('/api/ai/chat').then(response => response.json()).then(data => {
      if (active) setStatus(data);
    }).catch(() => {
      if (active) setStatus({ configured: false, provider: null, model: '' });
    });
    return () => { active = false; };
  }, [persist]);

  const clearChat = useCallback(async () => {
    generationRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    setBusy(false);
    setError('');
    messagesRef.current = [];
    setMessages([]);
    saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(() => clearChatStorage());
    await saveQueueRef.current;
  }, []);

  const sendQuestion = useCallback(async (text: string, images: AttachedImage[] = []): Promise<boolean> => {
    const current = text.trim() || (images.length ? 'Hãy xem tất cả ảnh này, cho biết vấn đề chính và cách xử lý.' : '');
    if (!ready || !status || !current || busyRef.current) return false;
    const generation = generationRef.current;
    busyRef.current = true;
    setBusy(true);
    setError('');
    const previous = messagesRef.current;
    const allSources = buildKnowledgeIndex();
    const selected = selectKnowledgeSources(allSources, retrievalQuery(current, previous));
    const links = selected.map(({ id, kind, title, href }) => ({ id, kind, title, href }));
    const history = previous.filter(message => !message.offline).slice(-24).map(({ role, content }) => ({ role, content }));
    const olderQuestions = previous.slice(0, -24).filter(message => message.role === 'user').map(message => message.content).join('\n');
    const earlierContext = olderQuestions.length > 6000
      ? `${olderQuestions.slice(0, 2000)}\n…\n${olderQuestions.slice(-4000)}` : olderQuestions;
    updateMessages([...previous, { role: 'user', content: current, images: images.map(image => image.preview) }]);

    try {
      if (!status.configured && !(images.length && status.geminiFallbackConfigured)) {
        const answer = selected.length
          ? `Chưa cấu hình API key AI, nên đây là kết quả tìm trong dữ liệu ứng dụng, chưa phải câu trả lời AI. Mình đã quét ${allSources.length} đoạn nội dung và tìm thấy ${selected.length} đoạn liên quan. Mở các nguồn bên dưới để xem nội dung đầy đủ.`
          : `Chưa cấu hình API key AI. Mình đã quét ${allSources.length} đoạn nội dung nhưng chưa tìm thấy mục khớp với câu hỏi này.`;
        updateMessages([...messagesRef.current, { role: 'assistant', content: answer, sources: links, offline: true }]);
        return true;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ question: current, sources: selected, history, earlierContext,
          ...(images.length ? { images: images.map(({ mimeType, data }) => ({ mimeType, data })) } : {}) })
      });
      const data = await response.json();
      if (generation !== generationRef.current) return true;
      if (!response.ok) throw new Error(data.error || 'Không thể nhận câu trả lời.');
      updateMessages([...messagesRef.current, { role: 'assistant', content: data.answer, sources: links }]);
    } catch (cause) {
      if (generation === generationRef.current && !(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'Không thể kết nối AI. Vui lòng thử lại.');
      }
    } finally {
      if (generation === generationRef.current) {
        abortRef.current = null;
        busyRef.current = false;
        setBusy(false);
      }
    }
    return true;
  }, [ready, status, updateMessages]);

  return <ChatContext.Provider value={{ messages, busy, ready, error, status, sendQuestion, clearChat, setError }}>{children}</ChatContext.Provider>;
}

export function useAssistantChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) throw new Error('AssistantProvider is missing.');
  return context;
}
