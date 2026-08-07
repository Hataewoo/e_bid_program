/**
 * 이명전기 Code Value STEP2/3 — 화면 Code 고정 목록 + 설명(패턴 규칙).
 * DB Code가 없거나 description이 비어 있어도 catalog 설명으로 「내용」을 계산한다.
 */

export interface LegacyStepCodeDefinition {
  code: string;
  type: string;
  /** 저점/고점 클래스 시퀀스 — STEP2/3 Point Values 세부구간 매칭 */
  description: string;
}

/** STEP2 Low Point Values — 레거시 13종 (표시 순서 고정) */
export const LEGACY_STEP2_CODE_ORDER = [
  '234',
  '24',
  '324',
  '34',
  '32',
  '10',
  '01234',
  '01',
  '23',
  '423',
  '42',
  '43',
  '23401',
] as const;

/** STEP3 High Point Values — 레거시 13종 */
export const LEGACY_STEP3_CODE_ORDER = [
  '56',
  '567',
  '56789',
  '57',
  '65',
  '657',
  '67',
  '75',
  '756',
  '76',
  '89',
  '89657',
  '98',
] as const;

/** electron/database/seed/code-seed.ts */
export const LEGACY_STEP2_CODE_DEFS: readonly LegacyStepCodeDefinition[] = [
  { code: '234', type: '저점', description: '저점,고점,저점' },
  { code: '24', type: '고점', description: '고점,저점' },
  { code: '324', type: '고점', description: '고점,저점,고점' },
  { code: '34', type: '고점', description: '고점,고점,저점' },
  { code: '32', type: '고점', description: '고점,저점,고점' },
  { code: '10', type: '고점', description: '저점,고점' },
  { code: '01234', type: '저점', description: '저점,저점,고점,고점,저점' },
  { code: '01', type: '저점', description: '저점,저점' },
  { code: '23', type: '고점', description: '고점,고점' },
  { code: '423', type: '고점', description: '저점,고점,고점,저점' },
  { code: '42', type: '고점', description: '저점,고점,저점' },
  { code: '43', type: '고점', description: '고점,저점,저점' },
  { code: '23401', type: '저점', description: '고점,고점,저점,저점,고점' },
];

/** STEP3 — High PV(5~9), 5~7=저점, 8~9=고점 */
export const LEGACY_STEP3_CODE_DEFS: readonly LegacyStepCodeDefinition[] = [
  { code: '56', type: '고점', description: '저점,고점' },
  { code: '567', type: '고점', description: '저점,고점,저점' },
  { code: '56789', type: '고점', description: '저점,고점,저점,고점,저점' },
  { code: '57', type: '고점', description: '저점,고점' },
  { code: '65', type: '고점', description: '고점,저점' },
  { code: '657', type: '고점', description: '고점,저점,고점' },
  { code: '67', type: '고점', description: '고점,저점' },
  { code: '75', type: '고점', description: '고점,저점' },
  { code: '756', type: '고점', description: '고점,저점,고점' },
  { code: '76', type: '고점', description: '고점,저점' },
  { code: '89', type: '고점', description: '고점,저점' },
  { code: '89657', type: '고점', description: '고점,저점,고점,저점,고점' },
  { code: '98', type: '고점', description: '고점,저점' },
];

const STEP2_DEF_MAP = new Map(LEGACY_STEP2_CODE_DEFS.map((d) => [d.code, d]));
const STEP3_DEF_MAP = new Map(LEGACY_STEP3_CODE_DEFS.map((d) => [d.code, d]));

export type LegacyStep2Code = (typeof LEGACY_STEP2_CODE_ORDER)[number];
export type LegacyStep3Code = (typeof LEGACY_STEP3_CODE_ORDER)[number];

export function isLegacyStep2Code(code: string): code is LegacyStep2Code {
  return (LEGACY_STEP2_CODE_ORDER as readonly string[]).includes(code);
}

export function getLegacyStepCodeDefinition(
  code: string,
  side: 'low' | 'high',
): LegacyStepCodeDefinition | undefined {
  const map = side === 'low' ? STEP2_DEF_MAP : STEP3_DEF_MAP;
  return map.get(code);
}

export function getLegacyStepCodeOrder(side: 'low' | 'high'): readonly string[] {
  return side === 'low' ? LEGACY_STEP2_CODE_ORDER : LEGACY_STEP3_CODE_ORDER;
}
