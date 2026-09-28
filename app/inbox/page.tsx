'use client';

import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ArrowRight, Image as ImageIcon, X, Inbox, StickyNote, Network } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { BlockType, PersonalNote, Topology } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { handleClipboardImagePaste } from '@/lib/utils';
import { isRichDocument } from '@/lib/rich-document';
import { VisualDocEditor, VisualDocItem, serializeDocItems } from '@/components/ui/visual-doc-editor';

type Destination = 'lesson' | 'note' | 'topology';

interface ParsedBlock {
  id: string;
  type: BlockType;
  title: string;
  content: string;
  imageUrl?: string;
}

const makeBlock = (type: BlockType, content: string, title = ''): ParsedBlock => ({
  id: `paste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  title,
  content,
});

function isCommandLine(line: string) {
  return /^(?:[\w.-]+(?:\([^)]*\))?[#>]\s*\S|(?:show\s+|configure(?:\s+terminal)?\b|interface\s+\S+|router\s+\S+|vlan\s+\d+|switchport\s+|ip\s+(?:address|route)\s+|no\s+shutdown\b|enable\b|hostname\s+))/i.test(line.trim());
}

function isHeadingLine(line: string) {
  const value = line.trim();
  if (!value || isCommandLine(value) || /^!\[.*\]\(.*\)$/.test(value)) return false;
  return /^(?:#{1,3}\s+\S|\d{1,3}[.)]\s+\S|[IVXLCDM]{1,6}[.)]\s+\S)/i.test(value)
    || (value.length <= 110 && /[?:：]$/.test(value));
}

/** Splits pasted plain text while retaining the user's bullets, numbering and line breaks. */
function parsePastedText(raw: string): ParsedBlock[] {
  if (!raw.trim()) return [];
  // Keep Word's rich HTML and inline images intact; the editor understands this format.
  if (isRichDocument(raw)) return [makeBlock('paragraph', raw)];

  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ParsedBlock[] = [];
  let paragraph: string[] = [];
  let commands: string[] = [];

  const flushParagraph = () => {
    const content = paragraph.join('\n').trim();
    if (!content) { paragraph = []; return; }
    const firstLine = content.split('\n')[0].trim();
    const warning = /^(?:cảnh báo|warning|lưu ý quan trọng)\b/i.test(firstLine);
    const note = /^(?:ghi chú|lưu ý|note)\b/i.test(firstLine);
    const example = /^(?:ví dụ|example)\b/i.test(firstLine);
    blocks.push(makeBlock(warning ? 'warning' : note ? 'note' : example ? 'example' : 'paragraph', content,
      warning ? 'Cảnh báo' : note ? 'Lưu ý' : example ? 'Ví dụ' : ''));
    paragraph = [];
  };
  const flushCommands = () => {
    const content = commands.join('\n').trim();
    if (content) blocks.push(makeBlock('cisco-command', content));
    commands = [];
  };

  for (const originalLine of lines) {
    const line = originalLine.trimEnd();
    const value = line.trim();
    if (!value) { flushCommands(); flushParagraph(); continue; }

    if (isHeadingLine(value)) {
      flushCommands(); flushParagraph();
      const heading = value.replace(/^#{1,3}\s+/, '');
      const isCallout = /^(?:lưu ý|ghi chú|note)\s*[:：]?$/i.test(heading);
      const isWarning = /^(?:cảnh báo|warning)\s*[:：]?$/i.test(heading);
      blocks.push(makeBlock(isCallout ? 'note' : isWarning ? 'warning' : 'heading', '', heading.replace(/[:：]$/, '')));
      continue;
    }

    if (isCommandLine(value)) {
      flushParagraph(); commands.push(value); continue;
    }
    flushCommands();
    // Keep all bullet glyphs and numbering exactly as pasted, including Word's o bullets.
    paragraph.push(line);
  }
  flushCommands(); flushParagraph();

  // A heading/callout followed by ordinary lines is more useful as a single titled block.
  for (let index = 0; index < blocks.length - 1; index += 1) {
    const current = blocks[index];
    const next = blocks[index + 1];
    if ((current.type === 'note' || current.type === 'warning') && !current.content && next.type === 'paragraph') {
      current.content = next.content;
      blocks.splice(index + 1, 1);
    }
  }
  return blocks;
}

const SAMPLE = `VLAN là mạng LAN ảo giúp phân chia broadcast domain trên switch.\n\nSW1(config)# vlan 10\nSW1(config-vlan)# name SALES\n\nSW1(config)# interface FastEthernet0/1\nSW1(config-if)# switchport mode access\nSW1(config-if)# switchport access vlan 10\n\nLưu ý:\nCổng access port chỉ thuộc về một VLAN duy nhất.`;

const destinations: Array<{ id: Destination; label: string; description: string; icon: typeof BookOpen }> = [
  { id: 'lesson', label: 'Bài học', description: 'Lưu thành bài có các phần nội dung', icon: BookOpen },
  { id: 'note', label: 'Ghi chú', description: 'Lưu toàn bộ nội dung và định dạng', icon: StickyNote },
  { id: 'topology', label: 'Mô hình mạng', description: 'Lưu nội dung kèm sơ đồ tùy chọn', icon: Network },
];

export default function SmartPastePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawText, setRawText] = useState(SAMPLE);
  const [docItems, setDocItems] = useState<VisualDocItem[]>([]);
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [destination, setDestination] = useState<Destination>('lesson');
  const [title, setTitle] = useState('Bài học từ Smart Paste');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const { toast } = useToast();
  const selectedDestination = destinations.find(item => item.id === destination)!;

  const handleParse = () => {
    const pastedContent = docItems.length ? serializeDocItems(docItems) : rawText;
    const generated = parsePastedText(pastedContent);
    if (!generated.length) return;
    setParsedBlocks(generated);
    const suggestedTitle = generated.find(block => block.type === 'heading')?.title.replace(/^\d{1,3}[.)]\s*/, '').trim();
    if (suggestedTitle) setTitle(suggestedTitle);
    setStep(2);
    toast('Đã nhận diện!', `Đã chia nội dung thành ${generated.length} phần.`, 'success');
  };

  const handleMainImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = result => { if (result.target?.result) setCoverImageUrl(result.target.result as string); };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleBlockImageUpload = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = result => {
      if (result.target?.result) setParsedBlocks(previous => previous.map(block => block.id === id ? { ...block, imageUrl: result.target!.result as string } : block));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const now = new Date().toISOString();
    const fullContent = parsedBlocks.map(block => {
      const image = block.imageUrl ? `![Ảnh minh họa](${block.imageUrl})` : '';
      return [block.type === 'heading' ? block.title : '', block.content, image].filter(Boolean).join('\n');
    }).filter(Boolean).join('\n\n').trim();
    try {
      if (destination === 'lesson') {
        repository.saveLesson({
          id: `les-paste-${Date.now()}`, title: cleanTitle, topic: 'Smart Paste',
          summary: 'Tự động phân loại từ nội dung dán.', tags: ['SmartPaste'],
          imageUrl: coverImageUrl.trim() || undefined,
          blocks: parsedBlocks.map(({ id, type, title: blockTitle, content, imageUrl }) => ({ id, type, title: blockTitle, content, imageUrl })),
          isFavorite: false, createdAt: now, updatedAt: now,
        });
      } else if (destination === 'note') {
        const note: PersonalNote = {
          id: `note-paste-${Date.now()}`, title: cleanTitle, type: 'Ghi chú thường', content: fullContent,
          imageUrl: coverImageUrl.trim() || undefined, tags: ['SmartPaste'], isFavorite: false, createdAt: now, updatedAt: now,
        };
        repository.saveNote(note);
      } else {
        const topology: Topology = {
          id: `topo-paste-${Date.now()}`, title: cleanTitle, description: fullContent,
          imageUrl: coverImageUrl.trim() || undefined, nodes: [], links: [], devices: [], ipList: [],
          notes: parsedBlocks.filter(block => block.type === 'note' || block.type === 'warning').map(block => block.content || block.title).filter(Boolean).join('\n\n') || undefined,
          relatedCommandIds: [], isFavorite: false, createdAt: now, updatedAt: now,
        };
        repository.saveTopology(topology);
      }
    } catch {
      toast('Chưa lưu được', 'Bộ nhớ trình duyệt đã đầy. Hãy giảm kích thước ảnh hoặc sao lưu dữ liệu rồi thử lại.', 'error');
      return;
    }
    const destinationLabel = selectedDestination.label.toLocaleLowerCase('vi');
    toast('Đã lưu!', `“${cleanTitle}” đã được thêm vào ${destinationLabel}.`, 'success');
    setStep(1);
    setRawText('');
    setDocItems([]);
    setParsedBlocks([]);
    setCoverImageUrl('');
    setTitle('');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2"><Inbox className="w-5 h-5 text-amber-500" /> Smart Paste</h1>
          <p className="text-xs text-muted-foreground">Dán nội dung, giữ nguyên định dạng và chọn nơi lưu.</p>
        </div>
        {step === 2 && <Button size="sm" onClick={handleSave} disabled={!title.trim()} className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Lưu vào {selectedDestination.label}</Button>}
      </div>

      {step === 1 && <Card><CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between"><span className="text-xs font-bold text-foreground">Dán nội dung hoặc ảnh ở đây</span><button onClick={() => setRawText(SAMPLE)} className="text-xs text-amber-500 hover:underline font-bold">Nạp bài mẫu</button></div>
        <VisualDocEditor initialText={rawText} onChange={setRawText} onDocItemsChange={setDocItems} />
        <div className="flex justify-end pt-2"><Button onClick={handleParse} className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md">Nhận diện nội dung <ArrowRight className="w-3.5 h-3.5" /></Button></div>
      </CardContent></Card>}

      {step === 2 && <div className="space-y-4">
        <Card><CardContent className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-foreground block mb-2">Lưu nội dung vào</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {destinations.map(option => {
                const Icon = option.icon;
                const active = destination === option.id;
                return <button key={option.id} type="button" onClick={() => setDestination(option.id)} aria-pressed={active} className={`text-left rounded-xl border p-3 transition-colors ${active ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-muted/10 hover:bg-muted/30'}`}>
                  <span className="flex items-center gap-2 text-sm font-bold"><Icon className={`h-4 w-4 ${active ? 'text-amber-500' : 'text-muted-foreground'}`} />{option.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                </button>;
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Tiêu đề {destination === 'lesson' ? 'bài học' : destination === 'note' ? 'ghi chú' : 'mô hình'} *</label>
            <input type="text" value={title} onChange={event => setTitle(event.target.value)} className="w-full px-3 py-2 bg-muted/30 border border-input rounded-md text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-amber-500" />Ảnh bìa / sơ đồ (tùy chọn)</label>
            <div className="flex items-center gap-2">
              <input type="text" value={coverImageUrl} onChange={event => setCoverImageUrl(event.target.value)} onPaste={event => handleClipboardImagePaste(event, setCoverImageUrl)} placeholder="Dán URL hoặc Ctrl+V dán ảnh" className="flex-1 min-w-0 px-2.5 py-1.5 bg-background border border-input rounded text-xs font-mono" />
              <label className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-input rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap">Tải ảnh<input type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" /></label>
            </div>
            {coverImageUrl && <div className="relative p-2 bg-background border border-border rounded-lg flex items-center justify-between"><img src={coverImageUrl} alt="Ảnh xem trước" className="h-16 max-w-[80%] object-contain rounded" /><button type="button" onClick={() => setCoverImageUrl('')} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Xóa ảnh"><X className="w-4 h-4" /></button></div>}
          </div>
        </CardContent></Card>

        <div className="flex items-center justify-between"><span className="text-xs font-bold text-foreground">Nội dung nhận diện ({parsedBlocks.length} phần)</span><Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">Dán lại</Button></div>
        {parsedBlocks.map(block => <Card key={block.id}><CardContent className="p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant={block.type === 'cisco-command' ? 'info' : block.type === 'warning' ? 'danger' : block.type === 'note' ? 'warning' : 'default'} className="font-bold">{block.type === 'cisco-command' ? 'Lệnh Cisco' : block.type === 'heading' ? 'Tiêu đề' : block.type === 'warning' ? 'Cảnh báo' : block.type === 'note' ? 'Lưu ý' : block.type === 'example' ? 'Ví dụ' : 'Nội dung'}</Badge>
            <label className="text-[11px] font-bold text-amber-500 hover:underline cursor-pointer flex items-center gap-1"><ImageIcon className="w-3 h-3" />Thêm ảnh<input type="file" accept="image/*" onChange={event => handleBlockImageUpload(block.id, event)} className="hidden" /></label>
          </div>
          {block.type === 'heading' && <input aria-label="Tiêu đề phần" value={block.title} onChange={event => setParsedBlocks(previous => previous.map(item => item.id === block.id ? { ...item, title: event.target.value } : item))} className="w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ring" />}
          {!!block.content && <VisualDocEditor key={block.id} initialText={block.content} onChange={content => setParsedBlocks(previous => previous.map(item => item.id === block.id ? { ...item, content } : item))} compact />}
          {block.imageUrl && <div className="relative p-2.5 bg-background border border-amber-500/30 rounded-xl flex items-center justify-between"><img src={block.imageUrl} alt="Ảnh đính kèm" className="h-24 max-w-xs object-contain rounded-lg" /><button type="button" onClick={() => setParsedBlocks(previous => previous.map(item => item.id === block.id ? { ...item, imageUrl: undefined } : item))} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Xóa ảnh"><X className="w-4 h-4" /></button></div>}
        </CardContent></Card>)}
      </div>}
    </div>
  );
}
