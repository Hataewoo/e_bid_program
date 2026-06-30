import { useCallback, useState } from 'react';
import { electronService } from '@/services';
import { useAppStore } from '@/app/stores';
import { useI18n } from '@/i18n/use-i18n';
import { confirmDanger } from '@/lib/confirm-dialog';
import { formatAppErrors } from '@/i18n/format-app-errors';

export function useDatabaseBackupRestore() {
  const { t } = useI18n();
  const setDbStatus = useAppStore((s) => s.setDbStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshDbStatus = useCallback(async () => {
    const status = await electronService.getDbStatus();
    setDbStatus(status);
  }, [setDbStatus]);

  const backup = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await electronService.backupDatabase();
      if (result.cancelled) return;
      if (!result.success) {
        setMessage(formatAppErrors(result.errors, 'error.backupFailed'));
        return;
      }
      setMessage(t('settings.db.backupSuccess'));
      await refreshDbStatus();
    } finally {
      setBusy(false);
    }
  }, [refreshDbStatus, t]);

  const restore = useCallback(async () => {
    if (!(await confirmDanger(t('settings.db.restoreConfirm')))) return;

    setBusy(true);
    setMessage(null);
    try {
      const result = await electronService.restoreDatabase();
      if (result.cancelled) return;
      if (!result.success) {
        setMessage(formatAppErrors(result.errors, 'error.restoreFailed'));
        return;
      }
      setMessage(t('settings.db.restoreSuccess'));
      await refreshDbStatus();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }, [refreshDbStatus, t]);

  return { busy, message, backup, restore };
}
