import { describe, expect, it, vi } from 'vitest';
import {
  analyzeMasterValue,
  buildRuns,
  buildSideBaseSequence,
  calcRate,
  collectPrimaryRunLengths,
  collectValueRunLengths,
  countBetweenMarkerRule,
  createEmptyAnalysisResult,
  extractCodeValuesFromBaseSequence,
  STEP2_CODE_VALUE_RULES,
  STEP3_CODE_VALUE_RULES,
  extractCodeValuesFromClassRunLengths,
  extractDigits,
  extractSidePatterns,
  toClassSequence,
} from '@/shared/utils/analysisEngine';

describe('extractDigits', () => {
  it('숫자만 추출한다', () => {
    expect(extractDigits('14,15 65\n2273')).toBe('1415652273');
  });

  it('빈 입력은 빈 문자열', () => {
    expect(extractDigits('')).toBe('');
    expect(extractDigits('abc')).toBe('');
  });
});

describe('calcRate', () => {
  it('소수점 첫째 자리 비율', () => {
    expect(calcRate(504, 1000)).toBe(50.4);
    expect(calcRate(496, 1000)).toBe(49.6);
  });

  it('0으로 나누기 방어', () => {
    expect(calcRate(0, 0)).toBe(0);
  });
});

describe('analyzeMasterValue — Low/High 분리', () => {
  it('0~4 Low, 5~9 High 비율 계산', () => {
    const result = analyzeMasterValue('00', '0123456789');
    expect(result.totalCount).toBe(10);
    expect(result.lowCount).toBe(5);
    expect(result.highCount).toBe(5);
    expect(result.lowRate).toBe(50);
    expect(result.highRate).toBe(50);
  });

  it('빈 데이터는 0%', () => {
    const result = analyzeMasterValue('01', '');
    expect(result).toEqual(createEmptyAnalysisResult('01'));
    expect(result.lowRate).toBe(0);
    expect(result.highRate).toBe(0);
  });
});

describe('노란색 중간 줄 — 저·고점 교차 run', () => {
  it('buildSideBaseSequence — 필터 문자열 run 인코딩 (Code Value 입력용 유틸)', () => {
    expect(buildSideBaseSequence('1234')).toEqual([1, 2, 3, 4]);
    expect(buildSideBaseSequence('1112233')).toEqual([3, 2, 2]);
  });

  it('00055 — 노란 줄 = 저·고 교차 run 길이', () => {
    const result = analyzeMasterValue('00', '00055');
    expect(result.lowRunLengths).toEqual([3]);
    expect(result.highRunLengths).toEqual([2]);
    expect(result.lowPatterns.oneDuplicate).toEqual([]);
    expect(result.highPatterns.oneDuplicate).toEqual([]);
  });

  it('0505 — 교차형 L-H-L-H', () => {
    const result = analyzeMasterValue('00', '0505');
    expect(result.lowRunLengths).toEqual([1, 1]);
    expect(result.highRunLengths).toEqual([1, 1]);
  });

  it('001122 — 저점만 이어지면 run 1개', () => {
    const result = analyzeMasterValue('00', '001122');
    expect(result.lowRunLengths).toEqual([6]);
    expect(result.highRunLengths).toEqual([]);
  });

  it('collectPrimaryRunLengths', () => {
    const runs = buildRuns(toClassSequence('00055'));
    expect(collectPrimaryRunLengths(runs, 'low')).toEqual([3]);
    expect(collectPrimaryRunLengths(runs, 'high')).toEqual([2]);
  });

  it('Code Values — 노란 줄 S에서 1 중복 파생', () => {
    const yellow = [1, 2, 1, 1, 1, 3, 2];
    expect(collectValueRunLengths(yellow, 1)).toEqual([1, 3]);
  });

  it('extractCodeValuesFromBaseSequence — 이명전기 10패턴 (S 기반)', () => {
    const p = extractCodeValuesFromBaseSequence([1, 3, 2], 'low');
    expect(p.oneDuplicate).toEqual([1]);
    expect(p.threeOrMore).toEqual([3]);
    expect(p.commaAlpha_2_3).toEqual([1]);
    expect(p.oneBetween).toEqual([]);
    expect(p.alphaPlus_3_2).toEqual([]);
  });

  it('이명전기 패턴 — 1 사이 · 3+α,2 · 4+α,3', () => {
    const yellow = [1, 2, 1, 1, 1, 3, 2, 4, 1, 3, 1, 1];
    expect(countBetweenMarkerRule(yellow, { countMin: 2, markerExact: 1, pairsOnly: true })).toEqual([1, 3, 1]);
    expect(countBetweenMarkerRule(yellow, { countMin: 3, countMax: 9, markerExact: 2, pairsOnly: true })).toEqual([
      1,
    ]);

    const block = [3, 1, 2, 5, 1, 4, 3, 2, 4, 3];
    expect(countBetweenMarkerRule(block, { countMin: 3, countMax: 9, markerExact: 2, pairsOnly: true })).toEqual([3]);
    expect(countBetweenMarkerRule(block, { countMin: 4, countMax: 9, markerExact: 3, pairsOnly: true })).toEqual([2, 1]);
  });

  it('2,3+α — 3~9 사이 2 개수', () => {
    expect(countBetweenMarkerRule([2, 3, 2, 4, 2], { countExact: 2, markerMin: 3, markerMax: 9 })).toEqual([
      1, 1, 1,
    ]);
    expect(countBetweenMarkerRule([1, 2, 3, 2], { countExact: 2, markerMin: 3, markerMax: 9 })).toEqual([1, 1]);
  });

  it('5+α,4 — 4와 4 사이 5~9 개수', () => {
    expect(
      countBetweenMarkerRule([5, 4, 6, 7, 4, 8], {
        countMin: 5,
        countMax: 9,
        markerExact: 4,
        pairsOnly: true,
      }),
    ).toEqual([2]);
  });

  it('extractCodeValuesFromClassRunLengths — 하위 호환', () => {
    const p = extractCodeValuesFromClassRunLengths([1, 3, 2]);
    expect(p.oneDuplicate).toEqual([1]);
  });
});

describe('STEP3 — highRunLengths S (STEP2와 동일 10패턴)', () => {
  it('① 1 중복 · ⑥ 3 이상 · ⑦ 5 이상', () => {
    const p = extractCodeValuesFromBaseSequence([1, 1, 1, 3, 5, 7], 'high');
    expect(p.oneDuplicate).toEqual([3]);
    expect(p.threeOrMore).toEqual([3, 5, 7]);
    expect(p.fiveOrMore).toEqual([5, 7]);
  });

  it('② 2,3+α — 3~9 사이 2', () => {
    expect(
      countBetweenMarkerRule([6, 7, 6], STEP3_CODE_VALUE_RULES.between.commaAlpha_2_3),
    ).toEqual([]);
  });

  it('STEP2와 동일 규칙 객체', () => {
    expect(STEP3_CODE_VALUE_RULES).toBe(STEP2_CODE_VALUE_RULES);
  });

  it('③~⑤ α 패턴 — STEP2와 동일 계산', () => {
    const yellow = [1, 3, 2, 4, 5, 4, 6, 4];
    expect(extractCodeValuesFromBaseSequence(yellow, 'low')).toEqual(
      extractCodeValuesFromBaseSequence(yellow, 'high'),
    );
  });

  it('analyzeMasterValue — STEP3는 highRunLengths S로 Code Values 계산', () => {
    const result = analyzeMasterValue('00', '555505555');
    expect(result.highRunLengths.length).toBeGreaterThan(0);
    expect(result.highPatterns).toEqual(
      extractCodeValuesFromBaseSequence(result.highRunLengths, 'high'),
    );
  });
});

describe('1 사이 (oneBetween) — prediction/디버그', () => {
  it('primary 사이 opposite 1개 패턴 인덱스 (run 기준)', () => {
    const digits = '00500';
    const runs = buildRuns(toClassSequence(digits));
    const low = extractSidePatterns(runs, 'low', digits.length, digits);
    expect(low.oneBetween).toEqual([2]);
  });

  it('analyzeMasterValue — Code Values는 노란 줄 S에서 파생', () => {
    const result = analyzeMasterValue('00', '00500');
    expect(result.lowRunLengths).toEqual([2, 2]);
    expect(result.lowPatterns.oneBetween).toEqual([]);
  });
});

describe('buildCodeValueStats — Code 매칭', () => {
  it('패턴 라벨(1 중복) = 노란 줄 S에서 1 run 개수', async () => {
    const { buildCodeValueStats } = await import('@/shared/utils/analysisEngine');
    const result = analyzeMasterValue('00', '051050');
    const stats = buildCodeValueStats(result, [
      { id: 1, code: '99', type: '저점', description: '1 중복' },
    ]);
    expect(stats[0]?.count).toBe(2);
    expect(stats[0]?.matchKind).toBe('pattern');
  });

  it('digit 시퀀스(저점,저점) 매칭 카운트', async () => {
    const { buildCodeValueStats } = await import('@/shared/utils/analysisEngine');
    const result = analyzeMasterValue('00', '001122');
    const stats = buildCodeValueStats(result, [
      { id: 1, code: '01', type: '저점', description: '저점,저점' },
    ]);
    expect(stats[0]?.matchKind).toBe('sequence');
    expect(stats[0]?.count).toBe(5);
  });
});

describe('collectPatternMatchStartIndices / logMatchingDetails', () => {
  it('3 이상 패턴 시작 인덱스를 반환한다', async () => {
    const { collectPatternMatchStartIndices } = await import('@/shared/utils/analysisEngine');
    const result = analyzeMasterValue('00', '000123');
    const indices = collectPatternMatchStartIndices(result, 'low', 'threeOrMore');
    expect(indices).toEqual([0]);
  });

  it('logMatchingDetails는 예외 없이 실행된다', async () => {
    const { logMatchingDetails } = await import('@/shared/utils/analysisEngine');
    const spy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const result = analyzeMasterValue('00', '0123456789');
    expect(() => logMatchingDetails(result)).not.toThrow();

    spy.mockRestore();
    logSpy.mockRestore();
    endSpy.mockRestore();
  });
});

describe('대량 문자열 성능·안정성', () => {
  it('1000자 문자열도 오류 없이 분석', () => {
    const digits = '1415652273'.repeat(100).slice(0, 1000);
    const result = analyzeMasterValue('00', digits);
    expect(result.totalCount).toBe(1000);
    expect(result.lowRate + result.highRate).toBeCloseTo(100, 0);
  });
});
