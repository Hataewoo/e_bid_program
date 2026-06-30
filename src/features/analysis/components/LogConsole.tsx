import { useEffect, useRef } from 'react';
import { useAnalysisStore } from '../stores/analysis-store';

const LEVEL_CLASS: Record<string, string> = {
  ready: 'text-green-600',
  info: 'text-content',
  error: 'text-red-600',
};

export function LogConsole() {
  const logs = useAnalysisStore((s) => s.logs);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex h-36 shrink-0 flex-col border-t border-border">
      <div className="win-panel-header">Log Console</div>
      <div className="min-h-0 flex-1 overflow-auto bg-surface-muted p-2 font-mono text-xs">
        {logs.map((log) => (
          <div key={log.id} className={`py-0.5 ${LEVEL_CLASS[log.level] ?? ''}`}>
            <span className="text-content-muted">
              [{log.timestamp.toLocaleTimeString('ko-KR')}]
            </span>{' '}
            {log.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
