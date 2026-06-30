import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { _electron as electron } from 'playwright';
import type { ElectronApplication, Page } from 'playwright';
import { expect } from '@playwright/test';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export interface E2eAppHandle {
  app: ElectronApplication;
  page: Page;
  tmpDir: string;
  close: () => Promise<void>;
}

export async function launchE2eApp(): Promise<E2eAppHandle> {
  const mainJs = path.join(PROJECT_ROOT, 'dist-electron', 'main.js');
  const indexHtml = path.join(PROJECT_ROOT, 'dist', 'index.html');

  if (!fs.existsSync(mainJs) || !fs.existsSync(indexHtml)) {
    throw new Error('E2E requires a production build. Run `npm run build` first.');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csebid-e2e-'));
  const dbPath = path.join(tmpDir, 'e2e.db');
  const userDataDir = path.join(tmpDir, 'user-data');

  const app = await electron.launch({
    args: [mainJs, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      CSEBID_E2E: '1',
      CSEBID_E2E_DB_PATH: dbPath,
    },
    cwd: PROJECT_ROOT,
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  return {
    app,
    page,
    tmpDir,
    close: async () => {
      await app.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

export async function waitForAppReady(page: Page): Promise<void> {
  await page.getByRole('heading', { name: 'CS E-Bid Analyzer' }).waitFor({ timeout: 30_000 });
  await page.getByText(/DB: (연결됨|Connected)/).waitFor({ timeout: 30_000 });
}

export async function waitForIdle(page: Page): Promise<void> {
  await page.locator('[aria-busy="true"]').waitFor({ state: 'detached', timeout: 60_000 });
}

export function fixturePath(name: string): string {
  return path.join(PROJECT_ROOT, 'tests', 'e2e', 'fixtures', name);
}

export async function captureExportJson(page: Page): Promise<{ totalCount: number }> {
  await page.evaluate(() => {
    const host = window as unknown as { __e2eExportJson?: string };
    host.__e2eExportJson = undefined;
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob: Blob) => {
      const url = original(blob);
      if (blob.type === 'application/json') {
        void blob.text().then((text) => {
          host.__e2eExportJson = text;
        });
      }
      return url;
    };
  });

  await page.getByRole('button', { name: 'Export' }).click();

  await expect
    .poll(async () =>
      page.evaluate(() => (window as unknown as { __e2eExportJson?: string }).__e2eExportJson),
    )
    .not.toBeUndefined();

  const json = await page.evaluate(
    () => (window as unknown as { __e2eExportJson?: string }).__e2eExportJson ?? '',
  );
  const parsed = JSON.parse(json) as { totalCount: number };
  return parsed;
}
