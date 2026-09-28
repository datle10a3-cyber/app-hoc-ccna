'use client';

import React, { useState, useEffect } from 'react';
import { StickyNote, Search, Plus, Trash2, Copy, Check, ExternalLink, Calendar, Edit3, Image as ImageIcon, X, Maximize2, Eye } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { PersonalNote, NoteType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { stripImageTagsFromText } from '@/lib/utils';
import { FormattedInlineText } from '@/components/ui/formatted-inline-text';
import { VisualDocEditor } from '@/components/ui/visual-doc-editor';
import { richDocumentPlainText } from '@/lib/rich-document';

export default function NotesPage() {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  
  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [selectedNote, setSelectedNote] = useState<PersonalNote | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<NoteType>('Ghi chú thường');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    const savedNotes = repository.getNotes();
    setNotes(savedNotes);
    const linkedNoteId = new URLSearchParams(window.location.search).get('note');
    if (linkedNoteId) setSelectedNote(savedNotes.find(note => note.id === linkedNoteId) || null);
  }, []);

  const filtered = notes.filter(n => {
    const matchQ = n.title.toLowerCase().includes(query.toLowerCase()) || n.content.toLowerCase().includes(query.toLowerCase());
    const matchT = selectedType === 'All' || n.type === selectedType;
    return matchQ && matchT;
  });

  const handleOpenAdd = () => {
    setEditingNote(null);
    setTitle('');
    setType('Ghi chú thường');
    setContent('');
    setImageUrl('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (note: PersonalNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingNote(note);
    setTitle(note.title);
    setType(note.type);
    setContent(note.content);
    setImageUrl(note.imageUrl || '');
    if (selectedNote?.id === note.id) setSelectedNote(null);
    setIsAddOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setImageUrl(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const noteToSave: PersonalNote = {
      id: editingNote ? editingNote.id : `note-${Date.now()}`,
      title: title.trim(),
      type: type.trim() || 'Ghi chú thường',
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
      tags: editingNote ? editingNote.tags : [],
      isFavorite: editingNote ? editingNote.isFavorite : false,
      createdAt: editingNote ? editingNote.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      repository.saveNote(noteToSave);
    } catch {
      toast('Chưa lưu được', 'Bộ nhớ trình duyệt đã đầy. Hãy giảm kích thước ảnh hoặc sao lưu dữ liệu rồi thử lại.', 'error');
      return;
    }
    setNotes(repository.getNotes());
    toast('Đã lưu!', editingNote ? `Đã cập nhật ghi chú "${title}".` : `Ghi chú "${title}" đã được tạo.`, 'success');
    setIsAddOpen(false);
    setEditingNote(null);
    setTitle(''); 
    setContent('');
    setImageUrl('');
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Xóa ghi chú này?')) {
      repository.deleteNote(id);
      setNotes(repository.getNotes());
      if (selectedNote?.id === id) setSelectedNote(null);
      toast('Đã xóa', 'Đã xóa ghi chú.', 'info');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const suggestedNoteTypes: NoteType[] = [
    'Ghi chú thường', 'Cần nhớ', 'Quan trọng', 'Lỗi gặp phải', 'Cách fix', 'Kiến thức mới'
  ];
  const noteTypes = Array.from(new Set([
    ...suggestedNoteTypes,
    ...notes.map(note => note.type).filter(Boolean)
  ]));

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-500" /> Ghi Chú Cá Nhân
          </h1>
          <p className="text-xs text-muted-foreground">Kinh nghiệm, sự cố thường gặp & cách khắc phục.</p>
        </div>
        <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs">
          <Plus className="w-3.5 h-3.5" /> Thêm Ghi Chú & Sơ Đồ
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
          <input 
            type="text" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Tìm theo tiêu đề hoặc nội dung ghi chú..."
            className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring" 
          />
        </div>
        <select 
          value={selectedType} 
          onChange={e => setSelectedType(e.target.value)}
          className="px-2.5 py-1.5 bg-muted/30 border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
        >
          <option value="All">Tất cả ({notes.length})</option>
          {noteTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Compact Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map(n => (
          <Card 
            key={n.id} 
            onClick={() => setSelectedNote(n)}
            className="hover:border-amber-500/40 transition-all cursor-pointer border-border/80 shadow-xs group"
          >
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <Badge 
                    variant="warning" 
                    className="text-[10px] bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 font-bold"
                  >
                    {n.type}
                  </Badge>
                  {n.imageUrl && (
                    <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                      <ImageIcon className="w-3 h-3" /> Ảnh
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => handleOpenEdit(n, e)} 
                    className="p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-muted transition-colors opacity-70 group-hover:opacity-100"
                    title="Sửa ghi chú"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(n.id, e)} 
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors opacity-70 group-hover:opacity-100"
                    title="Xóa ghi chú"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors line-clamp-2">
                {n.title}
              </h3>

              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {stripImageTagsFromText(n.content) || 'Ghi chú có hình ảnh'}
              </p>

              {/* Attached Image Thumbnail */}
              {n.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-border bg-[#14120e] max-h-24 p-0.5 flex items-center justify-center">
                  <img src={n.imageUrl} alt={n.title} className="max-h-20 object-contain rounded" />
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-500/70" />
                  {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                </span>
                <span className="text-amber-500 font-bold flex items-center gap-0.5 group-hover:underline">
                  Xem <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-xl p-6">
          <StickyNote className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-foreground">Chưa có ghi chú nào.</p>
          <p className="text-xs text-muted-foreground mt-1">Bấm "+ Thêm Ghi Chú & Sơ Đồ" để lưu mẹo học của bạn.</p>
        </div>
      )}

      {/* Note Detail Modal */}
      {selectedNote && (
        <Modal 
          isOpen={Boolean(selectedNote)} 
          onClose={() => setSelectedNote(null)} 
          title={`Ghi Chú: ${selectedNote.title}`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
              <Badge variant="warning" className="text-xs bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 font-bold">
                {selectedNote.type}
              </Badge>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(selectedNote)}
                  className="gap-1 text-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Sửa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(richDocumentPlainText(selectedNote.content))}
                  className="gap-1 text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-amber-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã copy' : 'Copy'}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(selectedNote.id)}
                  className="gap-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-extrabold text-foreground">{selectedNote.title}</h2>
              <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-5">
                <FormattedInlineText text={selectedNote.content} onZoomImage={url => setLightboxImage(url)} className="text-sm leading-7 text-foreground" />
              </div>

              {/* Detail Image View */}
              {selectedNote.imageUrl && (
                <button type="button" onClick={() => setLightboxImage(selectedNote.imageUrl!)}
                  className="group relative flex w-full justify-center overflow-hidden rounded-xl border border-border bg-muted/20 p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  aria-label="Xem lớn ảnh đính kèm">
                  <img src={selectedNote.imageUrl} alt={selectedNote.title} className="max-h-60 max-w-full rounded-lg object-contain" />
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground opacity-0 group-hover:opacity-100 group-focus:opacity-100"><Eye className="h-3.5 w-3.5" /> Xem lớn</span>
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedNote(null)}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <Modal isOpen={Boolean(lightboxImage)} onClose={() => setLightboxImage(null)} title="Ảnh Ghi Chú Phóng To">
          <div className="space-y-3">
            <div className="p-2 bg-[#14120e] rounded-xl border border-border flex items-center justify-center min-h-[250px]">
              <img src={lightboxImage} alt="Ghi chú" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setLightboxImage(null)}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Modal */}
      <Modal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        title={editingNote ? "Sửa Ghi Chú & Ảnh" : "Thêm Ghi Chú & Sơ Đồ Mới"}
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Loại ghi chú (có thể tự nhập)</label>
            <input
              type="text"
              list="note-type-suggestions"
              value={type} 
              onChange={e => setType(e.target.value)}
              placeholder="Nhập loại ghi chú hoặc chọn gợi ý"
              className="w-full px-2.5 py-1.5 bg-muted/30 border border-input rounded-md text-xs font-medium"
            />
            <datalist id="note-type-suggestions">
              {noteTypes.map(noteType => <option key={noteType} value={noteType} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Tiêu đề *</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="VD: Trunk không chạy VLAN 30"
              className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" 
              required 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Nội dung ghi chú *</label>
            <VisualDocEditor key={editingNote?.id || 'new-note'} initialText={content} onChange={setContent} compact />
          </div>

          {/* Image Upload for Personal Note */}
          <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Ảnh sơ đồ / Ghi chú đính kèm (Không bắt buộc)
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={imageUrl} 
                onChange={e => setImageUrl(e.target.value)}
                placeholder="Dán link ảnh (URL) hoặc chọn file..."
                className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded text-xs font-mono"
              />
              <label className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-input rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap">
                Tải ảnh
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
            {imageUrl && (
              <div className="relative p-2 bg-[#14120e] border border-border rounded-lg flex items-center justify-between">
                <img src={imageUrl} alt="Preview" className="h-14 object-contain rounded" />
                <button type="button" onClick={() => setImageUrl('')} className="p-1 text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Hủy</Button>
            <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs">
              {editingNote ? 'Cập Nhật Ghi Chú' : 'Lưu Ghi Chú'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
