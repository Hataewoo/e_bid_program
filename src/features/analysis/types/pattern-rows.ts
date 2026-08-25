import type { SidePatterns } from '@/shared/utils/analysisEngine';

export type PatternSide = 'low' | 'high';

export interface PatternRowDef {
  code: string;
  field: keyof SidePatterns;
  valueKind: 'length' | 'index';
}

/** Code Value 10규칙 — 저·고 동일 라벨 (레거시 MFC) */
export const CODE_VALUE_PATTERN_ROWS: PatternRowDef[] = [
  { code: '1 중복', field: 'oneDuplicate', valueKind: 'length' },
  { code: '2, 3+α', field: 'commaAlpha_2_3', valueKind: 'length' },
  { code: '3, 4+α', field: 'plusAlpha_3_2', valueKind: 'length' },
  { code: '4, 5+α', field: 'plusAlpha_4_3', valueKind: 'length' },
  { code: '5+α, 4', field: 'plusAlpha_4_4', valueKind: 'length' },
  { code: '3 이상', field: 'threeOrMore', valueKind: 'length' },
  { code: '5 이상', field: 'fiveOrMore', valueKind: 'length' },
  { code: '1 사이', field: 'oneBetween', valueKind: 'length' },
  { code: '3+α, 2', field: 'alphaPlus_3_2', valueKind: 'length' },
  { code: '4+α, 3', field: 'alphaPlus_4_3', valueKind: 'length' },
];

export const LOW_PATTERN_ROWS: PatternRowDef[] = CODE_VALUE_PATTERN_ROWS;
export const HIGH_PATTERN_ROWS: PatternRowDef[] = CODE_VALUE_PATTERN_ROWS;

export interface PatternHighlightState {
  side: PatternSide;
  field: keyof SidePatterns;
  code: string;
}

export interface PatternModalState {
  side: PatternSide;
  code: string;
  values: number[];
  valueKind: 'length' | 'index';
  /** pattern-row: Code/Values 행 · legacy-code-content: STEP2/3 코드 내용 */
  source?: 'pattern-row' | 'legacy-code-content';
}

export function getPatternValues(patterns: SidePatterns, field: keyof SidePatterns): number[] {
  return patterns[field] ?? [];
}

/** 레거시 grid 라벨 → PatternValuesTable code (공백 차이 정규화) */
const LEGACY_LABEL_TO_CODE: Record<string, string> = {
  '1 중복': '1 중복',
  '2,3+α': '2, 3+α',
  '3,4+α': '3, 4+α',
  '4,5+α': '4, 5+α',
  '5+α,4': '5+α, 4',
  '3 이상': '3 이상',
  '5 이상': '5 이상',
  '1 사이': '1 사이',
  '3+α,2': '3+α, 2',
  '4+α,3': '4+α, 3',
};

export function parseLegacyPatternContent(content: string): number[] {
  if (!content || content === '-') return [];
  return content
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n));
}

export function patternModalFromLegacyRow(
  side: PatternSide,
  label: string,
  content: string,
): PatternModalState | null {
  const values = parseLegacyPatternContent(content);
  if (values.length === 0) return null;
  const code = LEGACY_LABEL_TO_CODE[label] ?? label;
  const rowDef = CODE_VALUE_PATTERN_ROWS.find((row) => row.code === code);
  return {
    side,
    code,
    values,
    valueKind: rowDef?.valueKind ?? 'length',
    source: 'pattern-row',
  };
}

/** STEP2/3 코드 · 내용(gap) — 10규칙 재분석 팝업용 */
export function patternModalFromLegacyCodeContent(
  side: PatternSide,
  code: string,
  gaps: readonly number[],
  content?: string,
): PatternModalState | null {
  const values = gaps.length > 0 ? [...gaps] : parseLegacyPatternContent(content ?? '');
  if (values.length === 0) return null;
  return {
    side,
    code,
    values,
    valueKind: 'length',
    source: 'legacy-code-content',
  };
}
