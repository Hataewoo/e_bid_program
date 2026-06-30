import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n/use-i18n';

interface ResizableSplitterProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  storageKey?: string;
}

function readStoredWidth(key: string | undefined, fallback: number): number {
  if (!key) return fallback;
  const raw = localStorage.getItem(key);
  const value = raw ? Number(raw) : fallback;
  return Number.isFinite(value) ? value : fallback;
}

export function ResizableSplitter({
  left,
  right,
  defaultLeftWidth = 320,
  minLeftWidth = 240,
  minRightWidth = 400,
  storageKey,
}: ResizableSplitterProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(() => readStoredWidth(storageKey, defaultLeftWidth));
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const maxWidth = rect.width - minRightWidth;
      const next = Math.max(minLeftWidth, Math.min(newWidth, maxWidth));
      setLeftWidth(next);
      if (storageKey) localStorage.setItem(storageKey, String(next));
    },
    [minLeftWidth, minRightWidth, storageKey],
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
    <div ref={containerRef} className="win-split-container flex min-h-0 flex-1">
      <div className="win-panel shrink-0 overflow-hidden" style={{ width: leftWidth }}>
        {left}
      </div>
      <div
        className="win-splitter shrink-0"
        onMouseDown={handleMouseDownWithListeners}
        role="separator"
        aria-orientation="vertical"
        title={t('layout.resize')}
      />
      <div className="win-panel min-w-0 flex-1 overflow-hidden">{right}</div>
    </div>
  );
}
