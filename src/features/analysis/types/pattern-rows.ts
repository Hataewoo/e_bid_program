import type { SidePatterns } from '@/shared/utils/analysisEngine';

export type PatternSide = 'low' | 'high';

export interface PatternRowDef {
  code: string;
  field: keyof SidePatterns;
  valueKind: 'length' | 'index';
}

/** 이명전기 STEP2/STEP3 Code Values 행 — 동일 10패턴 (S만 low/highRunLengths 로 구분) */
export const LOW_PATTERN_ROWS: PatternRowDef[] = [
  { code: '1 중복', field: 'oneDuplicate', valueKind: 'length' },
  { code: '1 사이', field: 'oneBetween', valueKind: 'length' },
  { code: '2,3+α', field: 'commaAlpha_2_3', valueKind: 'length' },
  { code: '3+α,2', field: 'alphaPlus_3_2', valueKind: 'length' },
  { code: '3,4+α', field: 'plusAlpha_3_2', valueKind: 'length' },
  { code: '4+α,3', field: 'alphaPlus_4_3', valueKind: 'length' },
  { code: '4,5+α', field: 'plusAlpha_4_3', valueKind: 'length' },
  { code: '5+α,4', field: 'plusAlpha_4_4', valueKind: 'length' },
  { code: '3 이상', field: 'threeOrMore', valueKind: 'length' },
  { code: '5 이상', field: 'fiveOrMore', valueKind: 'length' },
];

/** STEP3 — 이명전기와 동일 (8 이상·9 이상·5 중복 등 없음) */
export const HIGH_PATTERN_ROWS: PatternRowDef[] = LOW_PATTERN_ROWS;

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
}

export function getPatternValues(patterns: SidePatterns, field: keyof SidePatterns): number[] {
  return patterns[field] ?? [];
}
