import { useEffect, useRef } from 'react';
import { useAppStore } from '@/app/stores';
import { translate } from '@/i18n/translate';
import { electronService } from '@/services';
import { reportSystemError, withIpcGuard } from '@/services/ipc-guard';

export function useAppInit() {
  const setTheme = useAppStore((s) => s.setTheme);
  const setVersion = useAppStore((s) => s.setVersion);
  const setDbStatus = useAppStore((s) => s.setDbStatus);
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [version, dbStatus] = await Promise.all([
          withIpcGuard('app:getVersion', () => electronService.getVersion(), {
            alertOnFail: false,
          }),
          withIpcGuard('db:getStatus', () => electronService.getDbStatus()),
        ]);

        if (cancelled) return;

        setVersion(version);
        setDbStatus(dbStatus);

        if (!dbStatus.connected) {
          reportSystemError(translate('error.dbConnectFailed'));
        }
      } catch {
        if (cancelled) return;
        setDbStatus({ connected: false, path: '', tableCounts: {} });
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [setVersion, setDbStatus]);
}

export function useDbStatusRefresh(intervalMs = 15000) {
  const setDbStatus = useAppStore((s) => s.setDbStatus);
  const setSystemError = useAppStore((s) => s.setSystemError);
  const clearSystemError = useAppStore((s) => s.clearSystemError);
  const wasConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const status = await withIpcGuard('db:getStatus', () => electronService.getDbStatus(), {
          alertOnFail: false,
        });
        if (cancelled) return;

        const wasConnected = wasConnectedRef.current;
        wasConnectedRef.current = status.connected;
        setDbStatus(status);

        if (status.connected) {
          clearSystemError();
        } else if (wasConnected === true) {
          setSystemError(translate('error.dbDisconnected'));
        }
      } catch {
        if (cancelled) return;
        wasConnectedRef.current = false;
        setDbStatus({ connected: false, path: '', tableCounts: {} });
      }
    }

    void refresh();

    if (!intervalMs || intervalMs < 5000) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(() => void refresh(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [setDbStatus, setSystemError, clearSystemError, intervalMs]);
}
