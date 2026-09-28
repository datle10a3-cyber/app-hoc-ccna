'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Maximize2, Eye } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Topology } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export default function TopologyDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [topo, setTopo] = useState<Topology | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) setTopo(repository.getTopologyById(id) || null);
  }, [id]);

  if (!topo) return <p className="text-sm text-muted-foreground text-center py-12">Không tìm thấy mô hình.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      <Link href="/topologies">
        <Button variant="ghost" size="sm" className="gap-1 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> Danh sách mô hình
        </Button>
      </Link>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h1 className="text-xl font-extrabold text-foreground">{topo.title}</h1>
          <p className="text-xs text-muted-foreground">{topo.description}</p>

          {topo.imageUrl && (
            <div className="space-y-1 my-3">
              <div className="flex items-center justify-between text-xs text-amber-500 font-bold mb-1">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Sơ đồ mô hình mạng
                </span>
                <button 
                  onClick={() => setLightboxImage(topo.imageUrl!)}
                  className="text-[10px] text-amber-500 hover:underline flex items-center gap-1 font-bold"
                >
                  <Maximize2 className="w-3 h-3" /> Phóng to sơ đồ
                </button>
              </div>
              <div 
                onClick={() => setLightboxImage(topo.imageUrl!)}
                className="rounded-xl overflow-hidden border border-amber-500/30 bg-[#14120e] p-1 cursor-pointer group hover:border-amber-500 transition-colors"
              >
                <img src={topo.imageUrl} alt={topo.title} className="w-full max-h-96 object-contain rounded-lg" />
              </div>
            </div>
          )}

          <div>
            <span className="text-xs font-bold text-foreground block mb-1">Thiết bị:</span>
            <div className="flex gap-1.5 flex-wrap">
              {topo.devices.map(d => <Badge key={d} variant="outline" className="text-[10px] border-amber-500/30 font-bold text-amber-500">{d}</Badge>)}
            </div>
          </div>

          {topo.nodes.length > 0 && (
            <div>
              <span className="text-xs font-bold text-foreground block mb-1">Nodes:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {topo.nodes.map(n => (
                  <div key={n.id} className="p-2 rounded.xl border border-border text-xs bg-muted/20">
                    <span className="font-bold">{n.label}</span>
                    <span className="text-muted-foreground ml-1">({n.type})</span>
                    {n.ip && <span className="text-amber-400 font-mono block text-[11px] mt-0.5">{n.ip}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {topo.links.length > 0 && (
            <div>
              <span className="text-xs font-bold text-foreground block mb-1">Kết nối:</span>
              <div className="space-y-1 mt-1">
                {topo.links.map((link, i) => (
                  <div key={i} className="text-xs text-muted-foreground font-mono bg-muted/10 p-1.5 rounded border border-border/40">
                    {link.from} ↔ {link.to} {link.label && `(${link.label})`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {topo.notes && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-foreground font-medium">📝 {topo.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {lightboxImage && (
        <Modal isOpen={Boolean(lightboxImage)} onClose={() => setLightboxImage(null)} title={`Sơ đồ: ${topo.title}`}>
          <div className="space-y-3">
            <div className="p-2 bg-[#14120e] rounded-xl border border-border flex items-center justify-center min-h-[250px]">
              <img src={lightboxImage} alt={topo.title} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setLightboxImage(null)}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
