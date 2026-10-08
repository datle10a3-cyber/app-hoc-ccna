'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, ChevronRight, ImagePlus, Loader2, Send, Sparkles, Trash2, X } from 'lucide-react';
import { AnswerMarkdown } from '@/components/assistant/answer-markdown';
import { AttachedImage, useAssistantChat } from '@/components/providers/assistant-provider';

const MAX_IMAGES = 8;
const MAX_IMAGE_CHARS = 1_750_000;
const examples = [
  'Lệnh show vlan dùng để làm gì? Cách kiểm tra VLAN 10?',
  'Hướng dẫn cấu hình VLAN 10 và gán cổng access trên switch Cisco.',
  'Tóm tắt những ghi chú về trunk và các lỗi thường gặp.'
];

async function prepareImage(file: File): Promise<AttachedImage> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
    throw new Error('Chọn ảnh PNG, JPG hoặc WebP dưới 15 MB.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không thể xử lý ảnh này.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let preview = '';
    for (const quality of [0.9, 0.75, 0.6]) {
      preview = canvas.toDataURL('image/webp', quality);
      if (preview.length <= MAX_IMAGE_CHARS) break;
    }
    if (preview.length > MAX_IMAGE_CHARS) {
      const resize = Math.sqrt(MAX_IMAGE_CHARS / preview.length) * 0.9;
      const resized = document.createElement('canvas');
      resized.width = Math.max(1, Math.round(canvas.width * resize));
      resized.height = Math.max(1, Math.round(canvas.height * resize));
      resized.getContext('2d')?.drawImage(canvas, 0, 0, resized.width, resized.height);
      preview = resized.toDataURL('image/webp', 0.7);
    }
    if (preview.length > MAX_IMAGE_CHARS) throw new Error('Ảnh quá lớn. Hãy cắt vùng cần xem rồi gửi lại.');
    const match = /^data:(image\/(?:png|jpeg|webp));base64,(.*)$/.exec(preview);
    if (!match) throw new Error('Không thể đọc định dạng ảnh này.');
    return { mimeType: match[1] as AttachedImage['mimeType'], data: match[2], preview };
  } finally {
    bitmap.close();
  }
}

export default function AssistantPage() {
  const { messages, busy, ready, error, status, sendQuestion, clearChat, setError } = useAssistantChat();
  const [question, setQuestion] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const addImages = async (files: File[]) => {
    if (!files.length) return;
    if (attachedImages.length + files.length > MAX_IMAGES) {
      setError(`Gửi tối đa ${MAX_IMAGES} ảnh trong một lượt hỏi.`);
      return;
    }
    setProcessingImages(true);
    try {
      const prepared = await Promise.all(files.map(prepareImage));
      setAttachedImages(previous => [...previous, ...prepared]);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đọc ảnh.');
    } finally { setProcessingImages(false); }
  };

  const ask = async (text: string) => {
    if (processingImages || !ready || !status || busy || (!text.trim() && !attachedImages.length)) return;
    const pending = sendQuestion(text, attachedImages);
    setQuestion('');
    setAttachedImages([]);
    inputRef.current?.focus();
    await pending;
  };

  const handleSubmit = (event: FormEvent) => { event.preventDefault(); void ask(question); };

  return <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold"><Sparkles className="h-5 w-5 text-amber-500" /> Trợ lý AI CCNA</h1>
        {status?.configured && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Đã kết nối</span>}
      </div>
      <button type="button" disabled={!ready} onClick={() => { if (confirm('Xóa toàn bộ cuộc trò chuyện AI đã lưu?')) { void clearChat(); setQuestion(''); setAttachedImages([]); inputRef.current?.focus(); } }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-input px-3.5 text-sm font-semibold hover:bg-muted disabled:opacity-50">
        <Trash2 className="h-4 w-4" /> Xóa cuộc trò chuyện
      </button>
    </div>

    {status && !status.configured && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">Chưa kết nối AI chính. <Link href="/settings" className="font-semibold text-amber-500 underline">Mở cài đặt</Link></div>}

    <div className="min-h-[48vh] space-y-5 rounded-2xl border border-border bg-card/60 p-3 sm:p-5">
      {ready && !messages.length && <div className="mx-auto max-w-xl space-y-5 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15"><Bot className="h-6 w-6 text-amber-500" /></div>
        <h2 className="font-bold">Bạn muốn tìm hiểu điều gì?</h2>
        <div className="space-y-2 text-left">{examples.map(example => <button key={example} type="button" disabled={!status || busy} onClick={() => void ask(example)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-left text-sm hover:border-amber-500/50 hover:bg-amber-500/5 disabled:opacity-50"><span>{example}</span><ChevronRight className="h-4 w-4 shrink-0 text-amber-500" /></button>)}</div>
      </div>}

      {messages.map((message, index) => <div key={index} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        {message.role === 'assistant' && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500"><Bot className="h-4 w-4" /></div>}
        <div className={`min-w-0 max-w-[92%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-amber-500 text-slate-950' : `border border-border bg-background ${/```|^\s*(?:configure terminal|hostname|interface|switchport|vlan\s+\d+|show\s+(?:version|running-config|vlan|interfaces|spanning-tree|etherchannel|mac|ip|standby|cdp))/im.test(message.content) ? 'w-full' : ''}`}`}>
          {message.role === 'user' ? <div className="space-y-2"><p className="whitespace-pre-wrap break-words text-sm font-medium">{message.content}</p>{!!message.images?.length && <div className="flex flex-wrap gap-2">{message.images.map((url, imageIndex) => <img key={imageIndex} src={url} alt={`Ảnh đã gửi ${imageIndex + 1}`} className="max-h-52 max-w-full rounded-lg object-contain" />)}</div>}</div> : <>
            <AnswerMarkdown text={message.content} sources={message.sources} />
            {!!message.sources?.length && <details className="mt-4 border-t border-border pt-3">
              <summary className="cursor-pointer text-xs font-bold text-amber-500">Nguồn trong ứng dụng ({message.sources.length})</summary>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{message.sources.map((source, sourceIndex) => <Link key={source.id} href={source.href} className="flex min-w-0 items-start gap-2 rounded-lg border border-border/70 p-2 text-xs hover:border-amber-500/40 hover:bg-muted/40">
                <span className="font-bold text-amber-500">[{sourceIndex + 1}]</span><span className="min-w-0 font-semibold break-words">{source.title}</span>
              </Link>)}</div>
            </details>}
          </>}
        </div>
      </div>)}
      {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-amber-500" /> Đang xem dữ liệu và soạn câu trả lời...</div>}
      <div ref={bottomRef} />
    </div>

    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>}
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-2.5 shadow-sm focus-within:border-amber-500/50 sm:p-3">
      {!!attachedImages.length && <div className="mb-2 flex flex-wrap gap-2">{attachedImages.map((image, index) => <div key={index} className="relative"><img src={image.preview} alt={`Ảnh chuẩn bị gửi ${index + 1}`} className="h-24 w-24 rounded-lg border border-border object-contain" /><button type="button" aria-label={`Bỏ ảnh ${index + 1}`} onClick={() => setAttachedImages(previous => previous.filter((_, itemIndex) => itemIndex !== index))} className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"><X className="h-3.5 w-3.5" /></button></div>)}<span className="self-end text-[11px] text-muted-foreground">{attachedImages.length}/{MAX_IMAGES} ảnh</span></div>}
      <textarea ref={inputRef} value={question} onChange={event => setQuestion(event.target.value)} onPaste={event => { const files = Array.from(event.clipboardData.items).filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => Boolean(file)); if (files.length) { event.preventDefault(); void addImages(files); } }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(question); } }} rows={3} placeholder="Hỏi về VLAN, lệnh Cisco hoặc dán nhiều ảnh lỗi..." className="w-full resize-y bg-transparent px-3 py-2 text-base leading-relaxed outline-none placeholder:text-muted-foreground min-h-20" />
      <div className="flex items-center justify-between gap-3 px-2 pb-1"><div><input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={event => { void addImages(Array.from(event.target.files || [])); event.target.value = ''; }} /><button type="button" onClick={() => imageInputRef.current?.click()} disabled={busy || processingImages || attachedImages.length >= MAX_IMAGES} aria-label="Thêm ảnh" title="Chọn hoặc dán tối đa 8 ảnh" className="grid h-11 w-11 place-items-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><ImagePlus className="h-5 w-5" /></button></div><button type="submit" disabled={(!question.trim() && !attachedImages.length) || !ready || !status || busy || processingImages} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-bold text-slate-950 disabled:opacity-50">{processingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gửi</button></div>
    </form>
  </div>;
}
