'use client';

import React, { useState } from 'react';
import { Inbox, CheckCircle2, ArrowRight, Image as ImageIcon, X } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { LessonBlock, BlockType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { handleClipboardImagePaste } from '@/lib/utils';

interface ParsedBlock {
  id: string;
  type: BlockType;
  title: string;
  content: string;
  imageUrl?: string;
}

function parsePastedText(raw: string): ParsedBlock[] {
  const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    const id = `pb-${i}-${Date.now()}`;
    const firstLine = block.split('\n')[0].trim();

    // Image URL detection in text
    let detectedImg = '';
    const imgMatch = block.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|svg|webp))/i);
    if (imgMatch) {
      detectedImg = imgMatch[1];
    }

    if (/^[\w.-]+(?:\([^)]*\))?[#>]\s*/.test(firstLine) || /^(?:show\s+|configure(?:\s+terminal)?\b|interface\s+\S+|router\s+\S+|vlan\s+\d+|switchport\s+|ip\s+(?:address|route)\s+|no\s+shutdown\b|enable\b|hostname\s+)/i.test(firstLine)) {
      return { id, type: 'cisco-command' as BlockType, title: '', content: block, imageUrl: detectedImg || undefined };
    }

    if (/^(cảnh báo|warning|lưu ý quan trọng)/i.test(block)) {
      return { id, type: 'warning' as BlockType, title: 'Cảnh báo', content: block, imageUrl: detectedImg || undefined };
    }

    if (/^(ghi chú|lưu ý|note)/i.test(block)) {
      return { id, type: 'note' as BlockType, title: 'Ghi chú', content: block, imageUrl: detectedImg || undefined };
    }

    return { id, type: 'paragraph' as BlockType, title: '', content: block, imageUrl: detectedImg || undefined };
  });
}

import { VisualDocEditor, VisualDocItem, docItemsToBlocks } from '@/components/ui/visual-doc-editor';

const SAMPLE = `VLAN là mạng LAN ảo giúp phân chia broadcast domain trên switch.

SW1(config)# vlan 10
SW1(config-vlan)# name SALES

SW1(config)# interface FastEthernet0/1
SW1(config-if)# switchport mode access
SW1(config-if)# switchport access vlan 10

Lưu ý:
Cổng access port chỉ thuộc về một VLAN duy nhất.`;

export default function SmartPastePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawText, setRawText] = useState(SAMPLE);
  const [docItems, setDocItems] = useState<VisualDocItem[]>([]);
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [lessonTitle, setLessonTitle] = useState('Bài Học Từ Smart Paste');
  const [lessonImageUrl, setLessonImageUrl] = useState('');
  const { toast } = useToast();

  const handleParse = () => {
    if (docItems.length > 0) {
      const generated = docItemsToBlocks(docItems);
      setParsedBlocks(generated.map(b => ({
        id: b.id,
        type: b.type,
        title: b.title,
        content: b.content
      })));
    } else if (rawText.trim()) {
      setParsedBlocks(parsePastedText(rawText));
    } else {
      return;
    }
    setStep(2);
    toast('Đã nhận diện!', `Đã phân tích xong nội dung và hình ảnh bài học.`, 'success');
  };

  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setLessonImageUrl(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBlockImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const url = ev.target.result as string;
        setParsedBlocks(prev => prev.map(b => b.id === id ? { ...b, imageUrl: url } : b));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Ctrl+V Paste of Images in Step 1 Textarea
  const handleStep1Paste = (e: React.ClipboardEvent) => {
    handleClipboardImagePaste(e, (dataUrl) => {
      setLessonImageUrl(dataUrl);
      toast('Đã dán ảnh!', 'Ảnh chụp màn hình (Ctrl+V) đã hiện trực tiếp bên dưới.', 'success');
    });
  };

  const handleSave = () => {
    if (!lessonTitle.trim()) return;
    try {
      repository.saveLesson({
      id: `les-paste-${Date.now()}`,
      title: lessonTitle,
      topic: 'Smart Paste',
      summary: 'Tự động phân loại từ văn bản dán.',
      tags: ['SmartPaste'],
      imageUrl: lessonImageUrl.trim() || undefined,
      blocks: parsedBlocks.map(b => ({ id: b.id, type: b.type, title: b.title, content: b.content, imageUrl: b.imageUrl })),
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
      });
    } catch {
      toast('Chưa lưu được', 'Bộ nhớ trình duyệt đã đầy. Hãy giảm kích thước ảnh hoặc sao lưu dữ liệu rồi thử lại.', 'error');
      return;
    }
    toast('Đã lưu!', `Bài học "${lessonTitle}" đã được tạo.`, 'success');
    setStep(1);
    setRawText('');
    setParsedBlocks([]);
    setLessonImageUrl('');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Inbox className="w-5 h-5 text-amber-500" /> Smart Paste
          </h1>
          <p className="text-xs text-muted-foreground">Dán nội dung hoặc Dán Ảnh (Ctrl+V) → Tự động nhận diện → Lưu thành bài học.</p>
        </div>
        {step === 2 && (
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Lưu Bài Học
          </Button>
        )}
      </div>

      {step === 1 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Bước 1: Soạn/Dán văn bản bài học & Dán Ảnh (Ctrl+V) tại vị trí mong muốn</span>
              <button onClick={() => setRawText(SAMPLE)} className="text-xs text-amber-500 hover:underline font-bold">Nạp bài mẫu</button>
            </div>

            <VisualDocEditor 
              initialText={rawText} 
              onChange={setRawText} 
              onDocItemsChange={setDocItems} 
            />

            <div className="flex justify-end pt-2">
              <Button onClick={handleParse} className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md">
                Nhận Diện Nội Dung & Hình Ảnh <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Tiêu đề bài học</label>
              <input 
                type="text" 
                value={lessonTitle} 
                onChange={e => setLessonTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ring" 
              />
            </div>

            {/* Main Image Attachment */}
            <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Ảnh bìa / Sơ đồ chính (Dán Ctrl+V hoặc dán URL)
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={lessonImageUrl} 
                  onChange={e => setLessonImageUrl(e.target.value)}
                  onPaste={handleStep1Paste}
                  placeholder="Dán link ảnh (URL) hoặc Ctrl+V dán ảnh từ clipboard..."
                  className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded text-xs font-mono"
                />
                <label className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-input rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap">
                  Tải ảnh
                  <input type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" />
                </label>
              </div>
              {lessonImageUrl && (
                <div className="relative p-2 bg-[#14120e] border border-border rounded-lg flex items-center justify-between">
                  <img src={lessonImageUrl} alt="Preview" className="h-14 object-contain rounded" />
                  <button type="button" onClick={() => setLessonImageUrl('')} className="p-1 text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Bước 2: Kết quả nhận diện ({parsedBlocks.length} phần)</span>
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">Dán lại</Button>
          </div>

          {parsedBlocks.map(b => (
            <Card key={b.id}>
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={b.type === 'cisco-command' ? 'info' : b.type === 'warning' ? 'danger' : b.type === 'note' ? 'warning' : 'default'} className="font-bold">
                    {b.type}
                  </Badge>
                  <label className="text-[11px] font-bold text-amber-500 hover:underline cursor-pointer flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Ảnh đính kèm cuối phần
                    <input type="file" accept="image/*" onChange={e => handleBlockImageUpload(b.id, e)} className="hidden" />
                  </label>
                </div>

                <VisualDocEditor
                  initialText={b.content}
                  onChange={content => setParsedBlocks(prev => prev.map(item => item.id === b.id ? { ...item, content } : item))}
                  compact
                />

                {b.imageUrl && (
                  <div className="relative p-2.5 bg-[#14120e] border border-amber-500/40 rounded-xl flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img src={b.imageUrl} alt="Block preview" className="h-24 max-w-xs object-contain rounded-lg border border-amber-500/30" />
                      <div>
                        <span className="text-xs font-bold text-amber-400 block">Ảnh đính kèm</span>
                        <span className="text-[10px] text-muted-foreground">Hiển thị sau nội dung phần này.</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setParsedBlocks(prev => prev.map(item => item.id === b.id ? { ...item, imageUrl: undefined } : item))} 
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
