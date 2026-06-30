import { createRequire } from 'node:module';
import { app, type BrowserWindow } from 'electron';
import type { AppUpdater } from 'electron-updater';
import { fileLogger } from '../logger/file-logger';

/**
 * Packaged Electron main runs as ESM; electron-updater is CommonJS.
 * Named ESM imports fail at runtime — load via createRequire instead.
 */
const require = createRequire(import.meta.url);
const autoUpdater = (require('electron-updater') as { autoUpdater: AppUpdater }).autoUpdater;

export type AppUpdateCheckResult =
  | { ok: true; status: 'not-available'; currentVersion: string }
  | {
      ok: true;
      status: 'available';
      currentVersion: string;
      latestVersion: string;
      releaseNotes?: string;
    }
  | { ok: false; status: 'disabled'; reason: 'development' }
  | { ok: false; status: 'error'; message: string };

export type AppUpdateDownloadResult =
  | { ok: true }
  | { ok: false; message: string };

export function isUpdaterEnabled(): boolean {
  return app.isPackaged;
}

export function initAppUpdater(getMainWindow: () => BrowserWindow | null): void {
  if (!isUpdaterEnabled()) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    fileLogger.info('Update check started');
  });

  autoUpdater.on('update-available', (info) => {
    fileLogger.info('Update available', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    fileLogger.info('Update not available');
  });

  autoUpdater.on('download-progress', (progress) => {
    getMainWindow()?.webContents.send('app:update-progress', {
      percent: progress.percent,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    fileLogger.info('Update downloaded', info.version);
  });

  autoUpdater.on('error', (error) => {
    fileLogger.error('Auto-update error', error);
  });
}

function formatReleaseNotes(notes: unknown): string | undefined {
  if (typeof notes === 'string') return notes;
  if (Array.isArray(notes)) {
    return notes
      .map((entry) => (typeof entry === 'string' ? entry : (entry as { note?: string }).note))
      .filter(Boolean)
      .join('\n');
  }
  return undefined;
}

export async function checkForAppUpdates(): Promise<AppUpdateCheckResult> {
  if (!isUpdaterEnabled()) {
    return { ok: false, status: 'disabled', reason: 'development' };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    const currentVersion = app.getVersion();

    if (result?.isUpdateAvailable && result.updateInfo?.version) {
      return {
        ok: true,
        status: 'available',
        currentVersion,
        latestVersion: result.updateInfo.version,
        releaseNotes: formatReleaseNotes(result.updateInfo.releaseNotes),
      };
    }

    return { ok: true, status: 'not-available', currentVersion };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fileLogger.error('Update check failed', error);
    return { ok: false, status: 'error', message };
  }
}

export async function downloadAppUpdate(): Promise<AppUpdateDownloadResult> {
  if (!isUpdaterEnabled()) {
    return { ok: false, message: 'Updater is only available in packaged builds.' };
  }

  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fileLogger.error('Update download failed', error);
    return { ok: false, message };
  }
}

export function quitAndInstallAppUpdate(): void {
  autoUpdater.quitAndInstall(false, true);
}

export async function notifyIfUpdateAvailable(
  getMainWindow: () => BrowserWindow | null,
): Promise<void> {
  const result = await checkForAppUpdates();
  if (result.ok && result.status === 'available') {
    getMainWindow()?.webContents.send('app:update-available', {
      currentVersion: result.currentVersion,
      latestVersion: result.latestVersion,
      releaseNotes: result.releaseNotes,
    });
  }
}
