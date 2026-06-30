import { useEffect } from 'react';
import { useAppStore } from '../stores';

import { translate } from '@/i18n/translate';

function formatUnknownError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  return translate('error.unexpected');
}

export function GlobalErrorListeners() {
  const setSystemError = useAppStore((s) => s.setSystemError);

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const message = formatUnknownError(event.reason);
      if (
        message.includes('IPC') ||
        message.includes('Database') ||
        message.includes('Electron API')
      ) {
        setSystemError(message);
      }
    };

    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, [setSystemError]);

  return null;
}
