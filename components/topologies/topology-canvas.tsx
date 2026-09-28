'use client';

import React from 'react';
import { Topology } from '@/lib/types';
import { Router, Server, Laptop, HardDrive, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function TopologyCanvas({ topology }: { topology: Topology }) {
  const renderIcon = (type: string) => {
    switch (type) {
      case 'Cisco Router':
        return <Router className="w-6 h-6 text-cisco-blue" />;
      case 'Cisco L2 Switch':
      case 'Cisco L3 Switch':
        return <HardDrive className="w-6 h-6 text-cyan-400" />;
      case 'Server':
        return <Server className="w-6 h-6 text-emerald-400" />;
      case 'Cloud/Internet':
        return <Cloud className="w-6 h-6 text-slate-400" />;
      default:
        return <Laptop className="w-6 h-6 text-purple-400" />;
    }
  };

  return (
    <div className="relative w-full h-[320px] bg-cli-bg border border-slate-800 rounded-xl overflow-hidden p-4 shadow-inner select-none">
      <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
        <Badge variant="info" className="text-[10px] font-mono">Sơ Đồ Mạng Động Packet Tracer</Badge>
      </div>

      {/* SVG Link Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {topology.links.map((link, idx) => {
          const fromNode = topology.nodes.find(n => n.id === link.from);
          const toNode = topology.nodes.find(n => n.id === link.to);
          if (!fromNode || !toNode) return null;

          return (
            <g key={idx}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#38bdf8"
                strokeWidth="2"
                className="opacity-70"
              />
              {link.label && (
                <text
                  x={(fromNode.x + toNode.x) / 2}
                  y={(fromNode.y + toNode.y) / 2 - 6}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {link.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Device Nodes */}
      {topology.nodes.map(node => (
        <div
          key={node.id}
          style={{ left: `${node.x - 24}px`, top: `${node.y - 24}px` }}
          className="absolute z-10 flex flex-col items-center group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg group-hover:border-cisco-blue group-hover:scale-110 transition-all">
            {renderIcon(node.type)}
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-200 mt-1 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
            {node.label}
          </span>
          {node.ip && <span className="text-[9px] font-mono text-cisco-blue">{node.ip}</span>}
        </div>
      ))}
    </div>
  );
}
