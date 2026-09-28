'use client';

import React, { useState } from 'react';
import { Copy, Check, Table as TableIcon } from 'lucide-react';
import { IPAddressEntry } from '@/lib/types';
import { useToast } from '@/components/ui/toast';

export function IPAddressingTable({ data }: { data: IPAddressEntry[] }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyTable = () => {
    const text = data.map(d => `${d.device}\t${d.interfaceName}\t${d.ipAddress}\t${d.subnetMask}\t${d.defaultGateway || '-'}\t${d.vlan || '-'}`).join('\n');
    navigator.clipboard.writeText(`Device\tInterface\tIP Address\tSubnet Mask\tGateway\tVLAN\n` + text);
    setCopied(true);
    toast('IP Table Copied!', 'Exported IP addressing table in tab-separated format.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <TableIcon className="w-3.5 h-3.5 text-cisco-blue" /> IP Addressing & Interface Table
        </h4>
        <button
          onClick={handleCopyTable}
          className="text-xs text-cisco-blue hover:underline flex items-center gap-1 font-semibold"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied Table' : 'Copy Table'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
            <tr>
              <th className="px-4 py-2.5">Device</th>
              <th className="px-4 py-2.5">Interface</th>
              <th className="px-4 py-2.5">IP Address</th>
              <th className="px-4 py-2.5">Subnet Mask</th>
              <th className="px-4 py-2.5">Default Gateway</th>
              <th className="px-4 py-2.5">VLAN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/40 font-mono">
                <td className="px-4 py-2 font-bold text-cisco-blue">{row.device}</td>
                <td className="px-4 py-2 text-foreground">{row.interfaceName}</td>
                <td className="px-4 py-2 font-semibold text-emerald-400">{row.ipAddress}</td>
                <td className="px-4 py-2 text-muted-foreground">{row.subnetMask}</td>
                <td className="px-4 py-2 text-muted-foreground">{row.defaultGateway || '-'}</td>
                <td className="px-4 py-2 text-purple-400">{row.vlan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
