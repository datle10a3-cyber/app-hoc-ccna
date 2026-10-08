'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Edit3, Eye, Image as ImageIcon, Share2, Star, StickyNote, Tag, Trash2 } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { PersonalNote } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { useToast } from '@/components/ui/toast';
import { FormattedArticleText } from '@/components/ui/formatted-article-text';
import { richDocumentPlainText } from '@/lib/rich-document';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [note, setNote] = useState<PersonalNote | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    const found = repository.getNoteById(id);
    if (found) { setNote(found); setIsFav(found.isFavorite); }
  }, [id]);

  if (!note) return <div className="text-center py-16 space-y-3"><StickyNote className="w-10 h-10 text-muted-foreground mx-auto opacity-40" /><p className="text-sm font-bold text-foreground">Không tìm thấy ghi chú.</p><Link href="/notes"><Button variant="outline" size="sm">Quay lại danh sách ghi chú</Button></Link></div>;

  const plainContent = richDocumentPlainText(note.content);
  const readTime = Math.max(1, Math.ceil(plainContent.split(/\s+/).filter(Boolean).length / 180));
  const handleCopy = () => {
    navigator.clipboard.writeText(`${note.title}\n\n${plainContent}`);
    setCopied(true);
    toast('Đã sao chép ghi chú!', 'Nội dung đã được chép vào Clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };
  const handleDelete = () => {
    if (!confirm('Xóa ghi chú này?')) return;
    repository.deleteNote(note.id);
    toast('Đã xóa', note.title, 'info');
    router.push('/notes');
  };

  return (
    <div className="reading-page space-y-6 px-3 sm:px-5">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <Link href="/notes"><Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Tất cả ghi chú</Button></Link>
        <div className="flex items-center gap-1.5">
          <Link href={`/notes/new?edit=${encodeURIComponent(note.id)}`}><Button size="md" variant="outline" className="gap-2 text-sm" title="Chỉnh sửa ghi chú"><Edit3 className="w-4 h-4 text-amber-500" /><span className="hidden sm:inline">Sửa ghi chú</span></Button></Link>
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1 text-xs" title="Sao chép ghi chú">{copied ? <Check className="w-3.5 h-3.5 text-amber-500" /> : <Share2 className="w-3.5 h-3.5" />}<span className="hidden sm:inline">{copied ? 'Đã copy' : 'Sao chép'}</span></Button>
          <Button variant={isFav ? 'default' : 'outline'} size="sm" onClick={() => { repository.toggleFavorite('note', note.id); setIsFav(value => !value); toast(isFav ? 'Bỏ yêu thích' : 'Đã thích ⭐', note.title, 'info'); }} className="gap-1 text-xs"><Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current text-amber-400' : ''}`} /><span className="hidden sm:inline">{isFav ? 'Đã thích' : 'Yêu thích'}</span></Button>
          <Button variant="outline" size="md" onClick={handleDelete} className="gap-2 text-sm text-destructive hover:bg-destructive/10" title="Xóa ghi chú"><Trash2 className="w-4 h-4" /><span className="hidden sm:inline">Xóa</span></Button>
        </div>
      </div>

      <div className="reading-hero space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-extrabold">{note.type || 'Ghi chú'}</Badge>
          <span className="text-[11px] text-muted-foreground">{readTime} phút đọc</span>
          {note.imageUrl && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><ImageIcon className="w-3 h-3" /> Có ảnh đính kèm</span>}
        </div>
        <h1 className="reading-title">{note.title}</h1>
        {note.imageUrl && <button type="button" onClick={() => setLightboxImage(note.imageUrl!)} className="mt-3 relative w-full rounded-xl overflow-hidden border border-amber-500/30 bg-[#14120e] cursor-pointer group hover:border-amber-500 p-1"><img src={note.imageUrl} alt={note.title} className="w-full max-h-72 object-contain rounded-lg" /><span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold"><Eye className="w-4 h-4 text-amber-400" /> Xem ảnh phóng to</span></button>}
        {note.tags.length > 0 && <div className="flex items-center gap-1.5 flex-wrap pt-1">{note.tags.map(tag => <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><Tag className="w-2.5 h-2.5" /> {tag}</span>)}</div>}
      </div>

      <Card className="reading-surface"><CardContent className="reading-article"><FormattedArticleText text={note.content} onZoomImage={setLightboxImage} />{!note.content && <p className="text-xs text-muted-foreground text-center py-8">Ghi chú chưa có nội dung.</p>}</CardContent></Card>

      <ImageLightbox src={lightboxImage} alt={note.title} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
