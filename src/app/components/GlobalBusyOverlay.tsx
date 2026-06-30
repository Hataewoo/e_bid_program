import { useEffect } from 'react';
import { useAppStore } from '../stores';
import { useI18n } from '@/i18n/use-i18n';

export function GlobalBusyOverlay() {
  const { t } = useI18n();
  const busyDepth = useAppStore((s) => s.busyDepth);
  const busyMessageKey = useAppStore((s) => s.busyMessageKey);
  const isBusy = busyDepth > 0;

  useEffect(() => {
    if (!isBusy) return undefined;

    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'wait';
    return () => {
      document.body.style.cursor = prevCursor;
    };
  }, [isBusy]);

  if (!isBusy) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[500] flex items-center justify-center bg-black/25"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="win-dialog-window min-w-[280px] shadow-lg">
        <div className="win-titlebar">{t('busy.title')}</div>
        <div className="flex items-center gap-3 bg-[#ece9d8] px-4 py-3">
          <div className="win-classic-spinner" aria-hidden="true" />
          <span className="text-sm text-content">{t(busyMessageKey ?? 'busy.default')}</span>
        </div>
      </div>
    </div>
  );
}
