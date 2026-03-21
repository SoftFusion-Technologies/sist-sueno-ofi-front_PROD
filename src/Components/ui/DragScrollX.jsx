import React, { useEffect, useRef, useState } from 'react';

/*
 * Benjamin Orellana - 18-03-2026 - Helper reusable para tablas/listados anchos
 * Permite scroll horizontal arrastrando desde cualquier parte del contenedor,
 * con soporte visual completo para light y dark mode.
 */

const INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  '[role="button"]',
  '[data-no-drag-scroll="true"]'
].join(',');

export default function DragScrollX({
  children,
  className = '',
  innerClassName = ''
}) {
  const viewportRef = useRef(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0
  });

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const viewport = viewportRef.current;
      if (!viewport || !dragRef.current.active) return;

      const delta = e.pageX - dragRef.current.startX;
      viewport.scrollLeft = dragRef.current.scrollLeft - delta;
    };

    const stopDrag = () => {
      dragRef.current.active = false;
      setIsDragging(false);
      document.body.classList.remove('select-none');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('mouseleave', stopDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('mouseleave', stopDrag);
    };
  }, []);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    if (e.target.closest(INTERACTIVE_SELECTOR)) return;

    dragRef.current = {
      active: true,
      startX: e.pageX,
      scrollLeft: viewport.scrollLeft
    };

    setIsDragging(true);
    document.body.classList.add('select-none');
  };

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        className={[
          'relative overflow-auto rounded-2xl border shadow-sm',
          'border-slate-200 bg-white',
          'dark:border-white/10 dark:bg-slate-900/70 dark:shadow-2xl',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          className
        ].join(' ')}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className={['min-w-max', innerClassName].join(' ')}>
          {children}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-2xl bg-gradient-to-r from-white to-transparent dark:from-slate-900/95 dark:to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-2xl bg-gradient-to-l from-white to-transparent dark:from-slate-900/95 dark:to-transparent" />
    </div>
  );
}
