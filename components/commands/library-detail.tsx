'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, Star, Wand2 } from 'lucide-react';
import { LibraryArticle, deviceConfig, renderTemplate, templateKeys } from '@/lib/cisco-library';
import { libraryFavorites, toggleLibraryFavorite } from '@/lib/cisco-library-favorites';
import { useToast } from '@/components/ui/toast';

const labels: Record<string, string> = {
  HOSTNAME: 'Hostname', ACCESS_PORT: 'Access port', ACCESS_PORTS_10: 'Port VLAN10', ACCESS_PORTS_20: 'Port VLAN20',
  ACCESS_PORT_10: 'Port VLAN10', ACCESS_PORT_20: 'Port VLAN20', ACCESS_PORT_30: 'Port VLAN30', ACCESS_PORT_40: 'Port VLAN40',
  TRUNK_PORT: 'Trunk port', LACP_PORTS: 'Cổng LACP', ROUTED_PORT: 'Routed port', LAN_PORT: 'LAN port', WAN_PORT: 'WAN port',
  TRUNK_PORT_1: 'Trunk 1', TRUNK_PORT_2: 'Trunk 2',
  SECOND_WAN_PORT: 'WAN dự phòng', REMOTE_DEVICE: 'Thiết bị đầu xa', ALLOWED_VLANS: 'Allowed VLAN', VLAN_ID: 'VLAN ID',
  VLAN_NAME: 'Tên VLAN', MGMT_IP: 'IP quản trị', MGMT_GW: 'Gateway quản trị', MGMT_PORT: 'Cổng quản trị', ADMIN_USER: 'SSH username',
  ADMIN_SECRET: 'SSH secret', ENABLE_SECRET: 'Enable secret', PPPOE_USER: 'PPPoE username', PPPOE_PASSWORD: 'PPPoE password',
};

export function LibraryDetail({ article }: { article: LibraryArticle }) {
  const [tab, setTab] = useState<'full' | 'parts'>('full');
  const [inputs, setInputs] = useState<Record<string, string>>(article.variables || {});
  const [generated, setGenerated] = useState<Record<string, string>>(article.variables || {});
  const [favorite, setFavorite] = useState(false);
  const [copied, setCopied] = useState('');
  const { toast } = useToast();
  const keys = article.kind === 'full' ? templateKeys(article) : [];
  useEffect(() => { setFavorite(libraryFavorites().includes(article.id)); }, [article.id]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1800);
      toast('Đã copy cấu hình', '', 'success');
    } catch { toast('Không thể copy', 'Trình duyệt chưa cho phép truy cập clipboard.', 'warning'); }
  };
  const config = article.devices.map(device => `! ===== ${device.name} =====\n${deviceConfig(device, generated)}`).join('\n\n');
  const toggle = () => setFavorite(toggleLibraryFavorite(article.id).includes(article.id));

  return <div className="mx-auto max-w-5xl space-y-5 pb-8 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Link href="/commands" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan-400"><ArrowLeft className="h-4 w-4" /> Quay lại thư viện lệnh</Link>
      <button type="button" onClick={toggle} aria-pressed={favorite} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:border-cyan-500/50"><Star className={`h-4 w-4 ${favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} /> {favorite ? 'Đã yêu thích' : 'Yêu thích'}</button>
    </div>
    <header className="space-y-2 border-b border-border pb-4">
      <div className="flex flex-wrap gap-1.5">{article.tags.map(tag => <Link key={tag} href={`/commands?tag=${encodeURIComponent(tag)}`} className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-300 hover:bg-cyan-500/20">{tag}</Link>)}</div>
      <h1 className="font-mono text-xl font-bold text-emerald-400 sm:text-2xl">{article.title}</h1>
      <p className="text-sm text-muted-foreground">{article.description}</p>
      <button type="button" onClick={() => copy('all', config)} className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10"><Copy className="h-3.5 w-3.5" /> {article.kind === 'full' ? 'Copy tất cả config' : 'Copy tất cả'}</button>
      {article.devices.length > 1 && <p className="text-xs text-yellow-300">Bài có nhiều thiết bị: dùng “Copy Config” ở từng thiết bị khi áp dụng. “Copy tất cả” gồm nhãn phân cách để lưu/đọc.</p>}
    </header>

    {article.topology && <section className="space-y-2"><h2 className="font-semibold text-emerald-400">Mô hình</h2><pre className="cisco-terminal m-0 whitespace-pre overflow-x-auto text-cyan-200">{article.topology}</pre></section>}
    {!!article.lab?.length && <section className="space-y-2"><h2 className="font-semibold text-emerald-400">Thông số lab</h2><ul className="space-y-1 border-l-2 border-cyan-500/40 pl-3 text-xs text-muted-foreground">{article.lab.map((row, index) => <li key={index} className="font-mono">{renderTemplate(row, generated)}</li>)}</ul></section>}
    {article.caution && <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-300">{article.caution}</p>}

    {article.kind === 'full' && <div className="flex border-b border-border" role="tablist" aria-label="Nội dung Full Config">
      <button type="button" role="tab" aria-selected={tab === 'full'} onClick={() => setTab('full')} className={`px-4 py-2 text-xs font-semibold ${tab === 'full' ? 'border-b-2 border-cyan-400 text-cyan-300' : 'text-muted-foreground'}`}>Full Config</button>
      <button type="button" role="tab" aria-selected={tab === 'parts'} onClick={() => setTab('parts')} className={`px-4 py-2 text-xs font-semibold ${tab === 'parts' ? 'border-b-2 border-cyan-400 text-cyan-300' : 'text-muted-foreground'}`}>Giải thích từng phần</button>
    </div>}

    {article.kind === 'full' && tab === 'full' && <div role="tabpanel" className="space-y-4">
      {!!keys.length && <section className="space-y-3 rounded-lg border border-border bg-card p-3 sm:p-4">
        <div><h2 className="font-semibold text-emerald-400">Biến cấu hình</h2><p className="mt-1 text-xs text-muted-foreground">Sửa interface, IP hoặc tên thiết bị rồi bấm Generate Config. Kiểm tra cấu hình từng thiết bị trước khi áp dụng.</p></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{keys.map(key => <label key={key} className="block text-xs text-muted-foreground">{labels[key] || (key.startsWith('HOSTNAME_') ? `Hostname ${key.slice(9).replace(/_/g, '-')}` : key.startsWith('IP_') ? `IP / mask ${key.slice(3).replace(/_/g, '.')}` : key)}<input value={inputs[key] || ''} onChange={event => setInputs({ ...inputs, [key]: event.target.value })} spellCheck={false} className="mt-1 w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-cyan-400 focus:outline-none" /></label>)}</div>
        <button type="button" onClick={() => { if (keys.some(key => !inputs[key]?.trim())) { toast('Thiếu biến', 'Điền đủ các trường trước khi tạo cấu hình.', 'warning'); return; } setGenerated({ ...inputs }); toast('Đã tạo cấu hình', 'Cấu hình đã cập nhật theo biến.', 'success'); }} className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400"><Wand2 className="h-3.5 w-3.5" /> Generate Config</button>
      </section>}
      {article.devices.map(device => { const text = deviceConfig(device, generated); return <section key={device.name} className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-emerald-400">FULL CONFIG · {device.name}</h2><button type="button" onClick={() => copy(device.name, text)} className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">{copied === device.name ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy Config</button></div><pre className="cisco-terminal m-0 whitespace-pre overflow-x-auto">{text}</pre></section>; })}
    </div>}

    {(article.kind === 'topic' || tab === 'parts') && <div role={article.kind === 'full' ? 'tabpanel' : undefined} className="space-y-5">
      <h2 className="font-semibold text-emerald-400">{article.kind === 'full' ? 'Cấu hình từng phần' : 'Lệnh Cisco'}</h2>
      {article.preparation?.map((section, index) => <section key={`preparation-${index}`} className="space-y-1.5 border-l-2 border-yellow-500/50 pl-3"><div className="flex items-start justify-between gap-2"><div><h3 className="text-xs font-semibold text-yellow-300">{section.title}</h3><p className="text-xs text-muted-foreground">{section.explanation}</p></div><button type="button" title="Copy phần chuẩn bị" onClick={() => copy(`preparation-${index}`, section.code)} className="shrink-0 rounded p-1 text-cyan-300 hover:bg-cyan-500/10">{copied === `preparation-${index}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div><pre className="cisco-terminal m-0 whitespace-pre overflow-x-auto">{section.code}</pre></section>)}
      {article.devices.map(device => <section key={device.name} className="space-y-4">{article.devices.length > 1 && <h3 className="border-b border-border pb-1 font-mono font-semibold text-cyan-300">{device.name}</h3>}{device.sections.map((section, index) => { const text = renderTemplate(section.code, generated); return <div key={`${device.name}-${index}`} className="space-y-1.5"><div className="flex items-start justify-between gap-2"><div><h3 className="text-xs font-semibold text-foreground">{index + 1}. {section.title}</h3><p className="text-xs text-muted-foreground">{section.explanation}</p></div><button type="button" title="Copy phần này" onClick={() => copy(`${device.name}-${index}`, text)} className="shrink-0 rounded p-1 text-cyan-300 hover:bg-cyan-500/10">{copied === `${device.name}-${index}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div><pre className="cisco-terminal m-0 whitespace-pre overflow-x-auto">{text}</pre></div>; })}</section>)}
    </div>}

    <section className="space-y-2 border-t border-border pt-4"><h2 className="font-semibold text-emerald-400">Kiểm tra sau cấu hình</h2><div className="divide-y divide-border rounded-lg border border-border bg-card">{article.verify.map((item, index) => <div key={index} className="flex items-start gap-2 p-2.5 sm:p-3"><code className="min-w-0 flex-1 break-all text-xs text-cyan-300">{renderTemplate(item.command, generated)}</code><span className="hidden max-w-[45%] flex-1 text-xs text-muted-foreground sm:block">{item.meaning}</span><button type="button" title="Copy một lệnh" onClick={() => copy(`verify-${index}`, renderTemplate(item.command, generated))} className="shrink-0 text-muted-foreground hover:text-cyan-300">{copied === `verify-${index}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button><span className="sr-only">{item.meaning}</span></div>)}</div><div className="space-y-1 sm:hidden">{article.verify.map((item, index) => <p key={index} className="text-xs text-muted-foreground"><code className="text-cyan-300">{renderTemplate(item.command, generated)}</code> → {item.meaning}</p>)}</div></section>
    <section className="space-y-2"><h2 className="font-semibold text-yellow-300">Lỗi thường gặp</h2>{article.issues.map((item, index) => <div key={index} className="border-l-2 border-yellow-500/50 pl-3 text-xs"><p className="font-semibold text-foreground">{item.symptom}</p><ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">{item.checks.map(check => <li key={check}>{check}</li>)}</ul></div>)}</section>
  </div>;
}
