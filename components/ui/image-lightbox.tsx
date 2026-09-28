'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';

const clampZoom = (value: number) => Math.min(5, Math.max(1, value));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

export function ImageLightbox({ src, alt, onClose }: { src: string | null; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ distance: 0, zoom: 1, x: 0, y: 0, pointerX: 0, pointerY: 0 });

  const reset = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);
  const changeZoom = useCallback((amount: number) => {
    setZoom(current => {
      const next = clampZoom(current + amount);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!src) return;
    reset();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === '+' || event.key === '=') changeZoom(0.25);
      if (event.key === '-' || event.key === '_') changeZoom(-0.25);
      if (event.key === '0') reset();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [src, onClose, changeZoom, reset]);

  if (!src) return null;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = Array.from(pointers.current.values());
    if (current.length >= 2) {
      gesture.current = { ...gesture.current, distance: distance(current[0], current[1]), zoom, x: offset.x, y: offset.y };
    } else {
      gesture.current = { ...gesture.current, pointerX: event.clientX, pointerY: event.clientY, x: offset.x, y: offset.y };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = Array.from(pointers.current.values());
    if (current.length >= 2) {
      const startDistance = gesture.current.distance || distance(current[0], current[1]);
      setZoom(clampZoom(gesture.current.zoom * distance(current[0], current[1]) / startDistance));
    } else if (zoom > 1) {
      setOffset({ x: gesture.current.x + event.clientX - gesture.current.pointerX, y: gesture.current.y + event.clientY - gesture.current.pointerY });
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 1) {
      const [point] = Array.from(pointers.current.values());
      gesture.current = { ...gesture.current, pointerX: point.x, pointerY: point.y, x: offset.x, y: offset.y, distance: 0, zoom };
    }
  };

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={alt || 'Xem ảnh phóng to'} onClick={onClose}>
      <div className="image-lightbox-toolbar" onClick={event => event.stopPropagation()}>
        <span className="image-lightbox-caption">{alt || 'Ảnh phóng to'}</span>
        <button type="button" onClick={() => changeZoom(-0.25)} disabled={zoom <= 1} aria-label="Thu nhỏ ảnh"><Minus /></button>
        <span className="image-lightbox-zoom" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => changeZoom(0.25)} disabled={zoom >= 5} aria-label="Phóng to ảnh"><Plus /></button>
        <button type="button" onClick={reset} aria-label="Đặt lại kích thước"><RotateCcw /></button>
        <button type="button" onClick={onClose} aria-label="Đóng ảnh"><X /></button>
      </div>
      <div className="image-lightbox-stage" onClick={event => event.stopPropagation()} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={event => { event.preventDefault(); changeZoom(event.deltaY < 0 ? 0.2 : -0.2); }}>
        <img src={src} alt={alt} draggable={false} className="image-lightbox-image" style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})` }} />
      </div>
      <p className="image-lightbox-hint">Cuộn hoặc dùng hai ngón tay để zoom · Kéo ảnh khi đã phóng to · Esc để đóng</p>
    </div>
  );
}
