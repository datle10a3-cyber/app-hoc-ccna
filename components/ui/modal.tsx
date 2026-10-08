'use client';

import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const titleId = useId();
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} className={cn(
        "relative z-50 w-full max-w-2xl rounded-t-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col sm:rounded-2xl sm:max-h-[90vh]",
        className
      )}>
        {title && (
          <div className="flex min-h-14 items-center justify-between px-4 sm:px-6 py-3 border-b border-border shrink-0">
            <h2 id={titleId} className="text-base sm:text-lg font-bold text-foreground truncate pr-2">{title}</h2>
            <button 
              onClick={onClose} 
              className="grid h-11 w-11 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
