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

function clampPercent(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function readStoredPercent(
  key: string | undefined,
  fallback: number,
  minTop: number,
  minBottom: number,
): number {
  const maxTop = 100 - minBottom;
  if (!key) return clampPercent(fallback, minTop, maxTop);
  const raw = localStorage.getItem(key);
  const value = raw ? Number(raw) : fallback;
  if (!Number.isFinite(value)) return clampPercent(fallback, minTop, maxTop);
  return clampPercent(value, minTop, maxTop);
}

export function ResizableVerticalSplitter({
  top,
  bottom,
  defaultTopPercent = 72,
  minTopPercent = 25,
  minBottomPercent = 15,
  storageKey,
}: ResizableVerticalSplitterProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [topPercent, setTopPercent] = useState(() =>
    readStoredPercent(storageKey, defaultTopPercent, minTopPercent, minBottomPercent),
  );
  const isDragging = useRef(false);

  const bottomPercent = 100 - topPercent;

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;
      const percent = ((e.clientY - rect.top) / rect.height) * 100;
      const maxTop = 100 - minBottomPercent;
      const next = clampPercent(percent, minTopPercent, maxTop);
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
    <div ref={containerRef} className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div
        className="flex min-h-0 flex-col overflow-hidden"
        style={{ flex: `${topPercent} 1 0%` }}
      >
        {top}
      </div>
      <div
        className="win-splitter-horizontal z-10 shrink-0"
        onMouseDown={handleMouseDownWithListeners}
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={topPercent}
        title={t('layout.resize')}
      />
      <div
        className="flex min-h-0 flex-col overflow-hidden"
        style={{ flex: `${bottomPercent} 1 0%` }}
      >
        {bottom}
      </div>
    </div>
  );
}
