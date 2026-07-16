import fs from 'fs';
import path from 'path';

/** userData에 기록 — 마지막으로 설치본 템플릿 DB를 반영한 앱 버전 */
export const TEMPLATE_SYNC_VERSION_FILE = 'template-db-sync-version.txt';

export interface TemplateDbSyncResult {
  copied: boolean;
  synced: boolean;
}

export function readSyncedTemplateVersion(userDataPath: string): string | null {
  const versionFile = path.join(userDataPath, TEMPLATE_SYNC_VERSION_FILE);
  if (!fs.existsSync(versionFile)) return null;
  const value = fs.readFileSync(versionFile, 'utf8').trim();
  return value || null;
}

export function writeSyncedTemplateVersion(userDataPath: string, version: string): void {
  const versionFile = path.join(userDataPath, TEMPLATE_SYNC_VERSION_FILE);
  fs.writeFileSync(versionFile, version, 'utf8');
}

/**
 * 배포 DB 동기화:
 * - 최초 설치: userData/database.db 없으면 템플릿 복사
 * - 앱 업데이트: 앱 버전이 바뀌면 템플릿으로 덮어씀 (Master 19 등 설치본 데이터 반영)
 */
export function ensureProductionDatabaseFromTemplate(options: {
  targetPath: string;
  templatePath: string | null;
  userDataPath: string;
  appVersion: string;
}): TemplateDbSyncResult {
  const { targetPath, templatePath, userDataPath, appVersion } = options;
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (!templatePath || !fs.existsSync(templatePath)) {
    return { copied: false, synced: false };
  }

  const lastSynced = readSyncedTemplateVersion(userDataPath);

  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(templatePath, targetPath);
    writeSyncedTemplateVersion(userDataPath, appVersion);
    return { copied: true, synced: false };
  }

  if (lastSynced !== appVersion) {
    fs.copyFileSync(templatePath, targetPath);
    writeSyncedTemplateVersion(userDataPath, appVersion);
    return { copied: false, synced: true };
  }

  return { copied: false, synced: false };
}
