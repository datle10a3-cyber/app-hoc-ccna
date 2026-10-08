'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  Star, Trash2, ArrowLeft, Terminal, Copy, Check, 
  BookOpen, Clock, Tag, Share2, AlertTriangle, Lightbulb, ChevronRight, Edit3, Image as ImageIcon, Maximize2, Eye
} from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Lesson, LessonBlock } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { useToast } from '@/components/ui/toast';

import { FormattedInlineText } from '@/components/ui/formatted-inline-text';
import { FormattedArticleText } from '@/components/ui/formatted-article-text';
import { isRichDocument, richDocumentPlainText } from '@/lib/rich-document';

function isGenericTitle(title?: string): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return ['lý thuyết', 'lệnh cisco', 'ghi chú', 'cảnh báo', 'paragraph', 'block', 'nội dung', 'chưa phân loại'].includes(t);
}

function BlockRenderer({ block, index, onZoomImage }: { block: LessonBlock; index: number; onZoomImage: (url: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showTitle = Boolean(block.title && !isGenericTitle(block.title));

  return (
    <div className="space-y-2 my-4">
      {/* Block Content */}
      {block.type === 'cisco-command' || block.type === 'command-output' ? (
        <div className="space-y-1.5">
          {showTitle && (
            <h4 className="text-xs font-extrabold text-amber-500 dark:text-amber-400 flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-amber-500" /> {block.title}
            </h4>
          )}
          <div className="reading-code relative group rounded-xl overflow-hidden border border-slate-400/10 bg-[#080d16] shadow-none">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/50 border-b border-slate-400/10 text-xs text-slate-300 font-mono">
              <span className="flex items-center gap-1.5 font-bold">
                <Terminal className="w-3 h-3 text-amber-500" /> Cisco IOS CLI
              </span>
              <button
                onClick={() => handleCopy(richDocumentPlainText(block.content))}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-amber-500/20 text-amber-300 transition-colors font-semibold"
                title="Copy lệnh"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 font-bold">Đã copy</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="reading-code-content p-4 sm:px-5 text-sm font-mono text-slate-200 overflow-x-auto leading-[1.7] whitespace-pre-wrap">
              <FormattedInlineText text={block.content} onZoomImage={onZoomImage} className="font-mono text-amber-200" />
            </div>
          </div>
        </div>
      ) : block.type === 'warning' ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-extrabold text-xs sm:text-sm text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{showTitle ? block.title : 'Lưu Ý Quan Trọng'}</span>
          </div>
          <div className="pl-6">
            <FormattedArticleText text={block.content} onZoomImage={onZoomImage} />
          </div>
        </div>
      ) : block.type === 'note' ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-extrabold text-xs sm:text-sm text-amber-400">
            <Lightbulb className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{showTitle ? block.title : 'Ghi Chú Trọng Tâm'}</span>
          </div>
          <div className="pl-6">
            <FormattedArticleText text={block.content} onZoomImage={onZoomImage} />
          </div>
        </div>
      ) : block.type === 'heading' ? (
        <div className="pt-5 pb-2 border-b border-amber-500/30 my-4">
          {isRichDocument(block.content) || block.content.includes('![') ? <FormattedInlineText text={block.content} onZoomImage={onZoomImage} className="text-base sm:text-lg font-bold text-foreground" /> :
            <h2 className="text-base sm:text-lg md:text-xl font-black text-amber-500 dark:text-amber-400 flex items-center gap-2 tracking-tight">
              <ChevronRight className="w-5 h-5 text-amber-500 shrink-0" />
              {block.title || block.content}
            </h2>}
        </div>
      ) : <div className="space-y-2">
        {showTitle && <h3 className="article-step">{block.title}</h3>}
        <FormattedArticleText text={block.content || ''} onZoomImage={onZoomImage} />
      </div>}


      {/* Attached Block Image */}
      {block.imageUrl && (
        <div className="my-3">
          <div 
            onClick={() => onZoomImage(block.imageUrl!)}
            className="relative inline-block rounded-xl overflow-hidden border border-amber-500/30 bg-[#14120e] cursor-pointer group hover:border-amber-500 p-1"
          >
            <img src={block.imageUrl} alt="Diagram" className="max-h-64 object-contain rounded-lg transition-transform group-hover:scale-[1.01]" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold">
              <Eye className="w-4 h-4 text-amber-400" /> Phóng to sơ đồ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      const found = repository.getLessonById(id);
      if (found) {
        setLesson(found);
        setIsFav(found.isFavorite);
      }
    }
  }, [id]);

  if (!lesson) {
    return (
      <div className="text-center py-16 space-y-3">
        <BookOpen className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
        <p className="text-sm font-bold text-foreground">Không tìm thấy bài học.</p>
        <Link href="/learn">
          <Button variant="outline" size="sm">Quay lại danh sách bài học</Button>
        </Link>
      </div>
    );
  }

  const wordCount = lesson.blocks.reduce((acc, b) => acc + (richDocumentPlainText(b.content || '').split(/\s+/).filter(Boolean).length), 0);
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 180));

  const handleCopyLessonText = () => {
    const fullText = `${lesson.title}\n\n${lesson.summary}\n\n` + lesson.blocks.map(b => `${b.title && !isGenericTitle(b.title) ? b.title + '\n' : ''}${richDocumentPlainText(b.content)}`).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    toast('Đã copy bài học!', 'Toàn bộ nội dung bài học đã được chép vào Clipboard.', 'success');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="reading-page space-y-6 px-3 sm:px-5">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <Link href="/learn">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Tất cả bài học
          </Button>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link href={`/learn/new?edit=${lesson.id}`}>
            <Button size="md" variant="outline" className="gap-2 text-sm" title="Chỉnh sửa bài học này">
              <Edit3 className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Sửa bài học</span>
            </Button>
          </Link>

          <Button size="sm" variant="outline" onClick={handleCopyLessonText} className="gap-1 text-xs" title="Copy toàn bộ bài học">
            {copiedAll ? <Check className="w-3.5 h-3.5 text-amber-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedAll ? 'Đã copy' : 'Sao chép'}</span>
          </Button>

          <Button
            variant={isFav ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setIsFav(!isFav);
              repository.toggleFavorite('lesson', lesson.id);
              toast(isFav ? 'Bỏ yêu thích' : 'Đã thích ⭐', lesson.title, 'info');
            }}
            className="gap-1 text-xs"
          >
            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current text-amber-400' : ''}`} />
            <span className="hidden sm:inline">{isFav ? 'Đã thích' : 'Yêu thích'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Xóa bài học này?')) {
                repository.deleteLesson(lesson.id);
                toast('Đã xóa', lesson.title, 'info');
                router.push('/learn');
              }
            }}
            className="min-w-10 gap-2 text-sm text-destructive hover:bg-destructive/10"
            title="Xóa bài học"
          >
            <Trash2 className="w-4 h-4" /><span className="hidden sm:inline">Xóa</span>
          </Button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="reading-hero space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-extrabold">
            {lesson.topic}
          </Badge>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono font-bold">
            <Clock className="w-3 h-3 text-amber-500" /> {readTimeMin} phút đọc
          </span>
          {lesson.imageUrl && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <ImageIcon className="w-3 h-3" /> Đính kèm sơ đồ
            </span>
          )}
        </div>

        <h1 className="reading-title">
          {lesson.title}
        </h1>

        {lesson.summary && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed border-l-2 border-amber-500/60 pl-3 py-0.5 italic font-medium">
            {lesson.summary}
          </p>
        )}

        {/* Hero Image Preview */}
        {lesson.imageUrl && (
          <div 
            onClick={() => setLightboxImage(lesson.imageUrl!)}
            className="mt-3 relative rounded-xl overflow-hidden border border-amber-500/30 bg-[#14120e] cursor-pointer group hover:border-amber-500 p-1"
          >
            <img src={lesson.imageUrl} alt={lesson.title} className="w-full max-h-72 object-contain rounded-lg" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold">
              <Eye className="w-4 h-4 text-amber-400" /> Xem sơ đồ chính phóng to
            </div>
          </div>
        )}

        {lesson.tags && lesson.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {lesson.tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Tag className="w-2.5 h-2.5" /> {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reading Article Content */}
      <Card className="reading-surface">
        <CardContent className="reading-article">
          {lesson.blocks.map((block, idx) => (
            <BlockRenderer 
              key={block.id || idx} 
              block={block} 
              index={idx} 
              onZoomImage={(url) => setLightboxImage(url)} 
            />
          ))}

          {lesson.blocks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Chưa có nội dung bài học.</p>
          )}
        </CardContent>
      </Card>

      {/* Lightbox Modal */}
      <ImageLightbox src={lightboxImage} alt={lesson.title} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
