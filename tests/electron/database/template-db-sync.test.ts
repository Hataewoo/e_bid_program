import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ensureProductionDatabaseFromTemplate,
  readSyncedTemplateVersion,
  TEMPLATE_SYNC_VERSION_FILE,
  writeSyncedTemplateVersion,
} from '../../../electron/database/template-db-sync';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'template-db-sync-'));
}

function writeDb(filePath: string, marker: string): void {
  fs.writeFileSync(filePath, marker, 'utf8');
}

describe('template-db-sync', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('copies template on first install', () => {
    const dir = makeTempDir();
    tempDirs.push(dir);
    const userDataPath = path.join(dir, 'userData');
    const targetPath = path.join(userDataPath, 'database.db');
    const templatePath = path.join(dir, 'template.db');
    writeDb(templatePath, 'template-v1');

    const result = ensureProductionDatabaseFromTemplate({
      targetPath,
      templatePath,
      userDataPath,
      appVersion: '1.0.7',
    });

    expect(result).toEqual({ copied: true, synced: false });
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('template-v1');
    expect(readSyncedTemplateVersion(userDataPath)).toBe('1.0.7');
  });

  it('overwrites existing database when app version changes', () => {
    const dir = makeTempDir();
    tempDirs.push(dir);
    const userDataPath = path.join(dir, 'userData');
    fs.mkdirSync(userDataPath, { recursive: true });
    const targetPath = path.join(userDataPath, 'database.db');
    const templatePath = path.join(dir, 'template.db');
    writeDb(targetPath, 'old-user-db');
    writeDb(templatePath, 'new-template-db');
    writeSyncedTemplateVersion(userDataPath, '1.0.6');

    const result = ensureProductionDatabaseFromTemplate({
      targetPath,
      templatePath,
      userDataPath,
      appVersion: '1.0.7',
    });

    expect(result).toEqual({ copied: false, synced: true });
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('new-template-db');
    expect(readSyncedTemplateVersion(userDataPath)).toBe('1.0.7');
  });

  it('skips overwrite when app version is unchanged', () => {
    const dir = makeTempDir();
    tempDirs.push(dir);
    const userDataPath = path.join(dir, 'userData');
    fs.mkdirSync(userDataPath, { recursive: true });
    const targetPath = path.join(userDataPath, 'database.db');
    const templatePath = path.join(dir, 'template.db');
    writeDb(targetPath, 'user-db');
    writeDb(templatePath, 'template-db');
    writeSyncedTemplateVersion(userDataPath, '1.0.7');

    const result = ensureProductionDatabaseFromTemplate({
      targetPath,
      templatePath,
      userDataPath,
      appVersion: '1.0.7',
    });

    expect(result).toEqual({ copied: false, synced: false });
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('user-db');
    expect(fs.existsSync(path.join(userDataPath, TEMPLATE_SYNC_VERSION_FILE))).toBe(true);
  });
});
