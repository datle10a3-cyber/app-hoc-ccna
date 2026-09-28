'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Save, X } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { PersonalNote } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { VisualDocEditor } from '@/components/ui/visual-doc-editor';
import { handleClipboardImagePaste } from '@/lib/utils';

function NoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const draftKey = `ccna-note-draft:${editId || 'new'}`;
  const [draftReady, setDraftReady] = useState(false);
  const [note, setNote] = useState<PersonalNote | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Ghi chú thường');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let restored = false;
    try {
      const rawDraft = sessionStorage.getItem(draftKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as { title?: string; type?: string; tags?: string; content?: string; imageUrl?: string };
        setTitle(draft.title || '');
        setType(draft.type || 'Ghi chú thường');
        setTags(draft.tags || '');
        setContent(draft.content || '');
        setImageUrl(draft.imageUrl || '');
        restored = true;
      }
    } catch { /* Ignore an invalid or unavailable draft. */ }
    if (editId) {
      const existing = repository.getNoteById(editId);
      if (existing) {
        setNote(existing);
        if (!restored) {
          setTitle(existing.title);
          setType(existing.type || 'Ghi chú thường');
          setTags(existing.tags.join(', '));
          setContent(existing.content);
          setImageUrl(existing.imageUrl || '');
        }
      }
    }
    setDraftReady(true);
  }, [draftKey, editId]);

  useEffect(() => {
    if (!draftReady) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ title, type, tags, content, imageUrl })); }
    catch { /* Keep the current editing session usable when the draft exceeds storage limits. */ }
  }, [draftReady, draftKey, title, type, tags, content, imageUrl]);

  const uploadImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => { if (event.target?.result) setImageUrl(event.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleImagePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    handleClipboardImagePaste(event, dataUrl => setImageUrl(dataUrl));
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const saved: PersonalNote = {
      id: note?.id || `note-${Date.now()}`,
      title: title.trim(),
      type: type.trim() || 'Ghi chú thường',
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      isFavorite: note?.isFavorite || false,
      createdAt: note?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      repository.saveNote(saved);
      try { sessionStorage.removeItem(draftKey); } catch { /* Saving the note must not depend on session storage. */ }
    } catch {
      toast('Chưa lưu được', 'Bộ nhớ trình duyệt đã đầy. Hãy giảm kích thước ảnh hoặc sao lưu dữ liệu rồi thử lại.', 'error');
      return;
    }
    toast('Đã lưu!', note ? `Đã cập nhật ghi chú “${saved.title}”.` : `Ghi chú “${saved.title}” đã được tạo.`, 'success');
    router.push(`/notes/${saved.id}`);
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-4 pb-12">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => router.back()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"><ArrowLeft className="w-3.5 h-3.5" /> Quay lại</button>
        <Button type="submit" size="sm" className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"><Save className="w-3.5 h-3.5" /> {note ? 'Cập Nhật Ghi Chú' : 'Lưu Ghi Chú'}</Button>
      </div>

      <Card><CardContent className="p-4 space-y-3">
        <div>
          <label className="text-xs font-bold text-foreground block mb-1">Tiêu đề ghi chú *</label>
          <input type="text" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ví dụ: Cách xử lý lỗi VLAN không thông" className="w-full px-3 py-2 bg-muted/30 border border-input rounded-md text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ring" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Loại ghi chú</label>
            <input type="text" list="note-types" value={type} onChange={event => setType(event.target.value)} placeholder="Ghi chú thường" className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" />
            <datalist id="note-types">{['Ghi chú thường', 'Cần nhớ', 'Quan trọng', 'Lỗi gặp phải', 'Cách fix', 'Kiến thức mới'].map(value => <option key={value} value={value} />)}</datalist>
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Tags (phẩy)</label>
            <input type="text" value={tags} onChange={event => setTags(event.target.value)} placeholder="CCNA, VLAN" className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" />
          </div>
        </div>
        <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Ảnh bìa / sơ đồ (tùy chọn)</label>
          <div className="flex items-center gap-2">
            <input type="text" value={imageUrl} onChange={event => setImageUrl(event.target.value)} onPaste={handleImagePaste} placeholder="Dán URL hoặc Ctrl+V dán ảnh" className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded text-xs font-mono" />
            <label className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-input rounded text-xs font-bold cursor-pointer whitespace-nowrap">Tải ảnh<input type="file" accept="image/*" onChange={event => uploadImage(event.target.files?.[0])} className="hidden" /></label>
          </div>
          {imageUrl && <div className="relative p-2 bg-[#14120e] border border-border rounded-lg flex items-center justify-between"><img src={imageUrl} alt="Xem trước" className="h-14 max-w-[80%] object-contain rounded" /><button type="button" onClick={() => setImageUrl('')} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Xóa ảnh"><X className="w-4 h-4" /></button></div>}
        </div>
      </CardContent></Card>

      <div className="space-y-3">
        <span className="text-xs font-bold text-foreground">Nội dung ghi chú</span>
        <Card><CardContent className="p-4"><VisualDocEditor key={note?.id || 'new-note'} initialText={content} onChange={setContent} compact /></CardContent></Card>
      </div>
    </form>
  );
}

export default function NewNotePage() {
  return <Suspense fallback={<div className="text-center py-12 text-sm text-muted-foreground">Đang tải biểu mẫu…</div>}><NoteForm /></Suspense>;
}
