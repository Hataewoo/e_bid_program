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

export type AppUpdateDownloadResult = { ok: true } | { ok: false; message: string };

export interface AppUpdateProgress {
  percent: number;
}

export interface AppUpdateAvailableNotice {
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
}
