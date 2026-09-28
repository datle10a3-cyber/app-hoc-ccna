'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Save, X } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Topology } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { VisualDocEditor } from '@/components/ui/visual-doc-editor';
import { handleClipboardImagePaste } from '@/lib/utils';

function TopologyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const [topology, setTopology] = useState<Topology | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [devices, setDevices] = useState('Router, Switch');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!editId) return;
    const existing = repository.getTopologyById(editId);
    if (!existing) return;
    setTopology(existing);
    setTitle(existing.title);
    setDescription(existing.description);
    setDevices(existing.devices.join(', '));
    setNotes(existing.notes || '');
    setImageUrl(existing.imageUrl || '');
  }, [editId]);

  const uploadImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => { if (event.target?.result) setImageUrl(event.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const saved: Topology = {
      id: topology?.id || `topo-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim() || undefined,
      nodes: topology?.nodes || [],
      links: topology?.links || [],
      devices: devices.split(',').map(device => device.trim()).filter(Boolean),
      ipList: topology?.ipList || [],
      notes: notes.trim() || undefined,
      relatedCommandIds: topology?.relatedCommandIds || [],
      isFavorite: topology?.isFavorite || false,
      createdAt: topology?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      repository.saveTopology(saved);
    } catch {
      toast('Chưa lưu được', 'Bộ nhớ trình duyệt đã đầy. Hãy giảm kích thước ảnh hoặc sao lưu dữ liệu rồi thử lại.', 'error');
      return;
    }
    toast('Đã lưu!', topology ? `Đã cập nhật mô hình “${saved.title}”.` : `Mô hình “${saved.title}” đã được tạo.`, 'success');
    router.push(`/topologies/${saved.id}`);
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-4 pb-12">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => router.back()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"><ArrowLeft className="w-3.5 h-3.5" /> Quay lại</button>
        <Button type="submit" size="sm" className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"><Save className="w-3.5 h-3.5" /> {topology ? 'Cập Nhật Mô Hình' : 'Lưu Mô Hình'}</Button>
      </div>

      <Card><CardContent className="p-4 space-y-3">
        <div>
          <label className="text-xs font-bold text-foreground block mb-1">Tên mô hình *</label>
          <input type="text" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ví dụ: VLAN + Router-on-a-Stick" className="w-full px-3 py-2 bg-muted/30 border border-input rounded-md text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ring" required />
        </div>
        <div>
          <label className="text-xs font-bold text-foreground block mb-1">Thiết bị trong mô hình (phẩy)</label>
          <input type="text" value={devices} onChange={event => setDevices(event.target.value)} placeholder="Router, Switch, PC" className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" />
        </div>
        <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Ảnh bìa / sơ đồ chính (tùy chọn)</label>
          <div className="flex items-center gap-2">
            <input type="text" value={imageUrl} onChange={event => setImageUrl(event.target.value)} onPaste={event => handleClipboardImagePaste(event, setImageUrl)} placeholder="Dán URL hoặc Ctrl+V dán ảnh" className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded text-xs font-mono" />
            <label className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-input rounded text-xs font-bold cursor-pointer whitespace-nowrap">Tải ảnh<input type="file" accept="image/*" onChange={event => uploadImage(event.target.files?.[0])} className="hidden" /></label>
          </div>
          {imageUrl && <div className="relative p-2 bg-[#14120e] border border-border rounded-lg flex items-center justify-between"><img src={imageUrl} alt="Xem trước sơ đồ" className="h-14 max-w-[80%] object-contain rounded" /><button type="button" onClick={() => setImageUrl('')} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Xóa ảnh"><X className="w-4 h-4" /></button></div>}
        </div>
      </CardContent></Card>

      <div className="space-y-3"><span className="text-xs font-bold text-foreground">Mô tả mô hình</span><Card><CardContent className="p-4"><VisualDocEditor key={`${topology?.id || 'new'}-description`} initialText={description} onChange={setDescription} compact /></CardContent></Card></div>
      <div className="space-y-3"><span className="text-xs font-bold text-foreground">Ghi chú cấu hình (tùy chọn)</span><Card><CardContent className="p-4"><VisualDocEditor key={`${topology?.id || 'new'}-notes`} initialText={notes} onChange={setNotes} compact /></CardContent></Card></div>
    </form>
  );
}

export default function NewTopologyPage() {
  return <Suspense fallback={<div className="text-center py-12 text-sm text-muted-foreground">Đang tải biểu mẫu…</div>}><TopologyForm /></Suspense>;
}
