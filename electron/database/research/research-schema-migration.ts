import type { PrismaClient } from '@prisma/client';

export const RESEARCH_SCHEMA_VERSION = 2;
const META_KEY_LEGACY_MIGRATED = 'research_legacy_v1_migrated';
const META_KEY_SCHEMA_VERSION = 'research_schema_version';

type ColumnInfo = { name: string };

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function stringifyFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function getColumns(prisma: PrismaClient, table: string): Promise<ColumnInfo[]> {
  return prisma.$queryRawUnsafe<ColumnInfo[]>(`PRAGMA table_info("${table}")`);
}

async function tableExists(prisma: PrismaClient, table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    table,
  );
  return rows.length > 0;
}

async function ensureMetaTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_AppSchemaMeta" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getMeta(prisma: PrismaClient, key: string): Promise<string | null> {
  await ensureMetaTable(prisma);
  const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
    `SELECT "value" FROM "_AppSchemaMeta" WHERE "key" = ?`,
    key,
  );
  return rows[0]?.value ?? null;
}

async function setMeta(prisma: PrismaClient, key: string, value: string): Promise<void> {
  await ensureMetaTable(prisma);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "_AppSchemaMeta" ("key", "value", "updatedAt")
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT("key") DO UPDATE SET "value" = excluded."value", "updatedAt" = CURRENT_TIMESTAMP`,
    key,
    value,
  );
}

function isLegacyExperimentSchema(columns: ColumnInfo[]): boolean {
  if (columns.length === 0) return false;
  if (columns.some((col) => col.name === 'name')) return false;
  return columns.some((col) =>
    ['originalInputs', 'expectedOutput', 'actualOutput', 'masterNo'].includes(col.name),
  );
}

function mapLegacyStatus(status: string | null | undefined): string {
  const normalized = (status ?? 'pending').toLowerCase();
  if (normalized === 'verified') return 'Verified';
  if (normalized === 'failed' || normalized === 'mismatch') return 'Failed';
  if (normalized === 'running') return 'Running';
  return 'Draft';
}

export async function createResearchTablesV2(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Experiment" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "version" TEXT NOT NULL DEFAULT '1.0.0',
      "description" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'Draft',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ExperimentInput" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "experimentId" INTEGER NOT NULL,
      "fieldKey" TEXT NOT NULL,
      "fieldValue" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ExperimentOutput" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "experimentId" INTEGER NOT NULL,
      "source" TEXT NOT NULL,
      "fieldKey" TEXT NOT NULL,
      "fieldValue" TEXT NOT NULL DEFAULT '',
      "memo" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Hypothesis" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "experimentId" INTEGER,
      "sourceField" TEXT,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "confidence" INTEGER NOT NULL DEFAULT 0,
      "verified" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Verification" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "experimentId" INTEGER,
      "hypothesisId" INTEGER,
      "name" TEXT NOT NULL,
      "inputData" TEXT NOT NULL DEFAULT '{}',
      "expectedResult" TEXT NOT NULL,
      "actualResult" TEXT,
      "passed" BOOLEAN,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL,
      FOREIGN KEY ("hypothesisId") REFERENCES "Hypothesis"("id") ON DELETE SET NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Comparison" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "experimentId" INTEGER NOT NULL,
      "fieldKey" TEXT NOT NULL,
      "legacyValue" TEXT NOT NULL,
      "oursValue" TEXT NOT NULL,
      "diffType" TEXT,
      "diffDetail" TEXT,
      "isMatch" BOOLEAN NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Screenshot" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "experimentId" INTEGER NOT NULL,
      "filename" TEXT NOT NULL,
      "filePath" TEXT NOT NULL,
      "caption" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE
    )
  `);
}

async function migrateHypothesisSourceField(prisma: PrismaClient): Promise<void> {
  const columns = await getColumns(prisma, 'Hypothesis');
  if (columns.length === 0) return;
  if (!columns.some((col) => col.name === 'sourceField')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Hypothesis" ADD COLUMN "sourceField" TEXT`);
  }
}

async function migrateLegacyComparisonResult(prisma: PrismaClient): Promise<void> {
  if (!(await tableExists(prisma, 'ComparisonResult'))) return;
  if (!(await tableExists(prisma, 'Comparison'))) {
    await createResearchTablesV2(prisma);
  }

  const existing = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM "Comparison"`,
  );
  if ((existing[0]?.count ?? 0) > 0) return;

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: number;
      experimentId: number;
      fieldPath: string | null;
      fieldKey: string | null;
      legacyValue: string | null;
      originalValue: string | null;
      oursValue: string | null;
      actualValue: string | null;
      diffType: string | null;
      diffDetail: string | null;
      isMatch: number | null;
      createdAt: string;
    }>
  >(`SELECT * FROM "ComparisonResult"`);

  for (const row of rows) {
    const fieldKey = row.fieldKey ?? row.fieldPath ?? 'field';
    const legacyValue = row.legacyValue ?? row.originalValue ?? '';
    const oursValue = row.oursValue ?? row.actualValue ?? '';
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Comparison" ("experimentId", "fieldKey", "legacyValue", "oursValue", "diffType", "diffDetail", "isMatch", "createdAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      row.experimentId,
      fieldKey,
      legacyValue,
      oursValue,
      row.diffType,
      row.diffDetail,
      row.isMatch ? 1 : 0,
      row.createdAt,
    );
  }

  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ComparisonResult"`);
}

async function migrateLegacyTestCase(prisma: PrismaClient): Promise<void> {
  if (!(await tableExists(prisma, 'TestCase'))) return;

  const verificationColumns = await getColumns(prisma, 'Verification');
  if (verificationColumns.length === 0) {
    await createResearchTablesV2(prisma);
  }

  const existing = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM "Verification"`,
  );
  if ((existing[0]?.count ?? 0) > 0) return;

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: number;
      experimentId: number | null;
      name: string | null;
      title: string | null;
      inputData: string | null;
      input: string | null;
      expectedOutput: string | null;
      expectedResult: string | null;
      actualOutput: string | null;
      actualResult: string | null;
      passed: number | null;
      createdAt: string;
      updatedAt: string;
    }>
  >(`SELECT * FROM "TestCase"`);

  for (const row of rows) {
    const name = row.name ?? row.title ?? `TestCase ${row.id}`;
    const inputData = row.inputData ?? row.input ?? '{}';
    const expectedResult = row.expectedResult ?? row.expectedOutput ?? '';
    const actualResult = row.actualResult ?? row.actualOutput ?? null;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Verification" ("experimentId", "name", "inputData", "expectedResult", "actualResult", "passed", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      row.experimentId,
      name,
      inputData,
      expectedResult,
      actualResult,
      row.passed,
      row.createdAt,
      row.updatedAt,
    );
  }

  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "TestCase"`);
}

interface LegacyExperimentRow {
  id: number;
  date: string;
  masterNo: string | null;
  masterValue: string | null;
  originalInputs: string;
  expectedOutput: string;
  actualOutput: string;
  memo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

async function migrateLegacyExperimentBlob(prisma: PrismaClient): Promise<void> {
  if ((await getMeta(prisma, META_KEY_LEGACY_MIGRATED)) === 'true') return;

  const experimentColumns = await getColumns(prisma, 'Experiment');
  if (!isLegacyExperimentSchema(experimentColumns)) {
    await setMeta(prisma, META_KEY_LEGACY_MIGRATED, 'true');
    return;
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE "Experiment" RENAME TO "Experiment_legacy_v1"`);
  await createResearchTablesV2(prisma);

  const legacyRows = await prisma.$queryRawUnsafe<LegacyExperimentRow[]>(
    `SELECT * FROM "Experiment_legacy_v1" ORDER BY "id"`,
  );

  for (const row of legacyRows) {
    const name =
      row.memo?.trim() || (row.masterNo ? `Master ${row.masterNo}` : `Experiment ${row.id}`);
    const description = [row.masterValue, row.memo].filter(Boolean).join(' | ').slice(0, 500);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Experiment" ("id", "name", "date", "version", "description", "status", "createdAt", "updatedAt")
       VALUES (?, ?, ?, '1.0.0', ?, ?, ?, ?)`,
      row.id,
      name,
      row.date,
      description,
      mapLegacyStatus(row.status),
      row.createdAt,
      row.updatedAt,
    );

    const inputs = parseJsonObject(row.originalInputs);
    if (row.masterNo) inputs.masterNo = row.masterNo;
    if (row.masterValue) inputs.masterValue = row.masterValue;

    for (const [fieldKey, fieldValue] of Object.entries(inputs)) {
      const value = stringifyFieldValue(fieldValue);
      if (!value) continue;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "ExperimentInput" ("experimentId", "fieldKey", "fieldValue", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?)`,
        row.id,
        fieldKey,
        value,
        row.createdAt,
        row.updatedAt,
      );
    }

    const legacyOutputs = parseJsonObject(row.expectedOutput);
    for (const [fieldKey, fieldValue] of Object.entries(legacyOutputs)) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "ExperimentOutput" ("experimentId", "source", "fieldKey", "fieldValue", "createdAt", "updatedAt")
         VALUES (?, 'legacy', ?, ?, ?, ?)`,
        row.id,
        fieldKey,
        stringifyFieldValue(fieldValue),
        row.createdAt,
        row.updatedAt,
      );
    }

    const oursOutputs = parseJsonObject(row.actualOutput);
    for (const [fieldKey, fieldValue] of Object.entries(oursOutputs)) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "ExperimentOutput" ("experimentId", "source", "fieldKey", "fieldValue", "createdAt", "updatedAt")
         VALUES (?, 'ours', ?, ?, ?, ?)`,
        row.id,
        fieldKey,
        stringifyFieldValue(fieldValue),
        row.createdAt,
        row.updatedAt,
      );
    }
  }

  await migrateLegacyComparisonResult(prisma);
  await migrateLegacyTestCase(prisma);
  await setMeta(prisma, META_KEY_LEGACY_MIGRATED, 'true');
}

/** Incremental Research schema migration — no drop/recreate of v2 tables. */
export async function migrateResearchSchema(prisma: PrismaClient): Promise<void> {
  await ensureMetaTable(prisma);
  await migrateLegacyExperimentBlob(prisma);
  await createResearchTablesV2(prisma);
  await migrateHypothesisSourceField(prisma);
  await migrateLegacyComparisonResult(prisma);
  await migrateLegacyTestCase(prisma);
  await setMeta(prisma, META_KEY_SCHEMA_VERSION, String(RESEARCH_SCHEMA_VERSION));
}
