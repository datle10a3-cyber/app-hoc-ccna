'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Search, Plus } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Lesson } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LearnPage() {
  const [query, setQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    const refresh = () => setLessons(repository.getLessons());
    refresh();
    window.addEventListener('ccna:data-sync', refresh);
    return () => window.removeEventListener('ccna:data-sync', refresh);
  }, []);

  const topicsList = Array.from(new Set(lessons.map(l => l.topic)));
  const filtered = lessons.filter(l => {
    const matchQ = l.title.toLowerCase().includes(query.toLowerCase()) || l.summary.toLowerCase().includes(query.toLowerCase());
    const matchT = selectedTopic === 'All' || l.topic === selectedTopic;
    return matchQ && matchT;
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Bài Học CCNA
          </h1>
        </div>
        <Link href="/learn/new" className="w-full sm:w-auto">
          <Button size="sm" className="w-full gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Thêm Bài Học
          </Button>
        </Link>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm bài học..."
            className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={selectedTopic}
          onChange={e => setSelectedTopic(e.target.value)}
          className="px-2.5 py-1.5 bg-muted/30 border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="All">Tất cả</option>
          {topicsList.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(lesson => (
          <Link key={lesson.id} href={`/learn/${lesson.id}`}>
            <Card className="collection-card h-full cursor-pointer group">
              <CardContent className="p-4 min-h-20 flex items-center">
                <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">{lesson.title}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Chưa có bài học nào.</p>
      )}
    </div>
  );
}
