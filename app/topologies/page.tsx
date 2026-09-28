'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Network, Search, Plus, Trash2, Edit3, Image as ImageIcon, X } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Topology } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

export default function TopologiesPage() {
  const [query, setQuery] = useState('');
  const [topologies, setTopologies] = useState<Topology[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTopo, setEditingTopo] = useState<Topology | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setTopologies(repository.getTopologies());
  }, []);

  const filtered = topologies.filter(t =>
    t.title.toLowerCase().includes(query.toLowerCase()) || t.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingTopo(null);
    setTitle('');
    setDesc('');
    setImageUrl('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (topo: Topology, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTopo(topo);
    setTitle(topo.title);
    setDesc(topo.description);
    setImageUrl(topo.imageUrl || '');
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

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Xóa mô hình này?')) {
      repository.deleteTopology(id);
      setTopologies(repository.getTopologies());
      toast('Đã xóa', 'Đã xóa mô hình mạng.', 'info');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const topoToSave: Topology = {
      id: editingTopo ? editingTopo.id : `topo-${Date.now()}`,
      title: title.trim(),
      description: desc.trim(),
      imageUrl: imageUrl.trim() || undefined,
      nodes: editingTopo ? editingTopo.nodes : [],
      links: editingTopo ? editingTopo.links : [],
      devices: editingTopo ? editingTopo.devices : ['Router', 'Switch'],
      isFavorite: editingTopo ? editingTopo.isFavorite : false,
      createdAt: editingTopo ? editingTopo.createdAt : new Date().toISOString()
    };

    repository.saveTopology(topoToSave);
    setTopologies(repository.getTopologies());
    toast('Đã lưu!', editingTopo ? `Đã cập nhật "${title}".` : `Mô hình "${title}" đã được tạo.`, 'success');
    setIsAddOpen(false);
    setEditingTopo(null);
    setTitle(''); 
    setDesc('');
    setImageUrl('');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Network className="w-5 h-5 text-amber-500" /> Mô Hình Mạng
          </h1>
        </div>
        <div className="w-full sm:w-auto">
          <Button size="sm" onClick={handleOpenAdd} className="w-full gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Thêm Mô Hình
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
        <input 
          type="text" 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          placeholder="Tìm mô hình..."
          className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(topo => (
          <Link key={topo.id} href={`/topologies/${topo.id}`}>
            <Card className="h-full hover:border-primary/30 transition-colors cursor-pointer group">
              <CardContent className="p-4 min-h-20 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">{topo.title}</h3>
                <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={(e) => handleOpenEdit(topo, e)}
                      className="p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-muted transition-colors opacity-70 group-hover:opacity-100"
                      title="Sửa"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(topo.id, e)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors opacity-70 group-hover:opacity-100"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-xl p-6">
          <Network className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-foreground">{topologies.length ? 'Không tìm thấy mô hình phù hợp.' : 'Chưa có mô hình nào.'}</p>
        </div>
      )}

      <Modal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        title={editingTopo ? "Sửa Mô Hình Mạng" : "Thêm Mô Hình Mạng"}
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Tên mô hình *</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="VD: VLAN + Router-on-a-Stick"
              className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" 
              required 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Mô tả chi tiết</label>
            <textarea 
              value={desc} 
              onChange={e => setDesc(e.target.value)} 
              rows={3}
              placeholder="Mô tả cấu hình, các dải IP..."
              className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" 
            />
          </div>

          <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Ảnh sơ đồ mô hình (Không bắt buộc)
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
              {editingTopo ? 'Cập Nhật' : 'Tạo Mô Hình'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
