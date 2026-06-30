import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ipc } from './helpers/test-database';

async function seedLegacyV1ResearchDb(dbPath: string): Promise<void> {
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });
  await prisma.$connect();

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "Experiment" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "masterNo" TEXT,
      "masterValue" TEXT,
      "originalInputs" TEXT NOT NULL DEFAULT '{}',
      "expectedOutput" TEXT NOT NULL DEFAULT '{}',
      "actualOutput" TEXT NOT NULL DEFAULT '{}',
      "memo" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "ComparisonResult" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "experimentId" INTEGER NOT NULL,
      "fieldKey" TEXT NOT NULL,
      "legacyValue" TEXT NOT NULL,
      "oursValue" TEXT NOT NULL,
      "diffType" TEXT,
      "diffDetail" TEXT,
      "isMatch" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "TestCase" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "experimentId" INTEGER,
      "name" TEXT NOT NULL,
      "inputData" TEXT NOT NULL DEFAULT '{}',
      "expectedResult" TEXT NOT NULL,
      "actualResult" TEXT,
      "passed" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Experiment" ("id", "masterNo", "masterValue", "originalInputs", "expectedOutput", "actualOutput", "memo", "status")
     VALUES (1, '42', '1234567890', ?, ?, ?, 'Legacy memo', 'verified')`,
    JSON.stringify({ bidAmount: '1000' }),
    JSON.stringify({ result: 'legacy-out' }),
    JSON.stringify({ result: 'ours-out' }),
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ComparisonResult" ("experimentId", "fieldKey", "legacyValue", "oursValue", "isMatch")
     VALUES (1, 'result', 'legacy-out', 'ours-out', 0)`,
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "TestCase" ("experimentId", "name", "inputData", "expectedResult", "actualResult", "passed")
     VALUES (1, 'Smoke test', ?, 'pass', 'pass', 1)`,
    JSON.stringify({ masterNo: '42' }),
  );

  await prisma.$disconnect();
}

describe('Research schema migration', () => {
  let tmpDir = '';
  let dbPath = '';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csebid-research-migration-'));
    dbPath = path.join(tmpDir, 'legacy.db');
  });

  afterEach(async () => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('migrates legacy v1 Experiment blob to normalized v2 tables without data loss', async () => {
    await seedLegacyV1ResearchDb(dbPath);

    const { DatabaseService } = await import('../../electron/database/database-service');
    const service = new DatabaseService();
    await service.initializeAtPath(dbPath, { seed: false });

    const experiment = await ipc.researchGetExperiment(service, 1);
    expect(experiment).not.toBeNull();
    expect(experiment?.name).toBe('Legacy memo');
    expect(experiment?.status).toBe('Verified');

    const inputKeys = experiment?.inputs.map((row) => row.fieldKey).sort();
    expect(inputKeys).toEqual(['bidAmount', 'masterNo', 'masterValue']);

    const legacyOutput = experiment?.outputs.find(
      (row) => row.source === 'legacy' && row.fieldKey === 'result',
    );
    const oursOutput = experiment?.outputs.find(
      (row) => row.source === 'ours' && row.fieldKey === 'result',
    );
    expect(legacyOutput?.fieldValue).toBe('legacy-out');
    expect(oursOutput?.fieldValue).toBe('ours-out');

    expect(experiment?.comparisons).toHaveLength(1);
    expect(experiment?.comparisons[0]?.fieldKey).toBe('result');
    expect(experiment?.comparisons[0]?.isMatch).toBe(false);

    expect(experiment?.verifications).toHaveLength(1);
    expect(experiment?.verifications[0]?.name).toBe('Smoke test');
    expect(experiment?.verifications[0]?.passed).toBe(true);

    await service.disconnect();
  });

  it('preserves v2 experiments across re-initialization (no drop/recreate)', async () => {
    const { DatabaseService } = await import('../../electron/database/database-service');
    const service = new DatabaseService();
    await service.initializeAtPath(dbPath, { seed: false });

    const saved = await ipc.researchSaveExperiment(service, {
      name: 'Persist me',
      description: 'phase 5-3',
      status: 'Draft',
    });
    expect(saved.success).toBe(true);
    if (!saved.success) return;
    const id = saved.data.id;

    await service.disconnect();

    const service2 = new DatabaseService();
    await service2.initializeAtPath(dbPath, { seed: false });

    const experiment = await ipc.researchGetExperiment(service2, id);
    expect(experiment?.name).toBe('Persist me');
    expect(experiment?.description).toBe('phase 5-3');

    await service2.disconnect();
  });
});
