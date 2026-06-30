import type { Verification, VerificationSaveInput } from '@/types/electron';

/** TEST-CATALOG source codes (§1.2) */
export type CatalogSource =
  'SRC-BUILTIN' | 'SRC-SAMPLE' | 'SRC-LEGACY' | 'SRC-EXPERIMENT' | 'SRC-MANUAL';

export type DuplicatePolicy = 'skip' | 'update' | 'error';

export interface CatalogMeta {
  catalogId?: string;
  category?: string;
  source?: CatalogSource;
  version?: string;
  legacyEvidence?: string;
  observationId?: string;
}

export interface CatalogVerificationCase {
  catalogId?: string;
  name: string;
  version?: string;
  source?: CatalogSource;
  category?: string;
  inputData: string;
  expectedResult: string;
  experimentId?: number | null;
  legacyEvidence?: string;
  observationId?: string;
}

export interface VerificationImportBundle {
  formatVersion: string;
  catalogVersion?: string;
  exportedAt?: string;
  source?: CatalogSource;
  cases: CatalogVerificationCase[];
}

export interface VerificationImportPlan {
  toCreate: CatalogVerificationCase[];
  toUpdate: Array<{
    existingId: number;
    existing: Verification;
    incoming: CatalogVerificationCase;
  }>;
  skipped: CatalogVerificationCase[];
  errors: string[];
}

export interface VerificationImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const CATALOG_ID_PATTERN = /TC-[A-Z0-9]+-\d{3,}/i;
const FORMAT_VERSION = '1.0';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i] ?? '';
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === ',' || ch === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

export function extractCatalogId(name: string, catalogId?: string): string | null {
  if (catalogId?.trim()) return catalogId.trim().toUpperCase();
  const match = name.match(CATALOG_ID_PATTERN);
  return match ? match[0]!.toUpperCase() : null;
}

export function dedupeKeyForCase(testCase: CatalogVerificationCase): string {
  const id = extractCatalogId(testCase.name, testCase.catalogId);
  if (id) return `id:${id}`;
  return `name:${testCase.name.trim().toLowerCase()}`;
}

export function dedupeKeyForVerification(row: Verification): string {
  try {
    const input = JSON.parse(row.inputData) as { _catalog?: CatalogMeta };
    const catalogId = input._catalog?.catalogId ?? extractCatalogId(row.name);
    if (catalogId) return `id:${catalogId.toUpperCase()}`;
  } catch {
    const fromName = extractCatalogId(row.name);
    if (fromName) return `id:${fromName}`;
  }
  return `name:${row.name.trim().toLowerCase()}`;
}

function catalogMetaFromCase(testCase: CatalogVerificationCase): CatalogMeta | undefined {
  const meta: CatalogMeta = {};
  const catalogId = extractCatalogId(testCase.name, testCase.catalogId);
  if (catalogId) meta.catalogId = catalogId;
  if (testCase.category?.trim()) meta.category = testCase.category.trim();
  if (testCase.source) meta.source = testCase.source;
  if (testCase.version?.trim()) meta.version = testCase.version.trim();
  if (testCase.legacyEvidence?.trim()) meta.legacyEvidence = testCase.legacyEvidence.trim();
  if (testCase.observationId?.trim()) meta.observationId = testCase.observationId.trim();
  return Object.keys(meta).length > 0 ? meta : undefined;
}

export function buildCatalogInputData(
  masterNo: string,
  masterValue: string,
  meta?: CatalogMeta,
): string {
  const num = parseInt(masterNo.trim(), 10);
  const normalizedNo =
    Number.isNaN(num) || num < 0 || num > 99 ? '00' : String(num).padStart(2, '0');
  const payload: Record<string, unknown> = {
    masterNo: normalizedNo,
    masterValue,
  };
  if (meta && Object.keys(meta).length > 0) {
    payload._catalog = meta;
  }
  return JSON.stringify(payload);
}

export function readCatalogMeta(inputData: string): CatalogMeta | null {
  try {
    const parsed = JSON.parse(inputData) as { _catalog?: CatalogMeta };
    return parsed._catalog ?? null;
  } catch {
    return null;
  }
}

function buildExpectedFromFieldColumns(row: Record<string, string>): string | null {
  const fields = ['step2', 'step3', 'statistics', 'prediction', 'memo'] as const;
  const expected: Record<string, string> = {};
  for (const field of fields) {
    const value = row[field]?.trim();
    if (value) expected[field] = value;
  }
  return Object.keys(expected).length > 0 ? JSON.stringify(expected) : null;
}

function normalizeExpectedResult(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('expectedResult가 필요합니다.');
  return trimmed;
}

function normalizeInputData(raw: string | Record<string, unknown>, meta?: CatalogMeta): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return buildCatalogInputData('00', '', meta);
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      return normalizeInputData(parsed, meta);
    } catch {
      return buildCatalogInputData('00', trimmed, meta);
    }
  }

  const masterNo = String(raw.masterNo ?? raw.master ?? '00');
  const masterValue = String(raw.masterValue ?? raw.value ?? '');
  const existingMeta = (raw._catalog as CatalogMeta | undefined) ?? meta;
  return buildCatalogInputData(masterNo, masterValue, existingMeta);
}

export function normalizeCatalogCase(raw: unknown, index: number): CatalogVerificationCase {
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? '').trim();
  if (!name) {
    throw new Error(`${index + 1}번 항목: name이 필요합니다.`);
  }

  const meta: CatalogMeta = {
    catalogId: row.catalogId ? String(row.catalogId) : undefined,
    category: row.category ? String(row.category) : undefined,
    source: row.source as CatalogSource | undefined,
    version: row.version ? String(row.version) : undefined,
    legacyEvidence: row.legacyEvidence ? String(row.legacyEvidence) : undefined,
    observationId: row.observationId ? String(row.observationId) : undefined,
  };

  const expectedRaw = row.expectedResult ?? row.expected;
  if (expectedRaw == null || (typeof expectedRaw === 'string' && !expectedRaw.trim())) {
    throw new Error(`${index + 1}번 항목 (${name}): expectedResult가 필요합니다.`);
  }
  const expectedString =
    typeof expectedRaw === 'object' ? JSON.stringify(expectedRaw) : String(expectedRaw);

  let inputData: string;
  if (row.masterNo !== undefined || row.masterValue !== undefined) {
    inputData = buildCatalogInputData(
      String(row.masterNo ?? '00'),
      String(row.masterValue ?? ''),
      catalogMetaFromCase({
        name,
        ...meta,
        inputData: '',
        expectedResult: '',
      }),
    );
  } else if (row.input !== undefined && typeof row.input === 'object') {
    const inputObj = row.input as Record<string, unknown>;
    inputData = buildCatalogInputData(
      String(inputObj.masterNo ?? inputObj.master ?? '00'),
      String(inputObj.masterValue ?? inputObj.value ?? ''),
      catalogMetaFromCase({ name, ...meta, inputData: '', expectedResult: '' }),
    );
  } else if (row.inputData !== undefined) {
    inputData = normalizeInputData(
      row.inputData as string | Record<string, unknown>,
      catalogMetaFromCase({ name, ...meta, inputData: '', expectedResult: '' }),
    );
  } else {
    throw new Error(
      `${index + 1}번 항목 (${name}): inputData 또는 masterNo/masterValue가 필요합니다.`,
    );
  }

  const experimentId =
    row.experimentId === null || row.experimentId === undefined ? null : Number(row.experimentId);

  return {
    catalogId: meta.catalogId,
    name,
    version: meta.version,
    source: meta.source,
    category: meta.category,
    inputData,
    expectedResult: normalizeExpectedResult(expectedString),
    experimentId: Number.isNaN(experimentId!) ? null : experimentId,
    legacyEvidence: meta.legacyEvidence,
    observationId: meta.observationId,
  };
}

export function parseVerificationImportJson(raw: string): CatalogVerificationCase[] {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return parsed.map((item, index) => normalizeCatalogCase(item, index));
  }

  const bundle = parsed as Partial<VerificationImportBundle>;
  if (Array.isArray(bundle.cases)) {
    return bundle.cases.map((item, index) => normalizeCatalogCase(item, index));
  }

  throw new Error('JSON 배열 또는 { cases: [...] } 형식이 필요합니다.');
}

export function parseVerificationImportCsv(raw: string): CatalogVerificationCase[] {
  const lines = raw.split(/\r?\n/).filter((line) => {
    const t = line.trim();
    return t.length > 0 && !t.startsWith('#');
  });

  if (lines.length === 0) {
    throw new Error('CSV 내용이 비어 있습니다.');
  }

  const header = parseCsvLine(lines[0]!.toLowerCase());
  const col = (names: string[]) =>
    names.map((n) => header.indexOf(n.toLowerCase())).find((i) => i >= 0) ?? -1;

  const idx = {
    catalogId: col(['catalogid', 'tc_id', 'id']),
    name: col(['name']),
    version: col(['version', 'catalogversion']),
    source: col(['source']),
    category: col(['category', 'cat']),
    masterNo: col(['masterno', 'master_no', 'no']),
    masterValue: col(['mastervalue', 'master_value', 'value']),
    inputData: col(['inputdata', 'input']),
    expectedResult: col(['expectedresult', 'expected']),
    step2: col(['step2']),
    step3: col(['step3']),
    statistics: col(['statistics', 'stat']),
    prediction: col(['prediction', 'pred']),
    memo: col(['memo']),
    experimentId: col(['experimentid', 'experiment_id']),
    legacyEvidence: col(['legacyevidence', 'evidence']),
    observationId: col(['observationid', 'obs_id', 'obs']),
  };

  if (idx.name < 0 && idx.catalogId < 0) {
    throw new Error('CSV 헤더에 name 또는 catalogId가 필요합니다.');
  }

  const cases: CatalogVerificationCase[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]!);
    const pick = (index: number) => (index >= 0 ? (cols[index] ?? '').trim() : '');

    const catalogId = pick(idx.catalogId);
    const name = pick(idx.name) || (catalogId ? `${catalogId} Legacy import` : `Import row ${i}`);

    const fieldRow: Record<string, string> = {
      step2: pick(idx.step2),
      step3: pick(idx.step3),
      statistics: pick(idx.statistics),
      prediction: pick(idx.prediction),
      memo: pick(idx.memo),
    };

    let expectedResult = pick(idx.expectedResult);
    if (!expectedResult) {
      const hasStep2Col = idx.step2 >= 0;
      const hasStep3Col = idx.step3 >= 0;
      if (hasStep2Col && hasStep3Col) {
        expectedResult = JSON.stringify({
          step2: pick(idx.step2),
          step3: pick(idx.step3),
        });
      } else {
        const built = buildExpectedFromFieldColumns(fieldRow);
        if (!built) {
          throw new Error(
            `${i + 1}행: expectedResult 또는 step2/step3/statistics 컬럼이 필요합니다.`,
          );
        }
        expectedResult = built;
      }
    }

    const rawCase: Record<string, unknown> = {
      catalogId: catalogId || undefined,
      name,
      version: pick(idx.version) || undefined,
      source: pick(idx.source) || undefined,
      category: pick(idx.category) || undefined,
      legacyEvidence: pick(idx.legacyEvidence) || undefined,
      observationId: pick(idx.observationId) || undefined,
      expectedResult,
      experimentId: pick(idx.experimentId) ? Number(pick(idx.experimentId)) : null,
    };

    const inputJson = pick(idx.inputData);
    if (inputJson) {
      rawCase.inputData = inputJson;
    } else {
      rawCase.masterNo = pick(idx.masterNo) || '00';
      rawCase.masterValue = pick(idx.masterValue);
      if (!rawCase.masterValue) {
        throw new Error(`${i + 1}행: masterValue 또는 inputData가 필요합니다.`);
      }
    }

    cases.push(normalizeCatalogCase(rawCase, i - 1));
  }

  return cases;
}

export function parseVerificationImportFile(
  content: string,
  fileName: string,
): CatalogVerificationCase[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) {
    return parseVerificationImportCsv(content);
  }
  if (lower.endsWith('.json')) {
    return parseVerificationImportJson(content);
  }
  throw new Error('.json 또는 .csv 파일만 지원합니다.');
}

export function planVerificationImport(
  existing: Verification[],
  incoming: CatalogVerificationCase[],
  policy: DuplicatePolicy,
): VerificationImportPlan {
  const index = new Map<string, Verification>();
  for (const row of existing) {
    index.set(dedupeKeyForVerification(row), row);
  }

  const plan: VerificationImportPlan = {
    toCreate: [],
    toUpdate: [],
    skipped: [],
    errors: [],
  };

  const pendingKeys = new Set<string>();

  for (const testCase of incoming) {
    const key = dedupeKeyForCase(testCase);
    if (pendingKeys.has(key)) {
      plan.errors.push(
        `파일 내 중복: ${extractCatalogId(testCase.name, testCase.catalogId) ?? testCase.name}`,
      );
      continue;
    }
    pendingKeys.add(key);

    const match = index.get(key);

    if (!match) {
      plan.toCreate.push(testCase);
      continue;
    }

    if (policy === 'skip') {
      plan.skipped.push(testCase);
      continue;
    }

    if (policy === 'error') {
      plan.errors.push(
        `중복: ${extractCatalogId(testCase.name, testCase.catalogId) ?? testCase.name}`,
      );
      continue;
    }

    plan.toUpdate.push({ existingId: match.id, existing: match, incoming: testCase });
  }

  return plan;
}

export function catalogCaseToSaveInput(
  testCase: CatalogVerificationCase,
  id?: number,
): VerificationSaveInput {
  return {
    id,
    name: testCase.name,
    inputData: testCase.inputData,
    expectedResult: testCase.expectedResult,
    experimentId: testCase.experimentId ?? null,
    actualResult: null,
  };
}

export async function applyVerificationImportPlan(
  plan: VerificationImportPlan,
  saveFn: (input: VerificationSaveInput, options?: { skipReload?: boolean }) => Promise<void>,
): Promise<VerificationImportResult> {
  if (plan.errors.length > 0) {
    return { created: 0, updated: 0, skipped: plan.skipped.length, errors: plan.errors };
  }

  const ops = [
    ...plan.toUpdate.map((row) => catalogCaseToSaveInput(row.incoming, row.existingId)),
    ...plan.toCreate.map((row) => catalogCaseToSaveInput(row)),
  ];

  for (let i = 0; i < ops.length; i += 1) {
    await saveFn(ops[i]!, { skipReload: i < ops.length - 1 });
  }

  return {
    created: plan.toCreate.length,
    updated: plan.toUpdate.length,
    skipped: plan.skipped.length,
    errors: [],
  };
}

export function verificationToCatalogCase(row: Verification): CatalogVerificationCase {
  const meta = readCatalogMeta(row.inputData);
  return {
    catalogId: meta?.catalogId ?? extractCatalogId(row.name) ?? undefined,
    name: row.name,
    version: meta?.version,
    source: meta?.source,
    category: meta?.category,
    inputData: row.inputData,
    expectedResult: row.expectedResult,
    experimentId: row.experimentId,
    legacyEvidence: meta?.legacyEvidence,
    observationId: meta?.observationId,
  };
}

export function buildVerificationExportBundle(
  verifications: Verification[],
  catalogVersion?: string,
): VerificationImportBundle {
  return {
    formatVersion: FORMAT_VERSION,
    catalogVersion: catalogVersion ?? new Date().toISOString().slice(0, 10),
    exportedAt: new Date().toISOString(),
    source: 'SRC-LEGACY',
    cases: verifications.map(verificationToCatalogCase),
  };
}

export function catalogBundleToJson(bundle: VerificationImportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function catalogBundleToCsv(bundle: VerificationImportBundle): string {
  const header = [
    'catalogId',
    'name',
    'version',
    'source',
    'category',
    'masterNo',
    'masterValue',
    'expectedResult',
    'experimentId',
    'legacyEvidence',
    'observationId',
  ].join(',');

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines = bundle.cases.map((testCase) => {
    let masterNo = '';
    let masterValue = '';
    try {
      const input = JSON.parse(testCase.inputData) as { masterNo?: string; masterValue?: string };
      masterNo = input.masterNo ?? '';
      masterValue = input.masterValue ?? '';
    } catch {
      masterValue = testCase.inputData;
    }

    return [
      testCase.catalogId ?? '',
      testCase.name,
      testCase.version ?? '',
      testCase.source ?? '',
      testCase.category ?? '',
      masterNo,
      masterValue,
      testCase.expectedResult,
      testCase.experimentId ?? '',
      testCase.legacyEvidence ?? '',
      testCase.observationId ?? '',
    ]
      .map((cell) => escape(String(cell)))
      .join(',');
  });

  return [header, ...lines].join('\n');
}
