'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Terminal, Network, StickyNote, ArrowRight, Plus } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import { Lesson, CiscoCommand } from '@/lib/types';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLessons: 0, totalCommands: 0, totalTopologies: 0, totalNotes: 0 });
  const [recentLessons, setRecentLessons] = useState<Lesson[]>([]);
  const [recentCommands, setRecentCommands] = useState<CiscoCommand[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats(repository.getDashboardStats());
      setRecentLessons(repository.getLessons().slice(0, 3));
      setRecentCommands(repository.getCommands().slice(0, 4));
      setLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const statCards = [
    { label: 'Bài Học', value: stats.totalLessons, icon: BookOpen, href: '/learn', color: 'text-amber-500' },
    { label: 'Lệnh Cisco', value: stats.totalCommands, icon: Terminal, href: '/commands', color: 'text-amber-400' },
    { label: 'Mô Hình', value: stats.totalTopologies, icon: Network, href: '/topologies', color: 'text-amber-500' },
    { label: 'Ghi Chú', value: stats.totalNotes, icon: StickyNote, href: '/notes', color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto active:scale-[0.995] transition-all duration-150">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">Sổ Tay CCNA</h1>
          <p className="text-xs text-muted-foreground">Tổng hợp bài học, lệnh Cisco và ghi chú tự học.</p>
        </div>
        <Link href="/learn/new">
          <Button size="sm" className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs active:scale-95 transition-transform">
            <Plus className="w-3.5 h-3.5" /> Thêm Bài Học
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(s => (
          <Link key={s.label} href={s.href}>
            <Card className="p-3.5 hover:border-amber-500/40 transition-all cursor-pointer border-border/80 shadow-xs active:scale-95">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-semibold">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-12 mt-1" />
              ) : (
                <p className="text-2xl font-black font-mono mt-1 text-foreground">{s.value}</p>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Lessons */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between p-3.5 border-b border-border">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-500" /> Bài Học Gần Đây
            </span>
            <Link href="/learn" className="text-xs text-amber-500 hover:underline flex items-center gap-0.5 font-medium">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <CardContent className="p-3.5 space-y-2.5">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : (
              recentLessons.map(l => (
                <Link key={l.id} href={`/learn/${l.id}`}>
                  <div className="p-3 rounded-lg border border-border/70 hover:border-amber-500/40 bg-muted/20 transition-all active:scale-[0.99]">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="text-[10px] bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30">
                        {l.topic}
                      </Badge>
                      <span className="text-xs font-bold text-foreground">{l.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{l.summary}</p>
                  </div>
                </Link>
              ))
            )}
            {!loading && recentLessons.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Chưa có bài học nào.</p>
            )}
          </CardContent>
        </Card>

        {/* Commands */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-3.5 border-b border-border">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-500" /> Lệnh Cisco
            </span>
            <Link href="/commands" className="text-xs text-amber-500 hover:underline flex items-center gap-0.5 font-medium">
              Thư viện <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <CardContent className="p-3.5 space-y-2.5">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ) : (
              recentCommands.map(cmd => (
                <Link key={cmd.id} href={`/commands/${cmd.id}`}>
                  <div className="p-2.5 rounded-lg bg-[#14120e] border border-amber-500/20 hover:border-amber-500/50 transition-colors active:scale-[0.99]">
                    <span className="text-xs font-mono font-bold text-amber-400">{cmd.title || cmd.command}</span>
                  </div>
                </Link>
              ))
            )}
            {!loading && recentCommands.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Chưa có lệnh nào.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
