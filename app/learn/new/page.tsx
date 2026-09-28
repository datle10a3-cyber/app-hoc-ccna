'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { LessonBlock, BlockType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { handleClipboardImagePaste } from '@/lib/utils';
import { VisualDocEditor } from '@/components/ui/visual-doc-editor';
import { isRichDocument } from '@/lib/rich-document';

// Split one pasted document into readable numbered sections when it is saved.
// The editor stays as one continuous document, so users do not need to create
// a block for every heading themselves.
function splitNumberedSections(block: LessonBlock): LessonBlock[] {
  if (block.type !== 'paragraph' || isRichDocument(block.content)) return [block];

  const lines = block.content.split('\n');
  const headingIndexes: number[] = [];
  lines.forEach((line, index) => {
    if (/^\s*\d{1,2}[.)]\s+\S/.test(line)) headingIndexes.push(index);
  });
  if (headingIndexes.length < 2) return [block];

  const starts = headingIndexes[0] === 0 ? headingIndexes : [0, ...headingIndexes];
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? lines.length;
    const content = lines.slice(start, end).join('\n').trim();
    return {
      ...block,
      id: `${block.id}-section-${index + 1}`,
      content,
      // Keep a legacy end-of-block image attached to the final section.
      imageUrl: index === starts.length - 1 ? block.imageUrl : undefined,
    };
  }).filter(section => section.content || section.imageUrl);
}

function NewLessonForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const draftKey = `ccna-lesson-draft:${editId || 'new'}`;

  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('Network Access');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('CCNA');
  const [imageUrl, setImageUrl] = useState('');
  const [blocks, setBlocks] = useState<LessonBlock[]>([
    { id: 'b-1', type: 'paragraph', content: '' }
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let restored = false;
    try {
      const rawDraft = sessionStorage.getItem(draftKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as { title?: string; topic?: string; summary?: string; tags?: string; imageUrl?: string; blocks?: LessonBlock[] };
        setTitle(draft.title || '');
        setTopic(draft.topic || 'Network Access');
        setSummary(draft.summary || '');
        setTags(draft.tags || 'CCNA');
        setImageUrl(draft.imageUrl || '');
        if (Array.isArray(draft.blocks) && draft.blocks.length) setBlocks(draft.blocks);
        restored = true;
      }
    } catch { /* Ignore an invalid or unavailable draft. */ }
    if (editId) {
      const existing = repository.getLessonById(editId);
      if (existing) {
        setIsEditing(true);
        if (!restored) {
          setTitle(existing.title);
          setTopic(existing.topic);
          setSummary(existing.summary);
          setImageUrl(existing.imageUrl || '');
          setTags(existing.tags.join(', '));
          setBlocks(existing.blocks && existing.blocks.length > 0 ? existing.blocks : [{ id: 'b-1', type: 'paragraph', content: '' }]);
        }
      }
    }
    setDraftReady(true);
  }, [draftKey, editId]);

  useEffect(() => {
    if (!draftReady) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ title, topic, summary, tags, imageUrl, blocks })); }
    catch { /* Keep the current editing session usable when the draft exceeds storage limits. */ }
  }, [draftReady, draftKey, title, topic, summary, tags, imageUrl, blocks]);

  const addBlock = (type: BlockType) => {
    setBlocks(prev => [...prev, { id: `b-${Date.now()}`, type, content: '' }]);
  };

  const updateBlock = (id: string, rawContent: string, blockImg?: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: rawContent, imageUrl: blockImg !== undefined ? blockImg : b.imageUrl } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setImageUrl(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMainImagePaste = (e: React.ClipboardEvent) => {
    handleClipboardImagePaste(e, (dataUrl) => {
      setImageUrl(dataUrl);
      toast('Đã dán ảnh bìa!', 'Ảnh từ Clipboard (Ctrl+V) đã được nạp.', 'success');
    });
  };

  const handleBlockImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const url = ev.target.result as string;
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, imageUrl: url } : b));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let saved;
    try {
      saved = repository.saveLesson({
      id: editId || `les-${Date.now()}`,
      title,
      topic,
      summary: summary || title,
      imageUrl: imageUrl.trim() || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      blocks: blocks
        .filter(b => b.content.trim() || b.imageUrl)
        .flatMap(splitNumberedSections),
      isFavorite: false,
      createdAt: editId ? (repository.getLessonById(editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
      });
      try { sessionStorage.removeItem(draftKey); } catch { /* Saving the lesson must not depend on session storage. */ }
    } catch {
      toast('Chưa lưu được', 'Bộ nhớ trình duyệt đã đầy. Hãy giảm kích thước ảnh hoặc sao lưu dữ liệu rồi thử lại.', 'error');
      return;
    }

    toast('Đã lưu!', isEditing ? `Đã cập nhật bài học "${title}".` : `Bài học "${title}" đã được tạo.`, 'success');
    router.push(`/learn/${saved.id}`);
  };

  const blockTypes: { type: BlockType; label: string }[] = [
    { type: 'paragraph', label: 'Văn bản' },
    { type: 'cisco-command', label: 'Lệnh Cisco' },
    { type: 'note', label: 'Ghi chú' },
    { type: 'warning', label: 'Cảnh báo' },
    { type: 'heading', label: 'Tiêu đề' },
  ];

  return (
    <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.back()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
        </button>
        <Button type="submit" size="sm" className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
          <Save className="w-3.5 h-3.5" /> {isEditing ? 'Cập Nhật Bài Học' : 'Lưu Bài Học'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Tiêu đề bài học *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: STP Cơ Bản & Cấu Hình Root Bridge" className="w-full px-3 py-2 bg-muted/30 border border-input rounded-md text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ring" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Chủ đề (Topic)</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Tags (phẩy)</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Tóm tắt bài học</label>
            <input type="text" value={summary} onChange={e => setSummary(e.target.value)} placeholder="Tóm tắt ngắn gọn nội dung bài học..." className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" />
          </div>

          {/* Main Lesson Image Upload & Ctrl+V Paste */}
          <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Ảnh bìa / Sơ đồ chính (Dán Ctrl+V hoặc dán URL)
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={imageUrl} 
                onChange={e => setImageUrl(e.target.value)}
                onPaste={handleMainImagePaste}
                placeholder="Dán link ảnh (URL) hoặc Ctrl+V dán ảnh chụp màn hình..."
                className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded text-xs font-mono"
              />
              <label className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-input rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap">
                Tải ảnh
                <input type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" />
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
        </CardContent>
      </Card>

      {/* Blocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Nội dung các phần</span>
          <div className="flex gap-1.5 flex-wrap">
            {blockTypes.map(bt => (
              <button key={bt.type} type="button" onClick={() => addBlock(bt.type)}
                className="text-[11px] font-bold px-2.5 py-1 rounded border border-amber-500/30 hover:bg-amber-500/10 text-amber-500 dark:text-amber-400 transition-colors">
                + {bt.label}
              </button>
            ))}
          </div>
        </div>

        {blocks.map((block, idx) => (
          <div key={block.id} className="p-3 bg-card border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-500">Phần #{idx + 1} ({block.type})</span>
              <button type="button" onClick={() => removeBlock(block.id)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <VisualDocEditor initialText={block.content} onChange={content => updateBlock(block.id, content)} compact />

            {/* Legacy attachment remains separate from images inserted at the caret. */}
            <div className="space-y-1 pt-1">
              <span className="text-xs text-muted-foreground">Ảnh đính kèm cuối phần (tùy chọn)</span>
              <div className="flex items-center gap-2">
              <input 
                type="text"
                value={block.imageUrl || ''}
                onChange={e => updateBlock(block.id, block.content, e.target.value)}
                onPaste={e => handleClipboardImagePaste(e, dataUrl => updateBlock(block.id, block.content, dataUrl))}
                placeholder="Dán URL hoặc ảnh đính kèm..."
                className="flex-1 px-2.5 py-1 bg-background border border-input rounded text-[11px] font-mono"
              />
              <label className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground border border-input rounded text-[11px] font-bold cursor-pointer whitespace-nowrap">
                + Ảnh
                <input type="file" accept="image/*" onChange={e => handleBlockImageUpload(block.id, e)} className="hidden" />
              </label>
              </div>
            </div>
            {block.imageUrl && (
              <div className="relative p-1.5 bg-[#14120e] border border-border rounded-lg flex items-center justify-between">
                <img src={block.imageUrl} alt="Block preview" className="h-14 object-contain rounded" />
                <button type="button" onClick={() => updateBlock(block.id, block.content, '')} className="p-1 text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </form>
  );
}

export default function NewLessonPage() {
  return (
    <Suspense fallback={<p className="text-xs text-muted-foreground text-center py-8">Đang tải...</p>}>
      <NewLessonForm />
    </Suspense>
  );
}
