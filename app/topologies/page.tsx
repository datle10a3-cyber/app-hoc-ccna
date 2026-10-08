'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Network, Plus, Search } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Topology } from '@/lib/types';
import { CollectionItem } from '@/components/ui/collection-item';
import { Button } from '@/components/ui/button';

export default function TopologiesPage() {
  const [query, setQuery] = useState('');
  const [topologies, setTopologies] = useState<Topology[]>([]);

  useEffect(() => {
    const refresh = () => setTopologies(repository.getTopologies());
    refresh();
    window.addEventListener('ccna:data-sync', refresh);
    return () => window.removeEventListener('ccna:data-sync', refresh);
  }, []);

  const filtered = topologies.filter(topology =>
    `${topology.title} ${topology.description} ${topology.devices.join(' ')}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-lg font-extrabold text-foreground flex items-center gap-2"><Network className="w-5 h-5 text-primary" /> Mô Hình Mạng</h1></div>
        <Link href="/topologies/new" className="w-full sm:w-auto"><Button size="sm" className="w-full gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> Thêm Mô Hình</Button></Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mô hình..." className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {filtered.map(topology => <CollectionItem key={topology.id} href={`/topologies/${encodeURIComponent(topology.id)}`} title={topology.title} icon={Network} badge={`${topology.devices.length} thiết bị`} />)}
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{topologies.length ? 'Không tìm thấy mô hình phù hợp.' : 'Chưa có mô hình mạng nào.'}</p>}
    </div>
  );
}
