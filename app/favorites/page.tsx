'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Terminal, BookOpen, Network, StickyNote } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lesson, CiscoCommand, Topology, PersonalNote } from '@/lib/types';

export default function FavoritesPage() {
  const [favLessons, setFavLessons] = useState<Lesson[]>([]);
  const [favCommands, setFavCommands] = useState<CiscoCommand[]>([]);
  const [favTopologies, setFavTopologies] = useState<Topology[]>([]);
  const [favNotes, setFavNotes] = useState<PersonalNote[]>([]);

  useEffect(() => {
    setFavLessons(repository.getLessons().filter(l => l.isFavorite));
    setFavCommands(repository.getCommands().filter(c => c.isFavorite));
    setFavTopologies(repository.getTopologies().filter(t => t.isFavorite));
    setFavNotes(repository.getNotes().filter(n => n.isFavorite));
  }, []);

  const isEmpty = favLessons.length + favCommands.length + favTopologies.length + favNotes.length === 0;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Yêu Thích
        </h1>
        <p className="text-xs text-muted-foreground">Các mục đã đánh dấu yêu thích.</p>
      </div>

      {isEmpty && (
        <p className="text-sm text-muted-foreground text-center py-12">Chưa có mục nào được đánh dấu yêu thích.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {favCommands.map(cmd => (
          <Link key={cmd.id} href={`/commands/${cmd.id}`}>
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-mono font-semibold text-primary flex-1 truncate">{cmd.command}</span>
                <Badge variant="info" className="text-[10px]">{cmd.mode}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}

        {favLessons.map(l => (
          <Link key={l.id} href={`/learn/${l.id}`}>
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-semibold text-foreground flex-1 truncate">{l.title}</span>
                <Badge variant="default" className="text-[10px]">{l.topic}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}

        {favTopologies.map(t => (
          <Link key={t.id} href={`/topologies/${t.id}`}>
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-3 flex items-center gap-2">
                <Network className="w-4 h-4 text-violet-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground flex-1 truncate">{t.title}</span>
                <Badge variant="outline" className="text-[10px]">{t.devices.length} thiết bị</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}

        {favNotes.map(n => (
          <Link key={n.id} href="/notes">
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-3 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground flex-1 truncate">{n.title}</span>
                <Badge variant="warning" className="text-[10px]">{n.type}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
