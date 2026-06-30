import { afterEach, beforeEach, describe, expect as vitestExpect, it } from 'vitest';
import { expect } from '@playwright/test';
import {
  captureExportJson,
  fixturePath,
  launchE2eApp,
  waitForAppReady,
  waitForIdle,
  type E2eAppHandle,
} from './helpers/electron-app';

describe('E2E smoke (Playwright + Electron)', () => {
  let handle: E2eAppHandle;

  beforeEach(async () => {
    handle = await launchE2eApp();
    await waitForAppReady(handle.page);
  });

  afterEach(async () => {
    await handle.close();
  });

  it('launches Electron app with connected database', async () => {
    const { page } = handle;

    await expect(page.getByRole('heading', { name: 'CS E-Bid Analyzer' })).toBeVisible();
    await expect(page.getByText(/DB: (연결됨|Connected)/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /데이터 일괄 가져오기|Bulk Import/ }),
    ).toBeVisible();
  });

  it('bulk import applies master CSV to the database', async () => {
    const { page } = handle;
    const dbLine = page.getByText(/DB: (연결됨|Connected) \(\d+\)/);
    const beforeCount = await dbLine.textContent();

    await page.getByRole('button', { name: /데이터 일괄 가져오기|Bulk Import/ }).click();
    await expect(page.getByText('데이터 일괄 가져오기 (Master 00~99)')).toBeVisible();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '파일 선택' }).click(),
    ]);
    await fileChooser.setFiles(fixturePath('e2e-masters.csv'));

    await expect(page.getByText(/파싱 완료/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'DB에 적용' }).click();
    await waitForIdle(page);

    await expect(page.getByText('데이터 일괄 가져오기 (Master 00~99)')).toBeHidden({
      timeout: 30_000,
    });
    await expect(dbLine).not.toHaveText(beforeCount ?? '', { timeout: 15_000 });
  });

  it('analysis load and analyze produces digit count', async () => {
    const { page } = handle;

    await page.getByRole('link', { name: 'Analysis' }).click();
    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.getByText(/Master \d+건 로드됨/)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Analyze' }).click();
    await waitForIdle(page);

    await expect(page.getByText(/분석 완료/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/자릿수: \d+/)).toBeVisible();
  });

  it('analysis export downloads JSON result file', async () => {
    const { page } = handle;

    await page.getByRole('link', { name: 'Analysis' }).click();
    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.getByText(/Master \d+건 로드됨/)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Analyze' }).click();
    await waitForIdle(page);
    await expect(page.getByText(/자릿수: \d+/)).toBeVisible({ timeout: 30_000 });

    const exported = await captureExportJson(page);
    vitestExpect(exported.totalCount).toBeGreaterThan(0);
  });

  it('settings health check passes with seeded data', async () => {
    const { page } = handle;

    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: /헬스체크 실행|Run Health Check/ }).click();
    await waitForIdle(page);

    await expect(page.getByText(/헬스체크 통과|Health check passed/)).toBeVisible({
      timeout: 60_000,
    });
  });
});
