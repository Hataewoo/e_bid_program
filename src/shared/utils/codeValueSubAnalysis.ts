/**
 * Code Value 세부정보 — S 시퀀스(저·고 run 길이)에 10패턴 재분석.
 * 레거시 High/Low Point Values 팝업과 동일 규칙 (α = 9).
 */

import type { AnalysisResult, DigitClass, SidePatterns } from './analysisEngine';
import { classifyChar } from './analysisEngine';

export const CODE_VALUE_ALPHA_MAX = 9;

export interface BetweenMarkerRule {
  countExact?: number;
  countMin?: number;
  countMax?: number;
  markerExact?: number;
  markerMin?: number;
  markerMax?: number;
  pairsOnly?: boolean;
}

/** S 시퀀스 Code Value 10패턴 (세부정보 테이블) */
export interface CodeValueSubPatterns {
  oneDuplicate: number[];
  commaAlpha_2_3: number[];
  plusAlpha_3_2: number[];
  plusAlpha_4_3: number[];
  plusAlpha_4_4: number[];
  threeOrMore: number[];
  fiveOrMore: number[];
  oneBetween: number[];
  alphaPlus_3_2: number[];
  alphaPlus_4_3: number[];
}

export interface CodeValueSubAnalysisRule {
  order: number;
  code: string;
  description: string;
  field: keyof CodeValueSubPatterns;
}

export interface CodeValueSubAnalysisRow {
  code: string;
  description: string;
  values: number[];
}

export interface CodeValueSubAnalysisResult {
  side: DigitClass;
  baseSequence: number[];
  patterns: CodeValueSubPatterns;
  rules: CodeValueSubAnalysisRule[];
  rows: CodeValueSubAnalysisRow[];
}

const BETWEEN_RULES = {
  commaAlpha_2_3: { countExact: 2, markerMin: 3, markerMax: CODE_VALUE_ALPHA_MAX },
  plusAlpha_3_2: { countExact: 3, markerMin: 4, markerMax: CODE_VALUE_ALPHA_MAX },
  plusAlpha_4_3: { countExact: 4, markerMin: 5, markerMax: CODE_VALUE_ALPHA_MAX },
  plusAlpha_4_4: {
    countMin: 5,
    countMax: CODE_VALUE_ALPHA_MAX,
    markerExact: 4,
    pairsOnly: true,
  },
  oneBetween: { countMin: 2, markerExact: 1, pairsOnly: true },
  alphaPlus_3_2: { countMin: 3, countMax: CODE_VALUE_ALPHA_MAX, markerExact: 2, pairsOnly: true },
  alphaPlus_4_3: { countMin: 4, countMax: CODE_VALUE_ALPHA_MAX, markerExact: 3, pairsOnly: true },
} as const satisfies Record<
  Exclude<
    keyof CodeValueSubPatterns,
    'oneDuplicate' | 'threeOrMore' | 'fiveOrMore'
  >,
  BetweenMarkerRule
>;

/** 1단계 Code/Values — S(L/H run 길이)에 적용 (첫 번째 분류) */
export const CODE_VALUE_MAIN_RULES: CodeValueSubAnalysisRule[] = [
  {
    order: 1,
    code: '1 중복',
    description: '1이 중복으로 나온 갯수',
    field: 'oneDuplicate',
  },
  {
    order: 2,
    code: '2, 3+α',
    description: '3~9사이의 숫자 2 갯수',
    field: 'commaAlpha_2_3',
  },
  {
    order: 3,
    code: '3, 4+α',
    description: '4~9사이의 숫자 3 갯수',
    field: 'plusAlpha_3_2',
  },
  {
    order: 4,
    code: '4, 5+α',
    description: '5~9사이의 숫자 4 갯수',
    field: 'plusAlpha_4_3',
  },
  {
    order: 5,
    code: '5+α, 4',
    description: '숫자 4와 4사이의 숫자 5~9 갯수',
    field: 'plusAlpha_4_4',
  },
  {
    order: 6,
    code: '3 이상',
    description: '숫자 3 이상 큰수 배열',
    field: 'threeOrMore',
  },
  {
    order: 7,
    code: '5 이상',
    description: '숫자 5 이상 큰수 배열',
    field: 'fiveOrMore',
  },
  {
    order: 8,
    code: '1 사이',
    description: '2 이상 숫자가 1 사이에 나온 카운트',
    field: 'oneBetween',
  },
  {
    order: 9,
    code: '3+α, 2',
    description: '2사이의 숫자 3~9 갯수',
    field: 'alphaPlus_3_2',
  },
  {
    order: 10,
    code: '4+α, 3',
    description: '3사이의 숫자 4~9 갯수',
    field: 'alphaPlus_4_3',
  },
];

/** 2단계 세부정보 — Code/Values 행 값에 재적용 (두 번째 분류) */
export const CODE_VALUE_SUB_DETAIL_RULES: CodeValueSubAnalysisRule[] = [
  {
    order: 1,
    code: '1 중복',
    description: '1이 중복으로 나온 갯수',
    field: 'oneDuplicate',
  },
  {
    order: 2,
    code: '2, 3+α',
    description: '3~9사이의 숫자 2 갯수',
    field: 'commaAlpha_2_3',
  },
  {
    order: 3,
    code: '3, 4+α',
    description: '4~9사이의 숫자 3 갯수',
    field: 'plusAlpha_3_2',
  },
  {
    order: 4,
    code: '4, 5+α',
    description: '5~9사이의 숫자 4 갯수',
    field: 'plusAlpha_4_3',
  },
  {
    order: 5,
    code: '5+α, 4',
    description: '숫자 4와 4사이의 숫자 5~9 갯수',
    field: 'plusAlpha_4_4',
  },
  {
    order: 6,
    code: '3 이상',
    description: '숫자 3 이상 큰수 배열',
    field: 'threeOrMore',
  },
  {
    order: 7,
    code: '5 이상',
    description: '숫자 5 이상 큰수 배열',
    field: 'fiveOrMore',
  },
  {
    order: 8,
    code: '1 사이',
    description: '2 이상 숫자가 1 사이에 나온 카운트',
    field: 'oneBetween',
  },
  {
    order: 9,
    code: '3+α, 2',
    description: '2사이의 숫자 3~9 갯수',
    field: 'alphaPlus_3_2',
  },
  {
    order: 10,
    code: '4+α, 3',
    description: '3사이의 숫자 4~9 갯수',
    field: 'alphaPlus_4_3',
  },
];

/** @deprecated 세부정보 규칙 — CODE_VALUE_SUB_DETAIL_RULES 사용 */
export const CODE_VALUE_SUB_ANALYSIS_RULES = CODE_VALUE_SUB_DETAIL_RULES;

function createEmptySubPatterns(): CodeValueSubPatterns {
  return {
    oneDuplicate: [],
    commaAlpha_2_3: [],
    plusAlpha_3_2: [],
    plusAlpha_4_3: [],
    plusAlpha_4_4: [],
    threeOrMore: [],
    fiveOrMore: [],
    oneBetween: [],
    alphaPlus_3_2: [],
    alphaPlus_4_3: [],
  };
}

function valueInRuleRange(
  value: number,
  min: number | undefined,
  max: number | undefined,
  fallbackMax: number,
): boolean {
  if (min === undefined) return false;
  const upper = max ?? fallbackMax;
  return value >= min && value <= upper;
}

function collectMarkerIndices(sequence: number[], isMarker: (value: number) => boolean): number[] {
  const indices: number[] = [];
  for (let i = 0; i < sequence.length; i += 1) {
    if (isMarker(sequence[i]!)) indices.push(i);
  }
  return indices;
}

function countMatchingBetweenMarkers(
  sequence: number[],
  markerIndices: number[],
  countMatch: (value: number) => boolean,
  pairsOnly = false,
): number[] {
  const results: number[] = [];
  if (sequence.length === 0) return results;

  const countInRange = (start: number, end: number): number => {
    let count = 0;
    for (let i = start; i < end; i += 1) {
      if (countMatch(sequence[i]!)) count += 1;
    }
    return count;
  };

  if (markerIndices.length === 0) {
    if (pairsOnly) return results;
    const total = countInRange(0, sequence.length);
    if (total > 0) results.push(total);
    return results;
  }

  if (markerIndices.length === 1 && pairsOnly) return results;

  if (!pairsOnly) {
    const first = countInRange(0, markerIndices[0]!);
    if (first > 0) results.push(first);
  }

  for (let m = 0; m < markerIndices.length - 1; m += 1) {
    const between = countInRange(markerIndices[m]! + 1, markerIndices[m + 1]!);
    if (between > 0) results.push(between);
  }

  if (!pairsOnly) {
    const last = countInRange(markerIndices[markerIndices.length - 1]! + 1, sequence.length);
    if (last > 0) results.push(last);
  }

  return results;
}

export function countBetweenMarkerRule(sequence: number[], rule: BetweenMarkerRule): number[] {
  const isMarker = (value: number): boolean => {
    if (rule.markerExact !== undefined) return value === rule.markerExact;
    return valueInRuleRange(value, rule.markerMin, rule.markerMax, CODE_VALUE_ALPHA_MAX);
  };

  const countMatch = (value: number): boolean => {
    if (rule.countExact !== undefined) return value === rule.countExact;
    return valueInRuleRange(
      value,
      rule.countMin,
      rule.countMax,
      rule.countMax === undefined && rule.countMin !== undefined
        ? Number.POSITIVE_INFINITY
        : CODE_VALUE_ALPHA_MAX,
    );
  };

  return countMatchingBetweenMarkers(
    sequence,
    collectMarkerIndices(sequence, isMarker),
    countMatch,
    rule.pairsOnly ?? false,
  );
}

/** S에서 value 연속 run 길이 (1 중복) */
export function collectValueRunLengths(sequence: number[], value: number): number[] {
  const lengths: number[] = [];
  if (sequence.length === 0) return lengths;

  let i = 0;
  while (i < sequence.length) {
    if (sequence[i] !== value) {
      i += 1;
      continue;
    }
    let length = 1;
    i += 1;
    while (i < sequence.length && sequence[i] === value) {
      length += 1;
      i += 1;
    }
    lengths.push(length);
  }

  return lengths;
}

/** Master L/H primary run 길이 → S 시퀀스 (교차 run 길이) */
export function collectPrimaryRunLengths(
  runs: AnalysisResult['runs'],
  primary: DigitClass,
): number[] {
  return runs.filter((run) => run.cls === primary).map((run) => run.length);
}

/** STEP2/3 — 해당 클래스 digit만 추출 */
export function filterDigitsByClass(digits: string, cls: DigitClass): string {
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    const ch = digits[i] ?? '';
    if (classifyChar(ch) === cls) out += ch;
  }
  return out;
}

/**
 * 레거시 S 시퀀스 — 같은 digit run: 길이 1 → digit 값, 길이 ≥2 → run 길이.
 */
export function buildSideBaseSequence(sideDigits: string): number[] {
  const sequence: number[] = [];
  if (sideDigits.length === 0) return sequence;

  let i = 0;
  while (i < sideDigits.length) {
    const ch = sideDigits[i]!;
    let length = 1;
    i += 1;
    while (i < sideDigits.length && sideDigits[i] === ch) {
      length += 1;
      i += 1;
    }
    sequence.push(length === 1 ? Number(ch) : length);
  }
  return sequence;
}

export function buildSideBaseSequenceFromResult(
  result: AnalysisResult,
  side: DigitClass,
): number[] {
  return buildSideBaseSequence(filterDigitsByClass(result.digits, side));
}

/**
 * S 시퀀스에 Code Value 10패턴 적용.
 * @param baseSequence 저·고 run 길이 배열 (lowRunLengths / highRunLengths)
 */
export function extractCodeValuesFromBaseSequence(
  baseSequence: number[],
  _side: DigitClass = 'low',
): CodeValueSubPatterns {
  void _side;
  const result = createEmptySubPatterns();
  if (baseSequence.length === 0) return result;

  result.oneDuplicate = collectValueRunLengths(baseSequence, 1);
  result.threeOrMore = baseSequence.filter((value) => value >= 3);
  result.fiveOrMore = baseSequence.filter((value) => value >= 5);

  result.commaAlpha_2_3 = countBetweenMarkerRule(baseSequence, BETWEEN_RULES.commaAlpha_2_3);
  result.plusAlpha_3_2 = countBetweenMarkerRule(baseSequence, BETWEEN_RULES.plusAlpha_3_2);
  result.plusAlpha_4_3 = countBetweenMarkerRule(baseSequence, BETWEEN_RULES.plusAlpha_4_3);
  result.plusAlpha_4_4 = countBetweenMarkerRule(baseSequence, BETWEEN_RULES.plusAlpha_4_4);
  result.oneBetween = countBetweenMarkerRule(baseSequence, BETWEEN_RULES.oneBetween);
  result.alphaPlus_3_2 = countBetweenMarkerRule(baseSequence, BETWEEN_RULES.alphaPlus_3_2);
  result.alphaPlus_4_3 = countBetweenMarkerRule(baseSequence, BETWEEN_RULES.alphaPlus_4_3);

  return result;
}

export function formatSubAnalysisValues(values: number[]): string {
  if (values.length === 0) return '-';
  return values.join(', ');
}

/** Code/Values 행 — Values 배열에 들어 있는 항목 개수 (합산 아님) */
export function getPatternValuesMatchCount(values: readonly number[]): number {
  return values.length;
}

/** 1단계 Code/Values — S 시퀀스(L/H run 길이)에 10규칙 적용 */
export function analyzeCodeValueMainDetail(
  baseSequence: number[],
  side: DigitClass,
): CodeValueSubAnalysisResult {
  const patterns = extractCodeValuesFromBaseSequence(baseSequence, side);
  const rows = CODE_VALUE_MAIN_RULES.map((rule) => ({
    code: rule.code,
    description: formatSubAnalysisValues(patterns[rule.field]),
    values: [...patterns[rule.field]],
  }));

  return {
    side,
    baseSequence: [...baseSequence],
    patterns,
    rules: CODE_VALUE_MAIN_RULES,
    rows,
  };
}

/** 2단계 세부정보 — Code/Values 행 값에 10규칙 재적용 */
export function analyzeCodeValueSubDetail(
  baseSequence: number[],
  side: DigitClass,
): CodeValueSubAnalysisResult {
  const patterns = extractCodeValuesFromBaseSequence(baseSequence, side);
  const rows = CODE_VALUE_SUB_DETAIL_RULES.map((rule) => ({
    code: rule.code,
    description: formatSubAnalysisValues(patterns[rule.field]),
    values: [...patterns[rule.field]],
  }));

  return {
    side,
    baseSequence: [...baseSequence],
    patterns,
    rules: CODE_VALUE_SUB_DETAIL_RULES,
    rows,
  };
}

/** @deprecated analyzeCodeValueMainDetail 또는 analyzeCodeValueSubDetail 사용 */
export function analyzePatternSubDetailFromResult(
  result: AnalysisResult,
  side: DigitClass,
): CodeValueSubAnalysisResult {
  const baseSequence = side === 'low' ? result.lowRunLengths : result.highRunLengths;
  return analyzeCodeValueMainDetail(baseSequence, side);
}

/** 패턴 행 Values → 2단계 세부정보 10규칙 재분석 */
export function analyzePatternSubDetailFromValues(
  values: number[],
  side: DigitClass,
): CodeValueSubAnalysisResult {
  return analyzeCodeValueSubDetail(values, side);
}

export function extractSidePatternsFromMasterRuns(
  runs: AnalysisResult['runs'],
  side: DigitClass,
): { patterns: SidePatterns; baseSequence: number[] } {
  const baseSequence = collectPrimaryRunLengths(runs, side);
  const sub = extractCodeValuesFromBaseSequence(baseSequence, side);
  return {
    baseSequence,
    patterns: toSidePatternsFromCodeValue(sub),
  };
}

/** @deprecated extractSidePatternsFromMasterRuns 사용 */
export function extractSidePatternsFromMasterDigits(
  digits: string,
  side: DigitClass,
): { patterns: SidePatterns; baseSequence: number[] } {
  void digits;
  void side;
  return { patterns: toSidePatternsFromCodeValue(createEmptySubPatterns()), baseSequence: [] };
}

export function toSidePatternsFromCodeValue(sub: CodeValueSubPatterns): SidePatterns {
  return {
    oneDuplicate: [...sub.oneDuplicate],
    exactTwo: [],
    commaAlpha_2_3: [...sub.commaAlpha_2_3],
    plusAlpha_3_2: [...sub.plusAlpha_3_2],
    plusAlpha_4_3: [...sub.plusAlpha_4_3],
    plusAlpha_4_4: [...sub.plusAlpha_4_4],
    threeOrMore: [...sub.threeOrMore],
    fiveOrMore: [...sub.fiveOrMore],
    oneBetween: [...sub.oneBetween],
    alphaPlus_3_2: [...sub.alphaPlus_3_2],
    alphaPlus_4_3: [...sub.alphaPlus_4_3],
  };
}

export function formatBaseSequenceText(baseSequence: number[]): string {
  return baseSequence.join(', ');
}
