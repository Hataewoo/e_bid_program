import { useCallback, useEffect, useState } from 'react';
import { electronService } from '@/services';
import { useI18n } from '@/i18n/use-i18n';
import type { AppUpdateAvailableNotice } from '@/types/app-update';

export function useAppUpdate() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [available, setAvailable] = useState<AppUpdateAvailableNotice | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    void electronService.isUpdaterEnabled().then(setEnabled);
    return electronService.onUpdateProgress((progress) => {
      setDownloadPercent(progress.percent);
    });
  }, []);

  useEffect(() => {
    return electronService.onUpdateAvailable((info) => {
      setAvailable(info);
      setMessage(t('settings.update.availableStartup', { version: info.latestVersion }));
    });
  }, [t]);

  const check = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    setDownloaded(false);
    setDownloadPercent(null);
    try {
      const result = await electronService.checkForUpdates();
      if (!result.ok) {
        if (result.status === 'disabled') {
          setMessage(t('settings.update.devOnly'));
          setAvailable(null);
          return;
        }
        setMessage(t('settings.update.error', { detail: result.message }));
        return;
      }

      if (result.status === 'not-available') {
        setAvailable(null);
        setMessage(t('settings.update.latest', { version: result.currentVersion }));
        return;
      }

      setAvailable(result);
      setMessage(
        t('settings.update.available', {
          current: result.currentVersion,
          latest: result.latestVersion,
        }),
      );
    } finally {
      setBusy(false);
    }
  }, [t]);

  const download = useCallback(async () => {
    setBusy(true);
    setMessage(t('settings.update.downloading'));
    setDownloadPercent(0);
    try {
      const result = await electronService.downloadUpdate();
      if (!result.ok) {
        setMessage(t('settings.update.error', { detail: result.message }));
        return;
      }
      setDownloaded(true);
      setMessage(t('settings.update.downloaded'));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const install = useCallback(() => {
    electronService.quitAndInstallUpdate();
  }, []);

  return {
    enabled,
    busy,
    message,
    available,
    downloadPercent,
    downloaded,
    check,
    download,
    install,
  };
}
