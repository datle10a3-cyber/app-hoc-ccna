'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, StickyNote } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { PersonalNote } from '@/lib/types';
import { CollectionItem } from '@/components/ui/collection-item';
import { Button } from '@/components/ui/button';

export default function NotesPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [notes, setNotes] = useState<PersonalNote[]>([]);

  useEffect(() => {
    const savedNotes = repository.getNotes();
    setNotes(savedNotes);
    const linkedNoteId = new URLSearchParams(window.location.search).get('note');
    if (linkedNoteId) router.replace(`/notes/${encodeURIComponent(linkedNoteId)}`);
  }, [router]);

  useEffect(() => {
    const refresh = () => setNotes(repository.getNotes());
    window.addEventListener('ccna:data-sync', refresh);
    return () => window.removeEventListener('ccna:data-sync', refresh);
  }, []);

  const noteTypes = Array.from(new Set(notes.map(note => note.type).filter(Boolean)));
  const filtered = notes.filter(note => {
    const content = `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase();
    return content.includes(query.toLowerCase()) && (selectedType === 'All' || note.type === selectedType);
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" /> Ghi Chú Cá Nhân
          </h1>
        </div>
        <Link href="/notes/new" className="w-full sm:w-auto">
          <Button size="sm" className="w-full gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> Thêm Ghi Chú</Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm ghi chú..." className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={selectedType} onChange={event => setSelectedType(event.target.value)} className="max-w-[45%] min-w-0 truncate px-2.5 py-1.5 bg-muted/30 border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="All">Tất cả</option>
          {noteTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {filtered.map(note => <CollectionItem key={note.id} href={`/notes/${encodeURIComponent(note.id)}`} title={note.title} icon={StickyNote} badge={note.type} />)}
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{notes.length ? 'Không tìm thấy ghi chú phù hợp.' : 'Chưa có ghi chú nào.'}</p>}
    </div>
  );
}
