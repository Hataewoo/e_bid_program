import type { PredictionVerificationCase } from '@/shared/utils/predictionVerification';

const S_PATTERN_VALUE_LOW =
  '저점(STEP2) · 전환 · S run → run 종료 · 다음 구간: 고점(5~9) · 전환 · S run · 90%';
const S_PATTERN_VALUE_HIGH =
  '고점(STEP3) · 전환 · S run → run 종료 · 다음 구간: 저점(0~4) · 전환 · S run · 90%';

/**
 * Prediction baseline — S 패턴 phase 엔진 (SRC-BUILTIN).
 * 소수 digit(0~9) 연쇄 추천은 포함하지 않음.
 */
export const BUILTIN_PREDICTION_VERIFICATION_CASES: PredictionVerificationCase[] = [
  {
    catalogId: 'TC-PRED-001',
    name: 'TC-PRED-001 Empty master value',
    source: 'SRC-BUILTIN',
    masterNo: '00',
    masterValue: '',
    codes: [],
    expected: { value: '', confidence: 0, step2Count: 0, step3Count: 0 },
  },
  {
    catalogId: 'TC-PRED-002',
    name: 'TC-PRED-002 Balanced digits 0-9',
    source: 'SRC-BUILTIN',
    masterNo: '00',
    masterValue: '0123456789',
    codes: [{ code: '02', type: '저점', description: '저점,고점' }],
    expected: {
      value: S_PATTERN_VALUE_HIGH,
      topCode: '02',
      confidence: 100,
      dominantSide: 'balanced',
      modeDigit: null,
      step2Count: 5,
      step3Count: 5,
    },
  },
  {
    catalogId: 'TC-PRED-003',
    name: 'TC-PRED-003 Low dominant 0011223344',
    source: 'SRC-BUILTIN',
    masterNo: '01',
    masterValue: '0011223344',
    codes: [{ code: '01', type: '저점', description: '저점,저점' }],
    expected: {
      value: S_PATTERN_VALUE_LOW,
      topCode: '01',
      dominantSide: 'low',
      modeDigit: null,
      step2Count: 10,
      step3Count: 0,
    },
  },
  {
    catalogId: 'TC-PRED-004',
    name: 'TC-PRED-004 High dominant 5566778899',
    source: 'SRC-BUILTIN',
    masterNo: '02',
    masterValue: '5566778899',
    codes: [{ code: '23', type: '고점', description: '고점,고점' }],
    expected: {
      value: S_PATTERN_VALUE_HIGH,
      topCode: '23',
      dominantSide: 'high',
      modeDigit: null,
      confidence: 100,
      step2Count: 0,
      step3Count: 10,
    },
  },
  {
    catalogId: 'TC-PRED-005',
    name: 'TC-PRED-005 No registered codes fallback',
    source: 'SRC-BUILTIN',
    masterNo: '03',
    masterValue: '01234',
    codes: [],
    expected: {
      value: S_PATTERN_VALUE_LOW,
      topCode: null,
      confidence: 100,
      dominantSide: 'low',
      modeDigit: null,
    },
  },
  {
    catalogId: 'TC-PRED-006',
    name: 'TC-PRED-006 Dual code top pick',
    source: 'SRC-BUILTIN',
    masterNo: '00',
    masterValue: '00112255',
    codes: [
      { code: '01', type: '저점', description: '저점,저점' },
      { code: '02', type: '저점', description: '저점,고점' },
    ],
    expected: {
      topCode: '01',
      dominantSide: 'low',
      modeDigit: null,
    },
  },
  {
    catalogId: 'TC-PRED-007',
    name: 'TC-PRED-007 Single digit low',
    source: 'SRC-BUILTIN',
    masterNo: '08',
    masterValue: '3',
    codes: [{ code: '99', type: '저점', description: '1 중복' }],
    expected: {
      value: S_PATTERN_VALUE_LOW,
      topCode: '99',
      dominantSide: 'low',
      modeDigit: null,
      confidence: 100,
      step2Count: 1,
      step3Count: 0,
    },
  },
  {
    catalogId: 'TC-PRED-008',
    name: 'TC-PRED-008 Pattern code zero count',
    source: 'SRC-BUILTIN',
    masterNo: '00',
    masterValue: '1234',
    codes: [{ code: 'XX', type: '저점', description: 'unknown rule' }],
    expected: {
      topCode: 'XX',
      confidence: 100,
      dominantSide: 'low',
      modeDigit: null,
    },
  },
  {
    catalogId: 'TC-PRED-009',
    name: 'TC-PRED-009 Master 05 statistics case',
    source: 'SRC-BUILTIN',
    masterNo: '05',
    masterValue: '0123456789',
    codes: [{ code: '30', type: '고점', description: '저점,고점,고점' }],
    expected: {
      dominantSide: 'balanced',
      step2Count: 5,
      step3Count: 5,
    },
  },
  {
    catalogId: 'TC-PRED-010',
    name: 'TC-PRED-010 High only 56789',
    source: 'SRC-BUILTIN',
    masterNo: '02',
    masterValue: '56789',
    codes: [{ code: '20', type: '고점', description: '저점,고점' }],
    expected: {
      value: S_PATTERN_VALUE_HIGH,
      dominantSide: 'high',
      modeDigit: null,
      step2Count: 0,
      step3Count: 5,
    },
  },
  {
    catalogId: 'TC-PRED-011',
    name: 'TC-PRED-011 Low only 01234',
    source: 'SRC-BUILTIN',
    masterNo: '01',
    masterValue: '01234',
    codes: [{ code: '05', type: '저점', description: '저점,저점,저점' }],
    expected: {
      dominantSide: 'low',
      modeDigit: null,
      step2Count: 5,
      step3Count: 0,
    },
  },
  {
    catalogId: 'TC-PRED-012',
    name: 'TC-PRED-012 Formatted input strip',
    source: 'SRC-BUILTIN',
    masterNo: '04',
    masterValue: '14,15 65\n2273',
    codes: [{ code: '14', type: '저점', description: '저점,고점,고점,저점' }],
    expected: {
      dominantSide: 'low',
      step2Count: 6,
      step3Count: 4,
    },
  },
];
