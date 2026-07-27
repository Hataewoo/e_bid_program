import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { copyProductionDatabaseFromTemplate } from '../../../electron/database/template-db-sync';

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
    const targetPath = path.join(dir, 'userData', 'database.db');
    const templatePath = path.join(dir, 'template.db');
    writeDb(templatePath, 'template-v1');

    const result = copyProductionDatabaseFromTemplate({
      targetPath,
      templatePath,
    });

    expect(result).toEqual({ copied: true });
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('template-v1');
  });

  it('does not overwrite existing database on app update', () => {
    const dir = makeTempDir();
    tempDirs.push(dir);
    const targetPath = path.join(dir, 'userData', 'database.db');
    const templatePath = path.join(dir, 'template.db');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    writeDb(targetPath, 'old-user-db');
    writeDb(templatePath, 'new-template-db');

    const result = copyProductionDatabaseFromTemplate({
      targetPath,
      templatePath,
    });

    expect(result).toEqual({ copied: false });
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('old-user-db');
  });
});
