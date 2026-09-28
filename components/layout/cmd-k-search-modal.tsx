'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Terminal, Network, StickyNote, X } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Badge } from '@/components/ui/badge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CmdKSearchModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = query.trim() ? repository.searchAll(query) : { lessons: [], commands: [], topologies: [], notes: [] };
  const hasResults = results.lessons.length + results.commands.length + results.topologies.length + results.notes.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm bài học, lệnh Cisco, ghi chú..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {query.trim() && (
          <div className="max-h-72 overflow-y-auto p-2">
            {!hasResults && (
              <p className="text-xs text-muted-foreground text-center py-6">Không tìm thấy kết quả.</p>
            )}

            {results.lessons.map(l => (
              <Link key={l.id} href={`/learn/${l.id}`} onClick={onClose}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-xs">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-foreground truncate">{l.title}</span>
                <Badge variant="default" className="ml-auto text-[10px]">Bài học</Badge>
              </Link>
            ))}

            {results.commands.map(c => (
              <Link key={c.id} href={`/commands/${c.id}`} onClick={onClose}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-xs">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium text-foreground truncate">{c.title}</span>
                <Badge variant="info" className="ml-auto text-[10px]">Lệnh</Badge>
              </Link>
            ))}

            {results.topologies.map(t => (
              <Link key={t.id} href={`/topologies/${t.id}`} onClick={onClose}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-xs">
                <Network className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-medium text-foreground truncate">{t.title}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">Mô hình</Badge>
              </Link>
            ))}

            {results.notes.map(n => (
              <Link key={n.id} href="/notes" onClick={onClose}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-xs">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium text-foreground truncate">{n.title}</span>
                <Badge variant="warning" className="ml-auto text-[10px]">Ghi chú</Badge>
              </Link>
            ))}
          </div>
        )}

        {!query.trim() && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Gõ từ khóa để tìm kiếm bài học, lệnh, mô hình, ghi chú...
          </div>
        )}
      </div>
    </div>
  );
}
