'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Edit3, Eye, Image as ImageIcon, Network, Share2, Star, Tag, Terminal, Trash2 } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Topology } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { useToast } from '@/components/ui/toast';
import { FormattedInlineText } from '@/components/ui/formatted-inline-text';
import { FormattedArticleText } from '@/components/ui/formatted-article-text';
import { richDocumentPlainText } from '@/lib/rich-document';
import { parseArticleText } from '@/lib/article-format';

export default function TopologyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [topology, setTopology] = useState<Topology | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    const found = repository.getTopologyById(id);
    if (found) { setTopology(found); setIsFav(found.isFavorite); }
  }, [id]);

  if (!topology) return <div className="text-center py-16 space-y-3"><Network className="w-10 h-10 text-muted-foreground mx-auto opacity-40" /><p className="text-sm font-bold text-foreground">Không tìm thấy mô hình.</p><Link href="/topologies"><Button variant="outline" size="sm">Quay lại danh sách mô hình</Button></Link></div>;

  const copyText = [topology.title, topology.description, topology.devices.join(', '), topology.notes || '', ...(topology.nodes || []).map(node => `${node.label} (${node.type})${node.ip ? ` - ${node.ip}` : ''}`), ...(topology.links || []).map(link => `${link.from} ↔ ${link.to}${link.label ? ` (${link.label})` : ''}`)].filter(Boolean).join('\n\n');
  const plainDescription = richDocumentPlainText(topology.description || '');
  const descriptionAsArticle = plainDescription.length > 260 || parseArticleText(plainDescription).some(part => ['heading', 'step', 'code', 'diagram', 'table'].includes(part.kind));
  const readTime = Math.max(1, Math.ceil(richDocumentPlainText(`${topology.description || ''} ${topology.notes || ''}`).split(/\s+/).filter(Boolean).length / 180));
  const handleCopy = () => {
    navigator.clipboard.writeText(richDocumentPlainText(copyText));
    setCopied(true);
    toast('Đã sao chép mô hình!', 'Thông tin mô hình đã được chép vào Clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };
  const handleDelete = () => {
    if (!confirm('Xóa mô hình mạng này?')) return;
    repository.deleteTopology(topology.id);
    toast('Đã xóa', topology.title, 'info');
    router.push('/topologies');
  };

  return (
    <div className="reading-page space-y-6 px-3 sm:px-5">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <Link href="/topologies"><Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Tất cả mô hình</Button></Link>
        <div className="flex items-center gap-1.5">
          <Link href={`/topologies/new?edit=${encodeURIComponent(topology.id)}`}><Button size="sm" variant="outline" className="gap-1 text-xs" title="Chỉnh sửa mô hình"><Edit3 className="w-3.5 h-3.5 text-amber-500" /><span className="hidden sm:inline">Sửa mô hình</span></Button></Link>
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1 text-xs" title="Sao chép mô hình">{copied ? <Check className="w-3.5 h-3.5 text-amber-500" /> : <Share2 className="w-3.5 h-3.5" />}<span className="hidden sm:inline">{copied ? 'Đã copy' : 'Sao chép'}</span></Button>
          <Button variant={isFav ? 'default' : 'outline'} size="sm" onClick={() => { repository.toggleFavorite('topology', topology.id); setIsFav(value => !value); toast(isFav ? 'Bỏ yêu thích' : 'Đã thích ⭐', topology.title, 'info'); }} className="gap-1 text-xs"><Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current text-amber-400' : ''}`} /><span className="hidden sm:inline">{isFav ? 'Đã thích' : 'Yêu thích'}</span></Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-xs text-destructive hover:bg-destructive/10" title="Xóa mô hình"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      <div className="reading-hero space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-extrabold">Mô hình mạng</Badge>
          <span className="text-[11px] text-muted-foreground">{readTime} phút đọc</span>
          {topology.imageUrl && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><ImageIcon className="w-3 h-3" /> Có sơ đồ đính kèm</span>}
        </div>
        <h1 className="reading-title">{topology.title}</h1>
        {plainDescription && !descriptionAsArticle && <div className="border-l-2 border-amber-500/60 pl-3 py-0.5"><FormattedInlineText text={topology.description} onZoomImage={setLightboxImage} className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium" /></div>}
        {topology.imageUrl && <button type="button" onClick={() => setLightboxImage(topology.imageUrl!)} className="mt-3 relative w-full rounded-xl overflow-hidden border border-amber-500/30 bg-[#14120e] cursor-pointer group hover:border-amber-500 p-1"><img src={topology.imageUrl} alt={topology.title} className="w-full max-h-72 object-contain rounded-lg" /><span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold"><Eye className="w-4 h-4 text-amber-400" /> Xem sơ đồ phóng to</span></button>}
        {(topology.devices || []).length > 0 && <div className="flex items-center gap-1.5 flex-wrap pt-1">{topology.devices.map(device => <span key={device} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><Tag className="w-2.5 h-2.5" /> {device}</span>)}</div>}
      </div>

      <Card className="reading-surface"><CardContent className="reading-article space-y-7">
        {descriptionAsArticle && <section className="space-y-2"><FormattedArticleText text={topology.description} onZoomImage={setLightboxImage} /></section>}
        {(topology.nodes || []).length > 0 && <section className="space-y-2"><h2 className="text-base sm:text-lg font-black text-amber-500 flex items-center gap-2"><Network className="w-4 h-4" /> Thiết bị trong sơ đồ</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{topology.nodes.map(node => <div key={node.id} className="collection-card rounded-xl p-3"><div className="font-bold text-sm">{node.label}</div><div className="text-xs text-muted-foreground">{node.type}{node.vlan ? ` · VLAN ${node.vlan}` : ''}</div>{node.ip && <div className="text-xs text-amber-400 font-mono mt-1">{node.ip}</div>}</div>)}</div></section>}
        {(topology.links || []).length > 0 && <section className="space-y-2"><h2 className="text-base sm:text-lg font-black text-amber-500 flex items-center gap-2"><Terminal className="w-4 h-4" /> Kết nối</h2><div className="space-y-2">{topology.links.map((link, index) => <div key={`${link.from}-${link.to}-${index}`} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"><span className="font-semibold">{link.from} ↔ {link.to}</span>{link.label && <span className="ml-2 text-xs text-muted-foreground">{link.label}</span>}{link.status && <Badge variant="outline" className="ml-2 text-[10px]">{link.status}</Badge>}</div>)}</div></section>}
        {(topology.ipList || []).length > 0 && <section className="space-y-2"><h2 className="text-base sm:text-lg font-black text-amber-500">Bảng địa chỉ IP</h2><div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-xs text-left"><thead className="bg-muted/40"><tr><th className="p-2">Thiết bị</th><th className="p-2">Cổng</th><th className="p-2">Địa chỉ IP</th><th className="p-2">VLAN</th></tr></thead><tbody>{(topology.ipList || []).map((entry, index) => <tr key={`${entry.device}-${entry.interfaceName}-${index}`} className="border-t border-border"><td className="p-2">{entry.device}</td><td className="p-2 font-mono">{entry.interfaceName}</td><td className="p-2 font-mono">{entry.ip}</td><td className="p-2">{entry.vlan || '—'}</td></tr>)}</tbody></table></div></section>}
        {topology.notes && <section className="space-y-2"><h2 className="text-base sm:text-lg font-black text-amber-500">Ghi chú cấu hình</h2><FormattedArticleText text={topology.notes} onZoomImage={setLightboxImage} /></section>}
        {!topology.nodes?.length && !topology.links?.length && !topology.ipList?.length && !topology.notes && <p className="text-xs text-muted-foreground text-center py-8">Mô hình chưa có thông tin chi tiết.</p>}
      </CardContent></Card>

      <ImageLightbox src={lightboxImage} alt={topology.title} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
