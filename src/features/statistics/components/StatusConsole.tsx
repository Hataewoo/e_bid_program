import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { useStatisticsStore } from '../stores/statistics-store';

const LEVEL_CLASS: Record<string, string> = {
  ready: 'text-green-600',
  waiting: 'text-yellow-600',
  info: 'text-content',
};

export function StatusConsole() {
  const { t } = useI18n();
  const logs = useStatisticsStore((s) => s.logs);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex h-32 shrink-0 flex-col border-t border-border">
      <div className="win-panel-header">{t('statistics.console.title')}</div>
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
