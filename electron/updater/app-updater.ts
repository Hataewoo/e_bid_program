import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, type BrowserWindow } from 'electron';
import type { AppUpdater } from 'electron-updater';
import { fileLogger } from '../logger/file-logger';

/**
 * Packaged Electron main runs as ESM; electron-updater is CommonJS.
 * Named ESM imports fail at runtime — load via createRequire instead.
 */
const require = createRequire(import.meta.url);
const autoUpdater = (require('electron-updater') as { autoUpdater: AppUpdater }).autoUpdater;

const __updaterDir = path.dirname(fileURLToPath(import.meta.url));

const GITHUB_UPDATE = {
  provider: 'github' as const,
  owner: 'Hataewoo',
  repo: 'e_bid_program',
};

function readPackageVersion(): string {
  try {
    const pkgPath = path.join(__updaterDir, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? app.getVersion();
  } catch {
    return app.getVersion();
  }
}

function configureUpdateFeed(): void {
  autoUpdater.setFeedURL(GITHUB_UPDATE);
  fileLogger.info('Update feed configured', GITHUB_UPDATE);
}

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

  configureUpdateFeed();
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
  fileLogger.info('Startup update check', {
    current: readPackageVersion(),
    result: result.ok ? result.status : result.status,
  });
  if (result.ok && result.status === 'available') {
    getMainWindow()?.webContents.send('app:update-available', {
      currentVersion: result.currentVersion,
      latestVersion: result.latestVersion,
      releaseNotes: result.releaseNotes,
    });
  }
}

export function scheduleStartupUpdateCheck(getMainWindow: () => BrowserWindow | null): void {
  if (!isUpdaterEnabled()) return;

  const run = () => {
    void notifyIfUpdateAvailable(getMainWindow);
  };

  const win = getMainWindow();
  if (!win) {
    setTimeout(run, 5_000);
    return;
  }

  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(run, 3_000);
    });
    return;
  }

  setTimeout(run, 3_000);
}
