import { useEffect, useState } from 'react';

interface RatioProgressBarProps {
  value: number;
  tooltip: string;
  variant: 'low' | 'high';
}

export function RatioProgressBar({ value, tooltip, variant }: RatioProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const barColor = variant === 'low' ? 'bg-blue-500' : 'bg-orange-500';

  return (
    <div className="group relative mt-2" title={tooltip}>
      <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${barColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface-elevated px-2 py-1 text-xs shadow-sm group-hover:block">
        {tooltip}
      </div>
    </div>
  );
}
