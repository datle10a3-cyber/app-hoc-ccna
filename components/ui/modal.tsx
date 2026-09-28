'use client';

import React, { useEffect } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className={cn(
        "relative z-50 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
        className
      )}>
        {title && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border shrink-0">
            <h2 className="text-xs sm:text-sm font-bold text-foreground truncate pr-2">{title}</h2>
            <button 
              onClick={onClose} 
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
