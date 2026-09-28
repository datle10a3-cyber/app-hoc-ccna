'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, StickyNote } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { PersonalNote } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm ghi chú..." className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={selectedType} onChange={event => setSelectedType(event.target.value)} className="px-2.5 py-1.5 bg-muted/30 border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="All">Tất cả</option>
          {noteTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(note => (
          <Link key={note.id} href={`/notes/${note.id}`}>
            <Card className="collection-card h-full cursor-pointer group">
              <CardContent className="p-4 min-h-20 flex items-center">
                <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">{note.title}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{notes.length ? 'Không tìm thấy ghi chú phù hợp.' : 'Chưa có ghi chú nào.'}</p>}
    </div>
  );
}
