import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n/use-i18n';

interface ResizableVerticalSplitterProps {
  top: ReactNode;
  bottom: ReactNode;
  defaultTopPercent?: number;
  minTopPercent?: number;
  minBottomPercent?: number;
  storageKey?: string;
}

function readStoredPercent(key: string | undefined, fallback: number): number {
  if (!key) return fallback;
  const raw = localStorage.getItem(key);
  const value = raw ? Number(raw) : fallback;
  return Number.isFinite(value) ? value : fallback;
}

export function ResizableVerticalSplitter({
  top,
  bottom,
  defaultTopPercent = 72,
  minTopPercent = 40,
  minBottomPercent = 18,
  storageKey,
}: ResizableVerticalSplitterProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [topPercent, setTopPercent] = useState(() =>
    readStoredPercent(storageKey, defaultTopPercent),
  );
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientY - rect.top) / rect.height) * 100;
      const maxTop = 100 - minBottomPercent;
      const next = Math.max(minTopPercent, Math.min(percent, maxTop));
      setTopPercent(next);
      if (storageKey) localStorage.setItem(storageKey, String(next));
    },
    [minBottomPercent, minTopPercent, storageKey],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleMouseDownWithListeners = useCallback(() => {
    handleMouseDown();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mouseup', cleanup, { once: true });
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-col overflow-hidden" style={{ height: `${topPercent}%` }}>
        {top}
      </div>
      <div
        className="win-splitter-horizontal shrink-0"
        onMouseDown={handleMouseDownWithListeners}
        role="separator"
        aria-orientation="horizontal"
        title={t('layout.resize')}
      />
      <div className="min-h-0 flex-1 overflow-hidden">{bottom}</div>
    </div>
  );
}
