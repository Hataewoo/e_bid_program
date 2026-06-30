import type { AnalysisResult, SidePatterns } from '@/shared/utils/analysisEngine';
import { logMatchingDetails } from '@/shared/utils/analysisEngine';

const DEBUG_PREFIX = '[AnalysisEngine]';

/** 원본 프로그램 교차 검증용 — digits/runs 제외 경량 스냅샷 */
export interface VerificationSnapshot {
  masterNo: string;
  totalCount: number;
  lowCount: number;
  lowRate: number;
  highCount: number;
  highRate: number;
  digitLength: number;
  lowPatterns: SidePatterns;
  highPatterns: SidePatterns;
}

export interface VerificationDiff {
  path: string;
  expected: string;
  actual: string;
}

export interface SerializeOptions {
  includeDigits?: boolean;
  includeRuns?: boolean;
}

const PATTERN_FIELDS: (keyof SidePatterns)[] = [
  'threeOrMore',
  'fiveOrMore',
  'oneBetween',
  'oneDuplicate',
  'exactTwo',
  'plusAlpha_3_2',
  'plusAlpha_4_3',
  'plusAlpha_4_4',
  'commaAlpha_2_3',
];

export function toVerificationSnapshot(result: AnalysisResult): VerificationSnapshot {
  return {
    masterNo: result.masterNo,
    totalCount: result.totalCount,
    lowCount: result.lowCount,
    lowRate: result.lowRate,
    highCount: result.highCount,
    highRate: result.highRate,
    digitLength: result.digits.length,
    lowPatterns: { ...result.lowPatterns },
    highPatterns: { ...result.highPatterns },
  };
}

export function serializeVerificationSnapshot(snapshot: VerificationSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function serializeAnalysisResult(
  result: AnalysisResult,
  options: SerializeOptions = {},
): string {
  const { includeDigits = true, includeRuns = true } = options;
  const payload: Record<string, unknown> = {
    masterNo: result.masterNo,
    totalCount: result.totalCount,
    lowCount: result.lowCount,
    lowRate: result.lowRate,
    highCount: result.highCount,
    highRate: result.highRate,
    lowPatterns: result.lowPatterns,
    highPatterns: result.highPatterns,
  };

  if (includeDigits) {
    payload.digits = result.digits;
  } else {
    payload.digitLength = result.digits.length;
  }

  if (includeRuns) {
    payload.runs = result.runs;
  }

  return JSON.stringify(payload, null, 2);
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  return String(value);
}

function compareScalar(
  path: string,
  expected: unknown,
  actual: unknown,
  diffs: VerificationDiff[],
): void {
  if (expected === actual) return;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const expStr = expected.join(',');
    const actStr = actual.join(',');
    if (expStr !== actStr) {
      diffs.push({ path, expected: formatValue(expected), actual: formatValue(actual) });
    }
    return;
  }
  diffs.push({ path, expected: formatValue(expected), actual: formatValue(actual) });
}

/** 원본(기대) JSON과 우리 결과 스냅샷을 필드별로 비교 */
export function compareVerificationSnapshots(
  actual: VerificationSnapshot,
  expectedInput: unknown,
): VerificationDiff[] {
  const diffs: VerificationDiff[] = [];
  const expected =
    typeof expectedInput === 'object' && expectedInput !== null
      ? (expectedInput as Record<string, unknown>)
      : {};

  const scalarKeys: (keyof VerificationSnapshot)[] = [
    'masterNo',
    'totalCount',
    'lowCount',
    'lowRate',
    'highCount',
    'highRate',
    'digitLength',
  ];

  for (const key of scalarKeys) {
    if (key in expected) {
      compareScalar(key, expected[key], actual[key], diffs);
    }
  }

  for (const side of ['lowPatterns', 'highPatterns'] as const) {
    const expSide = expected[side];
    const actSide = actual[side];
    if (!expSide || typeof expSide !== 'object') continue;

    for (const field of PATTERN_FIELDS) {
      const expVal = (expSide as SidePatterns)[field];
      if (expVal === undefined) continue;
      compareScalar(`${side}.${field}`, expVal, actSide[field], diffs);
    }
  }

  return diffs;
}

export function parseExpectedVerificationJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed) as unknown;
}

export function logAnalysisResultTable(result: AnalysisResult): void {
  console.group(`${DEBUG_PREFIX} AnalysisResult — Master ${result.masterNo}`);
  console.table([
    {
      masterNo: result.masterNo,
      totalCount: result.totalCount,
      lowCount: result.lowCount,
      lowRate: result.lowRate,
      highCount: result.highCount,
      highRate: result.highRate,
      digitLength: result.digits.length,
    },
  ]);

  const patternRows = PATTERN_FIELDS.map((field) => ({
    field,
    low: result.lowPatterns[field].length,
    lowValues: formatValue(result.lowPatterns[field]),
    high: result.highPatterns[field].length,
    highValues: formatValue(result.highPatterns[field]),
  }));
  console.table(patternRows);

  console.log(`${DEBUG_PREFIX} Verification snapshot:`, toVerificationSnapshot(result));
  console.log(
    `${DEBUG_PREFIX} Full JSON (no digits):`,
    serializeAnalysisResult(result, { includeDigits: false, includeRuns: false }),
  );
  logMatchingDetails(result);
  console.groupEnd();
}

export function logVerificationDiffs(diffs: VerificationDiff[]): void {
  if (diffs.length === 0) {
    console.info(`${DEBUG_PREFIX} ✓ 교차 검증 일치 — diff 0건`);
    return;
  }
  console.group(`${DEBUG_PREFIX} ✗ 교차 검증 불일치 — ${diffs.length}건`);
  console.table(diffs);
  console.groupEnd();
}

export async function copyAnalysisResultToClipboard(
  result: AnalysisResult,
  options?: SerializeOptions,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(serializeAnalysisResult(result, options));
    return true;
  } catch {
    return false;
  }
}

export async function copyVerificationSnapshotToClipboard(
  result: AnalysisResult,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(
      serializeVerificationSnapshot(toVerificationSnapshot(result)),
    );
    return true;
  } catch {
    return false;
  }
}
