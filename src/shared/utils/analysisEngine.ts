/**
 * Master Value 순수 분석 엔진 (Phase 3 — Reverse Engineering)
 * UI/DB와 무관한 Pure Functions
 */

export type DigitClass = 'low' | 'high';

export interface ClassRun {
  cls: DigitClass;
  length: number;
  startIndex: number;
  endIndex: number;
}

export interface SidePatterns {
  /** '3 이상' — 연속 길이 ≥ 3 인 primary run 길이 목록 */
  threeOrMore: number[];
  /** '5 이상' — 연속 길이 ≥ 5 인 primary run 길이 목록 */
  fiveOrMore: number[];
  /** '1 사이' — primary 사이에 opposite 1개만 끼인 위치(인덱스) */
  oneBetween: number[];
  /** '1 중복' — primary 연속 길이 = 1 */
  oneDuplicate: number[];
  /** '2' — primary 연속 길이 = 2 */
  exactTwo: number[];
  /** '3+α, 2' 등 — primary run 시작 인덱스 */
  plusAlpha_3_2: number[];
  plusAlpha_4_3: number[];
  plusAlpha_4_4: number[];
  /** '2,3+α' 등 — primary run 시작 인덱스 */
  commaAlpha_2_3: number[];
}

export interface AnalysisResult {
  masterNo: string;
  totalCount: number;
  lowCount: number;
  lowRate: number;
  highCount: number;
  highRate: number;
  lowPatterns: SidePatterns;
  highPatterns: SidePatterns;
  /** 내부 검증용 — L/H 클래스 run 시퀀스 */
  runs: ClassRun[];
  /** 정규화된 숫자 문자열 */
  digits: string;
}

export interface CompositePlusRule {
  label: string;
  primaryMin: number;
  oppositeExact: number;
  /** SidePatterns 필드 키 */
  field: keyof Pick<SidePatterns, 'plusAlpha_3_2' | 'plusAlpha_4_3' | 'plusAlpha_4_4'>;
}

export interface CompositeCommaRule {
  label: string;
  primaryExact: number;
  oppositeMin: number;
  field: keyof Pick<SidePatterns, 'commaAlpha_2_3'>;
}

/**
 * 원본 프로그램 교차 검증 시 미세 조정(Fine-tuning) 상수.
 * 통계 불일치가 나면 아래 값만 변경 후 Debug Console으로 재비교하세요.
 *
 * | UI 라벨 (Low) | field            | 조정 상수                    |
 * |---------------|------------------|------------------------------|
 * | 3 이상        | threeOrMore      | THREE_OR_MORE_MIN            |
 * | 5 이상        | fiveOrMore       | FIVE_OR_MORE_MIN             |
 * | 1 중복        | oneDuplicate     | ONE_DUPLICATE_LENGTH         |
 * | 2             | exactTwo         | EXACT_TWO_LENGTH             |
 * | 1 사이        | oneBetween       | ONE_BETWEEN_OPPOSITE_LENGTH  |
 * | 3+α, 2 등     | plusAlpha_*      | COMPOSITE_PLUS_RULES         |
 * | 2,3+α         | commaAlpha_2_3   | COMPOSITE_COMMA_RULES        |
 */
export const MATCH_RULES = {
  /** '3 이상' — primary 연속 길이 하한 (슬라이딩 run 스캔) */
  THREE_OR_MORE_MIN: 3,
  /** '5 이상' / High '9 이상' — primary 연속 길이 하한 */
  FIVE_OR_MORE_MIN: 5,
  /** '1 중복' / High '5 중복' — primary 연속 길이 정확히 일치 */
  ONE_DUPLICATE_LENGTH: 1,
  /** '2' / High '6' — primary 연속 길이 정확히 일치 */
  EXACT_TWO_LENGTH: 2,
  /** '1 사이' — primary 사이 opposite run 허용 길이 */
  ONE_BETWEEN_OPPOSITE_LENGTH: 1,
} as const;

export const COMPOSITE_PLUS_RULES: readonly CompositePlusRule[] = [
  {
    label: '3+α, 2',
    primaryMin: MATCH_RULES.THREE_OR_MORE_MIN,
    oppositeExact: MATCH_RULES.EXACT_TWO_LENGTH,
    field: 'plusAlpha_3_2',
  },
  {
    label: '4+α, 3',
    primaryMin: 4,
    oppositeExact: MATCH_RULES.THREE_OR_MORE_MIN,
    field: 'plusAlpha_4_3',
  },
  { label: '4+α, 4', primaryMin: 4, oppositeExact: 4, field: 'plusAlpha_4_4' },
] as const;

export const COMPOSITE_COMMA_RULES: readonly CompositeCommaRule[] = [
  {
    label: '2,3+α',
    primaryExact: MATCH_RULES.EXACT_TWO_LENGTH,
    oppositeMin: MATCH_RULES.THREE_OR_MORE_MIN,
    field: 'commaAlpha_2_3',
  },
] as const;

const EMPTY_SIDE_PATTERNS: SidePatterns = {
  threeOrMore: [],
  fiveOrMore: [],
  oneBetween: [],
  oneDuplicate: [],
  exactTwo: [],
  plusAlpha_3_2: [],
  plusAlpha_4_3: [],
  plusAlpha_4_4: [],
  commaAlpha_2_3: [],
};

/** I/O — 숫자만 추출 */
export function extractDigits(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

/** 0~4 Low, 5~9 High */
export function classifyDigit(digit: number): DigitClass | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  return digit <= 4 ? 'low' : 'high';
}

export function classifyChar(ch: string): DigitClass | null {
  if (!ch || ch.length !== 1) return null;
  return classifyDigit(ch.charCodeAt(0) - 48);
}

export function toClassSequence(digits: string): DigitClass[] {
  const classes: DigitClass[] = [];
  for (let i = 0; i < digits.length; i += 1) {
    const cls = classifyChar(digits[i] ?? '');
    if (cls) classes.push(cls);
  }
  return classes;
}

/** 소수점 첫째 자리 비율 (50.4%) */
export function calcRate(part: number, total: number): number {
  if (total <= 0 || !Number.isFinite(part) || !Number.isFinite(total)) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function splitLowHighCounts(digits: string): { lowCount: number; highCount: number } {
  let lowCount = 0;
  let highCount = 0;
  for (let i = 0; i < digits.length; i += 1) {
    const cls = classifyChar(digits[i] ?? '');
    if (cls === 'low') lowCount += 1;
    else if (cls === 'high') highCount += 1;
  }
  return { lowCount, highCount };
}

/** 경계 안전 run 빌드 */
export function buildRuns(classes: DigitClass[]): ClassRun[] {
  if (classes.length === 0) return [];

  const runs: ClassRun[] = [];
  let i = 0;

  while (i < classes.length) {
    const cls = classes[i];
    if (!cls) {
      i += 1;
      continue;
    }

    const startIndex = i;
    let length = 0;

    while (i < classes.length && classes[i] === cls) {
      length += 1;
      i += 1;
    }

    runs.push({ cls, length, startIndex, endIndex: startIndex + length });
  }

  return runs;
}

function opposite(cls: DigitClass): DigitClass {
  return cls === 'low' ? 'high' : 'low';
}

function getRunAt(runs: ClassRun[], index: number): ClassRun | null {
  if (!Number.isInteger(index) || index < 0 || index >= runs.length) return null;
  const run = runs[index];
  return run ?? null;
}

/** digit 배열 경계 — undefined/NaN 인덱스 방어 */
export function isRunWithinBounds(run: ClassRun, digitLength: number): boolean {
  if (!Number.isFinite(digitLength) || digitLength < 0) return false;
  if (!Number.isFinite(run.startIndex) || !Number.isFinite(run.endIndex)) return false;
  if (!Number.isFinite(run.length) || run.length <= 0) return false;
  if (run.startIndex < 0 || run.endIndex < 0) return false;
  if (run.startIndex >= digitLength || run.endIndex > digitLength) return false;
  if (run.endIndex - run.startIndex !== run.length) return false;
  return true;
}

function filterValidRuns(runs: ClassRun[], digitLength: number): ClassRun[] {
  return runs.filter((run) => isRunWithinBounds(run, digitLength));
}

/**
 * 'n+α, m' — primary 연속 ≥ n 직후, opposite 연속 정확히 m.
 * 문자열/배열 끝에서 후속 run 없으면 매칭하지 않음.
 */
export function matchesCompositePlus(
  runs: ClassRun[],
  runIndex: number,
  primary: DigitClass,
  rule: CompositePlusRule,
  digitLength: number,
): boolean {
  const run = getRunAt(runs, runIndex);
  if (!run || !isRunWithinBounds(run, digitLength)) return false;
  if (run.cls !== primary || run.length < rule.primaryMin) return false;

  if (runIndex + 1 >= runs.length) return false;

  const next = getRunAt(runs, runIndex + 1);
  if (!next || !isRunWithinBounds(next, digitLength)) return false;
  if (next.cls !== opposite(primary)) return false;
  if (next.length !== rule.oppositeExact) return false;
  if (run.endIndex !== next.startIndex) return false;

  return true;
}

/**
 * 'n, m+α' — primary 연속 정확히 n 직후, opposite 연속 ≥ m.
 */
export function matchesCompositeComma(
  runs: ClassRun[],
  runIndex: number,
  primary: DigitClass,
  rule: CompositeCommaRule,
  digitLength: number,
): boolean {
  const run = getRunAt(runs, runIndex);
  if (!run || !isRunWithinBounds(run, digitLength)) return false;
  if (run.cls !== primary || run.length !== rule.primaryExact) return false;

  if (runIndex + 1 >= runs.length) return false;

  const next = getRunAt(runs, runIndex + 1);
  if (!next || !isRunWithinBounds(next, digitLength)) return false;
  if (next.cls !== opposite(primary)) return false;
  if (next.length < rule.oppositeMin) return false;
  if (run.endIndex !== next.startIndex) return false;

  return true;
}

/**
 * '1 사이' — primary / opposite(1) / primary 삼연속 (양쪽 primary 존재 필수).
 */
function matchesOneBetween(
  runs: ClassRun[],
  runIndex: number,
  primary: DigitClass,
  digitLength: number,
): boolean {
  const left = getRunAt(runs, runIndex);
  const mid = getRunAt(runs, runIndex + 1);
  const right = getRunAt(runs, runIndex + 2);

  if (!left || !mid || !right) return false;
  if (!isRunWithinBounds(left, digitLength)) return false;
  if (!isRunWithinBounds(mid, digitLength)) return false;
  if (!isRunWithinBounds(right, digitLength)) return false;

  const opp = opposite(primary);
  if (left.cls !== primary || right.cls !== primary) return false;
  if (mid.cls !== opp || mid.length !== MATCH_RULES.ONE_BETWEEN_OPPOSITE_LENGTH) return false;
  if (left.endIndex !== mid.startIndex || mid.endIndex !== right.startIndex) return false;

  return true;
}

function createEmptySidePatterns(): SidePatterns {
  return {
    threeOrMore: [],
    fiveOrMore: [],
    oneBetween: [],
    oneDuplicate: [],
    exactTwo: [],
    plusAlpha_3_2: [],
    plusAlpha_4_3: [],
    plusAlpha_4_4: [],
    commaAlpha_2_3: [],
  };
}

/** primary 관점 패턴 추출 */
export function extractSidePatterns(
  runs: ClassRun[],
  primary: DigitClass,
  digitLength: number,
): SidePatterns {
  const result = createEmptySidePatterns();
  const safeRuns = filterValidRuns(runs, digitLength);

  for (const run of safeRuns) {
    if (run.cls !== primary) continue;
    if (run.length >= MATCH_RULES.THREE_OR_MORE_MIN) result.threeOrMore.push(run.length);
    if (run.length >= MATCH_RULES.FIVE_OR_MORE_MIN) result.fiveOrMore.push(run.length);
    if (run.length === MATCH_RULES.ONE_DUPLICATE_LENGTH) result.oneDuplicate.push(run.length);
    if (run.length === MATCH_RULES.EXACT_TWO_LENGTH) result.exactTwo.push(run.length);
  }

  for (let i = 0; i < safeRuns.length; i += 1) {
    if (!matchesOneBetween(safeRuns, i, primary, digitLength)) continue;
    const mid = getRunAt(safeRuns, i + 1);
    if (mid) result.oneBetween.push(mid.startIndex);
  }

  for (const rule of COMPOSITE_PLUS_RULES) {
    for (let i = 0; i < safeRuns.length; i += 1) {
      if (!matchesCompositePlus(safeRuns, i, primary, rule, digitLength)) continue;
      const run = getRunAt(safeRuns, i);
      if (run) result[rule.field].push(run.startIndex);
    }
  }

  for (const rule of COMPOSITE_COMMA_RULES) {
    for (let i = 0; i < safeRuns.length; i += 1) {
      if (!matchesCompositeComma(safeRuns, i, primary, rule, digitLength)) continue;
      const run = getRunAt(safeRuns, i);
      if (run) result[rule.field].push(run.startIndex);
    }
  }

  return result;
}

/** 교차 검증 디버그 — UI 라벨 (Low/High 각각) */
export const PATTERN_FIELD_LABELS: Record<keyof SidePatterns, { low: string; high: string }> = {
  oneDuplicate: { low: '1 중복', high: '5 중복' },
  exactTwo: { low: '2', high: '6' },
  commaAlpha_2_3: { low: '2,3+α', high: '6,7+α' },
  threeOrMore: { low: '3 이상', high: '8 이상' },
  fiveOrMore: { low: '5 이상', high: '9 이상' },
  oneBetween: { low: '1 사이', high: '1 사이' },
  plusAlpha_3_2: { low: '3+α, 2', high: '5+α, 2' },
  plusAlpha_4_3: { low: '4+α, 3', high: '9+α, 3' },
  plusAlpha_4_4: { low: '4+α, 4', high: '9+α, 4' },
};

const PATTERN_DEBUG_FIELDS: (keyof SidePatterns)[] = [
  'oneDuplicate',
  'exactTwo',
  'commaAlpha_2_3',
  'threeOrMore',
  'fiveOrMore',
  'oneBetween',
  'plusAlpha_3_2',
  'plusAlpha_4_3',
  'plusAlpha_4_4',
];

/**
 * 패턴별 매칭 시작 인덱스 — 원본 대조용.
 * 길이 기반 패턴은 primary run의 startIndex, 인덱스 기반은 엔진이 저장한 값과 동일.
 */
export function collectPatternMatchStartIndices(
  result: AnalysisResult,
  side: DigitClass,
  field: keyof SidePatterns,
): number[] {
  const primary = side;
  const digitLength = result.digits.length;
  const runs = filterValidRuns(result.runs, digitLength);
  const patterns = side === 'low' ? result.lowPatterns : result.highPatterns;

  switch (field) {
    case 'threeOrMore': {
      const indices: number[] = [];
      for (const run of runs) {
        if (run.cls === primary && run.length >= MATCH_RULES.THREE_OR_MORE_MIN) {
          indices.push(run.startIndex);
        }
      }
      return indices;
    }
    case 'fiveOrMore': {
      const indices: number[] = [];
      for (const run of runs) {
        if (run.cls === primary && run.length >= MATCH_RULES.FIVE_OR_MORE_MIN) {
          indices.push(run.startIndex);
        }
      }
      return indices;
    }
    case 'oneDuplicate': {
      const indices: number[] = [];
      for (const run of runs) {
        if (run.cls === primary && run.length === MATCH_RULES.ONE_DUPLICATE_LENGTH) {
          indices.push(run.startIndex);
        }
      }
      return indices;
    }
    case 'exactTwo': {
      const indices: number[] = [];
      for (const run of runs) {
        if (run.cls === primary && run.length === MATCH_RULES.EXACT_TWO_LENGTH) {
          indices.push(run.startIndex);
        }
      }
      return indices;
    }
    case 'oneBetween':
    case 'plusAlpha_3_2':
    case 'plusAlpha_4_3':
    case 'plusAlpha_4_4':
    case 'commaAlpha_2_3':
      return [...patterns[field]];
    default:
      return [];
  }
}

/**
 * 마스터 분석 시 패턴별 매칭 인덱스를 console에 출력 (교차 검증 역추적용).
 */
export function logMatchingDetails(result: AnalysisResult): void {
  const prefix = `[AnalysisEngine] Master ${result.masterNo}`;
  console.group(`${prefix} — 패턴 매칭 인덱스 상세`);

  for (const side of ['low', 'high'] as const) {
    const sideLabel = side === 'low' ? 'Low' : 'High';
    console.group(`${sideLabel} 패턴`);

    for (const field of PATTERN_DEBUG_FIELDS) {
      const label = PATTERN_FIELD_LABELS[field][side];
      const indices = collectPatternMatchStartIndices(result, side, field);
      const stored = (side === 'low' ? result.lowPatterns : result.highPatterns)[field];
      console.log(
        `${sideLabel} ${label} 패턴 검출 인덱스 목록: [${indices.join(', ')}]` +
          ` (건수: ${indices.length}, stored: [${stored.join(', ')}])`,
      );
    }

    console.groupEnd();
  }

  console.groupEnd();
}

export function createEmptyAnalysisResult(masterNo: string): AnalysisResult {
  return {
    masterNo,
    totalCount: 0,
    lowCount: 0,
    lowRate: 0,
    highCount: 0,
    highRate: 0,
    lowPatterns: { ...EMPTY_SIDE_PATTERNS },
    highPatterns: { ...EMPTY_SIDE_PATTERNS },
    runs: [],
    digits: '',
  };
}

/**
 * Master Value 분석 메인 엔트리 (Pure Function)
 */
export function analyzeMasterValue(masterNo: string, rawValue: string): AnalysisResult {
  const safeMasterNo = masterNo?.padStart(2, '0') ?? '00';

  if (rawValue == null || typeof rawValue !== 'string') {
    return createEmptyAnalysisResult(safeMasterNo);
  }

  const digits = extractDigits(rawValue);

  if (digits.length === 0) {
    return createEmptyAnalysisResult(safeMasterNo);
  }

  const classes = toClassSequence(digits);
  const runs = filterValidRuns(buildRuns(classes), digits.length);
  const { lowCount, highCount } = splitLowHighCounts(digits);
  const totalCount = digits.length;

  return {
    masterNo: safeMasterNo,
    totalCount,
    lowCount,
    lowRate: calcRate(lowCount, totalCount),
    highCount,
    highRate: calcRate(highCount, totalCount),
    lowPatterns: extractSidePatterns(runs, 'low', totalCount),
    highPatterns: extractSidePatterns(runs, 'high', totalCount),
    runs,
    digits,
  };
}

/** 확장 패턴 규칙 등록용 헬퍼 */
export function matchCompositePlus(
  runs: ClassRun[],
  primary: DigitClass,
  primaryMin: number,
  oppositeExact: number,
  digitLength = Number.POSITIVE_INFINITY,
): number[] {
  const rule: CompositePlusRule = {
    label: 'custom',
    primaryMin,
    oppositeExact,
    field: 'plusAlpha_3_2',
  };
  const indices: number[] = [];

  for (let i = 0; i < runs.length; i += 1) {
    if (!matchesCompositePlus(runs, i, primary, rule, digitLength)) continue;
    const run = getRunAt(runs, i);
    if (run) indices.push(run.startIndex);
  }

  return indices;
}

function addIndexRange(indices: Set<number>, start: number, end: number): void {
  for (let i = start; i < end; i += 1) indices.add(i);
}

/**
 * 패턴 행 hover/click 시 Master Value 하이라이트용 digit 인덱스 목록.
 * UI 교차 검증 — 엔진이 집계한 run 경계와 눈으로 대조.
 */
export function resolvePatternHighlightIndices(
  result: AnalysisResult,
  side: DigitClass,
  field: keyof SidePatterns,
): number[] {
  const primary = side;
  const digitLength = result.digits.length;
  const runs = filterValidRuns(result.runs, digitLength);
  const indices = new Set<number>();

  switch (field) {
    case 'threeOrMore':
      for (const run of runs) {
        if (run.cls === primary && run.length >= MATCH_RULES.THREE_OR_MORE_MIN) {
          addIndexRange(indices, run.startIndex, run.endIndex);
        }
      }
      break;
    case 'fiveOrMore':
      for (const run of runs) {
        if (run.cls === primary && run.length >= MATCH_RULES.FIVE_OR_MORE_MIN) {
          addIndexRange(indices, run.startIndex, run.endIndex);
        }
      }
      break;
    case 'oneDuplicate':
      for (const run of runs) {
        if (run.cls === primary && run.length === MATCH_RULES.ONE_DUPLICATE_LENGTH) {
          addIndexRange(indices, run.startIndex, run.endIndex);
        }
      }
      break;
    case 'exactTwo':
      for (const run of runs) {
        if (run.cls === primary && run.length === MATCH_RULES.EXACT_TWO_LENGTH) {
          addIndexRange(indices, run.startIndex, run.endIndex);
        }
      }
      break;
    case 'oneBetween':
      for (let i = 0; i < runs.length; i += 1) {
        if (!matchesOneBetween(runs, i, primary, digitLength)) continue;
        const left = getRunAt(runs, i);
        const right = getRunAt(runs, i + 2);
        if (left && right) addIndexRange(indices, left.startIndex, right.endIndex);
      }
      break;
    case 'plusAlpha_3_2':
    case 'plusAlpha_4_3':
    case 'plusAlpha_4_4': {
      const rule = COMPOSITE_PLUS_RULES.find((r) => r.field === field);
      if (rule) {
        for (let i = 0; i < runs.length; i += 1) {
          if (!matchesCompositePlus(runs, i, primary, rule, digitLength)) continue;
          const run = getRunAt(runs, i);
          const next = getRunAt(runs, i + 1);
          if (run) addIndexRange(indices, run.startIndex, run.endIndex);
          if (next) addIndexRange(indices, next.startIndex, next.endIndex);
        }
      }
      break;
    }
    case 'commaAlpha_2_3': {
      const rule = COMPOSITE_COMMA_RULES[0];
      for (let i = 0; i < runs.length; i += 1) {
        if (!matchesCompositeComma(runs, i, primary, rule, digitLength)) continue;
        const run = getRunAt(runs, i);
        const next = getRunAt(runs, i + 1);
        if (run) addIndexRange(indices, run.startIndex, run.endIndex);
        if (next) addIndexRange(indices, next.startIndex, next.endIndex);
      }
      break;
    }
    default:
      break;
  }

  return [...indices].sort((a, b) => a - b);
}

export function matchCompositeComma(
  runs: ClassRun[],
  primary: DigitClass,
  primaryExact: number,
  oppositeMin: number,
  digitLength = Number.POSITIVE_INFINITY,
): number[] {
  const rule: CompositeCommaRule = {
    label: 'custom',
    primaryExact,
    oppositeMin,
    field: 'commaAlpha_2_3',
  };
  const indices: number[] = [];

  for (let i = 0; i < runs.length; i += 1) {
    if (!matchesCompositeComma(runs, i, primary, rule, digitLength)) continue;
    const run = getRunAt(runs, i);
    if (run) indices.push(run.startIndex);
  }

  return indices;
}

/** Code 테이블 연동 — 입력 코드 레코드 (DB Code[]) */
export interface CodeMatchInput {
  id: number;
  code: string;
  type: string;
  description: string;
}

export type CodeMatchKind = 'pattern' | 'sequence' | 'unmatched';

/** 코드별 누적 카운트 통계 행 */
export interface CodeValueStatRow {
  seq: number;
  code: string;
  type: string;
  description: string;
  count: number;
  percent: number;
  matchKind: CodeMatchKind;
  isTop: boolean;
}

function normalizePatternLabel(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** 구분(저점/고점) → 분석 엔진 DigitClass */
export function resolveCodeTypeSide(type: string): DigitClass | null {
  const t = type.trim();
  if (t === '저점' || t.toLowerCase() === 'low') return 'low';
  if (t === '고점' || t.toLowerCase() === 'high') return 'high';
  return null;
}

/** 설명이 패턴 라벨(예: '1 중복', '3 이상')이면 SidePatterns 필드로 해석 */
export function resolvePatternFieldFromDescription(
  description: string,
  codeType: string,
): { side: DigitClass; field: keyof SidePatterns } | null {
  const normalized = normalizePatternLabel(description);
  if (!normalized) return null;

  const preferredSide = resolveCodeTypeSide(codeType);

  if (preferredSide) {
    for (const field of PATTERN_DEBUG_FIELDS) {
      if (PATTERN_FIELD_LABELS[field][preferredSide] === normalized) {
        return { side: preferredSide, field };
      }
    }
  }

  for (const field of PATTERN_DEBUG_FIELDS) {
    const labels = PATTERN_FIELD_LABELS[field];
    if (labels.low === normalized) return { side: 'low', field };
    if (labels.high === normalized) return { side: 'high', field };
  }

  return null;
}

const RUN_CLASS_TOKENS: Record<string, DigitClass> = {
  저점: 'low',
  고점: 'high',
  low: 'low',
  high: 'high',
};

/** 설명이 '저점,고점,...' digit 클래스 시퀀스이면 DigitClass 배열로 파싱 */
export function parseRunClassSequence(description: string): DigitClass[] | null {
  const trimmed = description.trim();
  if (!trimmed) return null;

  const tokens = trimmed
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;

  const sequence: DigitClass[] = [];
  for (const token of tokens) {
    const cls = RUN_CLASS_TOKENS[token] ?? RUN_CLASS_TOKENS[token.toLowerCase()];
    if (!cls) return null;
    sequence.push(cls);
  }

  return sequence;
}

/** digit 클래스 배열에서 연속 시퀀스 출현 횟수 (슬라이딩 윈도우) */
export function countDigitClassSequenceMatches(
  classes: DigitClass[],
  sequence: DigitClass[],
): number {
  if (sequence.length === 0 || classes.length < sequence.length) return 0;

  let count = 0;
  for (let i = 0; i <= classes.length - sequence.length; i += 1) {
    let matched = true;
    for (let j = 0; j < sequence.length; j += 1) {
      if (classes[i + j] !== sequence[j]) {
        matched = false;
        break;
      }
    }
    if (matched) count += 1;
  }

  return count;
}

/** runs 배열에서 연속 클래스 시퀀스 출현 횟수 (슬라이딩 윈도우) */
export function countRunSequenceMatches(runs: ClassRun[], sequence: DigitClass[]): number {
  if (sequence.length === 0 || runs.length < sequence.length) return 0;

  let count = 0;
  for (let i = 0; i <= runs.length - sequence.length; i += 1) {
    let matched = true;
    for (let j = 0; j < sequence.length; j += 1) {
      const run = runs[i + j];
      if (!run || run.cls !== sequence[j]) {
        matched = false;
        break;
      }
    }
    if (matched) count += 1;
  }

  return count;
}

function countPatternMatches(
  result: AnalysisResult,
  side: DigitClass,
  field: keyof SidePatterns,
): number {
  const patterns = side === 'low' ? result.lowPatterns : result.highPatterns;
  return patterns[field]?.length ?? 0;
}

/** 단일 Code 레코드에 대한 출현 빈도 */
export function matchCodeToAnalysis(
  result: AnalysisResult,
  code: CodeMatchInput,
): { count: number; matchKind: CodeMatchKind } {
  const description = code.description ?? '';

  const patternRef = resolvePatternFieldFromDescription(description, code.type);
  if (patternRef) {
    return {
      count: countPatternMatches(result, patternRef.side, patternRef.field),
      matchKind: 'pattern',
    };
  }

  const sequence = parseRunClassSequence(description);
  if (sequence && sequence.length > 0) {
    const classes = toClassSequence(result.digits);
    return {
      count: countDigitClassSequenceMatches(classes, sequence),
      matchKind: 'sequence',
    };
  }

  return { count: 0, matchKind: 'unmatched' };
}

/**
 * AnalysisResult + Code[] → 코드별 누적 카운트 통계.
 * codes가 비어 있으면 [] 반환 (앱 크래시 방어).
 */
export function buildCodeValueStats(
  result: AnalysisResult,
  codes: CodeMatchInput[],
): CodeValueStatRow[] {
  if (!codes || codes.length === 0) return [];

  const rows = codes.map((code, index) => {
    const { count, matchKind } = matchCodeToAnalysis(result, code);
    return {
      seq: index + 1,
      code: code.code,
      type: code.type,
      description: code.description ?? '',
      count,
      percent: 0,
      matchKind,
      isTop: false,
    };
  });

  const totalMatches = rows.reduce((sum, row) => sum + row.count, 0);
  let maxCount = 0;

  for (const row of rows) {
    row.percent = totalMatches > 0 ? calcRate(row.count, totalMatches) : 0;
    if (row.count > maxCount) maxCount = row.count;
  }

  if (maxCount > 0) {
    for (const row of rows) {
      row.isTop = row.count === maxCount;
    }
  }

  return rows;
}

/** CodeValue 매칭 디버그 — logMatchingDetails와 함께 사용 */
export function logCodeValueMatchingDetails(
  result: AnalysisResult,
  stats: CodeValueStatRow[],
): void {
  console.group(`[AnalysisEngine] Master ${result.masterNo} — CodeValue 매칭 상세`);

  if (stats.length === 0) {
    console.info('등록된 Code 규칙 없음 — 통계 0건');
    console.groupEnd();
    return;
  }

  console.table(
    stats.map((row) => ({
      seq: row.seq,
      code: row.code,
      type: row.type,
      description: row.description,
      count: row.count,
      percent: `${row.percent}%`,
      kind: row.matchKind,
      top: row.isTop ? '★' : '',
    })),
  );

  const unmatched = stats.filter((r) => r.matchKind === 'unmatched');
  if (unmatched.length > 0) {
    console.warn(
      '[AnalysisEngine] 매칭 규칙 미해석 Code:',
      unmatched.map((r) => `${r.code}(${r.description})`).join(', '),
    );
  }

  console.groupEnd();
}
