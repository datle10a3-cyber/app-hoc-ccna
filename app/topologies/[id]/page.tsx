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
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { FormattedInlineText } from '@/components/ui/formatted-inline-text';
import { isRichDocument, richDocumentPlainText } from '@/lib/rich-document';

function TopologyArticleBody({ text, onZoomImage }: { text: string; onZoomImage: (url: string) => void }) {
  if (isRichDocument(text)) {
    return <FormattedInlineText text={text} onZoomImage={onZoomImage} className="text-sm text-foreground/95 leading-relaxed" />;
  }

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  return <div className="space-y-1.5 text-sm text-foreground/95 leading-relaxed">
    {lines.map((line, index) => {
      const value = line.trim();
      if (!value) return <div key={`gap-${index}`} className="h-2" />;
      if (/^(?:[IVXLCDM]+\.|\d+[.)]|[A-Z]\.)\s+\S/.test(value)) {
        return <h2 key={index} className="pt-4 first:pt-0 pb-1 border-b border-amber-500/25 text-base sm:text-lg font-black text-amber-500 dark:text-amber-400">{value}</h2>;
      }
      if (value.length < 90 && /:$/.test(value)) {
        return <h3 key={index} className="pt-2 text-sm font-bold text-foreground">{value}</h3>;
      }
      if (/^[-•*]\s+/.test(value)) {
        return <div key={index} className="flex gap-2 pl-2"><span className="text-amber-500">•</span><span>{value.replace(/^[-•*]\s+/, '')}</span></div>;
      }
      if (/^\|.*\|$/.test(value)) {
        const cells = value.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
        if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) return null;
        return <div key={index} className="overflow-x-auto rounded-md border border-border"><table className="w-full text-left text-xs"><tbody><tr>{cells.map((cell, cellIndex) => <td key={cellIndex} className="border-r border-border px-3 py-2 last:border-r-0">{cell}</td>)}</tr></tbody></table></div>;
      }
      return <FormattedInlineText key={index} text={value} onZoomImage={onZoomImage} className="text-sm text-foreground/95 leading-relaxed" />;
    })}
  </div>;
}

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
  const descriptionAsArticle = plainDescription.length > 260 || /(?:^|\n)\s*(?:[IVXLCDM]+\.|[A-Z]\.)\s+/.test(plainDescription);
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <Link href="/topologies"><Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Tất cả mô hình</Button></Link>
        <div className="flex items-center gap-1.5">
          <Link href={`/topologies/new?edit=${encodeURIComponent(topology.id)}`}><Button size="sm" variant="outline" className="gap-1 text-xs" title="Chỉnh sửa mô hình"><Edit3 className="w-3.5 h-3.5 text-amber-500" /><span className="hidden sm:inline">Sửa mô hình</span></Button></Link>
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1 text-xs" title="Sao chép mô hình">{copied ? <Check className="w-3.5 h-3.5 text-amber-500" /> : <Share2 className="w-3.5 h-3.5" />}<span className="hidden sm:inline">{copied ? 'Đã copy' : 'Sao chép'}</span></Button>
          <Button variant={isFav ? 'default' : 'outline'} size="sm" onClick={() => { repository.toggleFavorite('topology', topology.id); setIsFav(value => !value); toast(isFav ? 'Bỏ yêu thích' : 'Đã thích ⭐', topology.title, 'info'); }} className="gap-1 text-xs"><Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current text-amber-400' : ''}`} /><span className="hidden sm:inline">{isFav ? 'Đã thích' : 'Yêu thích'}</span></Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-xs text-destructive hover:bg-destructive/10" title="Xóa mô hình"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      <div className="p-5 sm:p-6 bg-gradient-to-br from-card via-card to-amber-950/20 border border-amber-500/30 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-extrabold">Mô hình mạng</Badge>
          <span className="text-[11px] text-muted-foreground">{readTime} phút đọc</span>
          {topology.imageUrl && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><ImageIcon className="w-3 h-3" /> Có sơ đồ đính kèm</span>}
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">{topology.title}</h1>
        {plainDescription && !descriptionAsArticle && <div className="border-l-2 border-amber-500/60 pl-3 py-0.5"><FormattedInlineText text={topology.description} onZoomImage={setLightboxImage} className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium" /></div>}
        {topology.imageUrl && <button type="button" onClick={() => setLightboxImage(topology.imageUrl!)} className="mt-3 relative w-full rounded-xl overflow-hidden border border-amber-500/30 bg-[#14120e] cursor-pointer group hover:border-amber-500 p-1"><img src={topology.imageUrl} alt={topology.title} className="w-full max-h-72 object-contain rounded-lg" /><span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold"><Eye className="w-4 h-4 text-amber-400" /> Xem sơ đồ phóng to</span></button>}
        {(topology.devices || []).length > 0 && <div className="flex items-center gap-1.5 flex-wrap pt-1">{topology.devices.map(device => <span key={device} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"><Tag className="w-2.5 h-2.5" /> {device}</span>)}</div>}
      </div>

      <Card className="border-border/80 shadow-sm"><CardContent className="p-5 sm:p-8 space-y-5">
        {descriptionAsArticle && <section className="space-y-2"><TopologyArticleBody text={topology.description} onZoomImage={setLightboxImage} /></section>}
        {(topology.nodes || []).length > 0 && <section className="space-y-2"><h2 className="text-base sm:text-lg font-black text-amber-500 flex items-center gap-2"><Network className="w-4 h-4" /> Thiết bị trong sơ đồ</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{topology.nodes.map(node => <div key={node.id} className="rounded-xl border border-border bg-muted/20 p-3"><div className="font-bold text-sm">{node.label}</div><div className="text-xs text-muted-foreground">{node.type}{node.vlan ? ` · VLAN ${node.vlan}` : ''}</div>{node.ip && <div className="text-xs text-amber-400 font-mono mt-1">{node.ip}</div>}</div>)}</div></section>}
        {(topology.links || []).length > 0 && <section className="space-y-2"><h2 className="text-base sm:text-lg font-black text-amber-500 flex items-center gap-2"><Terminal className="w-4 h-4" /> Kết nối</h2><div className="space-y-2">{topology.links.map((link, index) => <div key={`${link.from}-${link.to}-${index}`} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"><span className="font-semibold">{link.from} ↔ {link.to}</span>{link.label && <span className="ml-2 text-xs text-muted-foreground">{link.label}</span>}{link.status && <Badge variant="outline" className="ml-2 text-[10px]">{link.status}</Badge>}</div>)}</div></section>}
        {(topology.ipList || []).length > 0 && <section className="space-y-2"><h2 className="text-base sm:text-lg font-black text-amber-500">Bảng địa chỉ IP</h2><div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-xs text-left"><thead className="bg-muted/40"><tr><th className="p-2">Thiết bị</th><th className="p-2">Cổng</th><th className="p-2">Địa chỉ IP</th><th className="p-2">VLAN</th></tr></thead><tbody>{(topology.ipList || []).map((entry, index) => <tr key={`${entry.device}-${entry.interfaceName}-${index}`} className="border-t border-border"><td className="p-2">{entry.device}</td><td className="p-2 font-mono">{entry.interfaceName}</td><td className="p-2 font-mono">{entry.ip}</td><td className="p-2">{entry.vlan || '—'}</td></tr>)}</tbody></table></div></section>}
        {topology.notes && <section className="space-y-2"><h2 className="text-base sm:text-lg font-black text-amber-500">Ghi chú cấu hình</h2><TopologyArticleBody text={topology.notes} onZoomImage={setLightboxImage} /></section>}
        {!topology.nodes?.length && !topology.links?.length && !topology.ipList?.length && !topology.notes && <p className="text-xs text-muted-foreground text-center py-8">Mô hình chưa có thông tin chi tiết.</p>}
      </CardContent></Card>

      {lightboxImage && <Modal isOpen={Boolean(lightboxImage)} onClose={() => setLightboxImage(null)} title={`Sơ đồ: ${topology.title}`}><div className="space-y-3"><div className="p-2 bg-[#14120e] rounded-xl border border-border flex items-center justify-center min-h-[250px]"><img src={lightboxImage} alt={topology.title} className="max-w-full max-h-[75vh] object-contain rounded-lg" /></div><div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => setLightboxImage(null)}>Đóng</Button></div></div></Modal>}
    </div>
  );
}
