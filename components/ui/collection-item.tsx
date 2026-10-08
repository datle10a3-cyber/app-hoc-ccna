import React from 'react';
import Link from 'next/link';
import { ChevronRight, LucideIcon } from 'lucide-react';

/** A compact reading target with a separate, touch-friendly action area. */
export function CollectionItem({ href, title, icon: Icon, badge, preview, actions }: {
  href: string;
  title: string;
  icon: LucideIcon;
  badge?: string;
  preview?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return <article className="collection-card collection-item min-w-0 rounded-xl border border-border bg-card">
    <Link href={href} className="collection-item-link flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Xem ${title}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="break-words text-sm font-semibold leading-5 text-foreground [overflow-wrap:anywhere]">{title}</span>
          {badge && <span className="max-w-full break-words rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-muted-foreground [overflow-wrap:anywhere]">{badge}</span>}
        </span>
        {preview && <span className="block min-w-0 text-xs leading-5 text-muted-foreground">{preview}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
    {actions && <div className="collection-item-actions">{actions}</div>}
  </article>;
}
