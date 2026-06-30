import type { SidePatterns } from '@/shared/utils/analysisEngine';

export type PatternSide = 'low' | 'high';

export interface PatternRowDef {
  code: string;
  field: keyof SidePatterns;
  valueKind: 'length' | 'index';
}

export const LOW_PATTERN_ROWS: PatternRowDef[] = [
  { code: '1 중복', field: 'oneDuplicate', valueKind: 'length' },
  { code: '2', field: 'exactTwo', valueKind: 'length' },
  { code: '2,3+α', field: 'commaAlpha_2_3', valueKind: 'index' },
  { code: '3 이상', field: 'threeOrMore', valueKind: 'length' },
  { code: '5 이상', field: 'fiveOrMore', valueKind: 'length' },
  { code: '1 사이', field: 'oneBetween', valueKind: 'index' },
  { code: '3+α, 2', field: 'plusAlpha_3_2', valueKind: 'index' },
  { code: '4+α, 3', field: 'plusAlpha_4_3', valueKind: 'index' },
  { code: '4+α, 4', field: 'plusAlpha_4_4', valueKind: 'index' },
];

export const HIGH_PATTERN_ROWS: PatternRowDef[] = [
  { code: '5 중복', field: 'oneDuplicate', valueKind: 'length' },
  { code: '6', field: 'exactTwo', valueKind: 'length' },
  { code: '6,7+α', field: 'commaAlpha_2_3', valueKind: 'index' },
  { code: '8 이상', field: 'threeOrMore', valueKind: 'length' },
  { code: '9 이상', field: 'fiveOrMore', valueKind: 'length' },
  { code: '1 사이', field: 'oneBetween', valueKind: 'index' },
  { code: '5+α, 2', field: 'plusAlpha_3_2', valueKind: 'index' },
  { code: '9+α, 3', field: 'plusAlpha_4_3', valueKind: 'index' },
  { code: '9+α, 4', field: 'plusAlpha_4_4', valueKind: 'index' },
];

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
