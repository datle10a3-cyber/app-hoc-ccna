'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Network, Plus, Search } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Topology } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TopologiesPage() {
  const [query, setQuery] = useState('');
  const [topologies, setTopologies] = useState<Topology[]>([]);

  useEffect(() => setTopologies(repository.getTopologies()), []);

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
        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
        <input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mô hình..." className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(topology => <Link key={topology.id} href={`/topologies/${topology.id}`}><Card className="h-full hover:border-primary/30 transition-colors cursor-pointer group"><CardContent className="p-4 min-h-20 flex items-center"><h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">{topology.title}</h3></CardContent></Card></Link>)}
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{topologies.length ? 'Không tìm thấy mô hình phù hợp.' : 'Chưa có mô hình mạng nào.'}</p>}
    </div>
  );
}
