import { describe, expect, it, vi } from 'vitest';
import {
  analyzeMasterValue,
  buildRuns,
  buildSidePatternSequence,
  calcRate,
  createEmptyAnalysisResult,
  extractDigits,
  extractSidePatterns,
  matchCompositePlus,
  toClassSequence,
} from '@/shared/utils/analysisEngine';
import {
  collectPrimaryRunLengths,
  extractCodeValuesFromBaseSequence,
} from '@/shared/utils/codeValueSubAnalysis';

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

  it('1~2자리 극단 케이스도 안전', () => {
    const result = analyzeMasterValue('02', '3');
    expect(result.totalCount).toBe(1);
    expect(result.lowCount).toBe(1);
    expect(result.highCount).toBe(0);
    expect(result.lowRate).toBe(100);
  });
});

describe('S 시퀀스 — L/H run 길이', () => {
  it('00055 → 저점 S=[3], 고점 S=[2]', () => {
    const result = analyzeMasterValue('00', '00055');
    expect(result.lowRunLengths).toEqual([3]);
    expect(result.highRunLengths).toEqual([2]);
  });

  it('교차형 1819281938 → 저1·고1 반복 S', () => {
    const result = analyzeMasterValue('00', '1819281938');
    expect(result.lowRunLengths).toEqual([1, 1, 1, 1, 1]);
    expect(result.highRunLengths).toEqual([1, 1, 1, 1, 1]);
  });
});

describe('Code Value — threeOrMore / fiveOrMore (S=L/H run 길이)', () => {
  it('Low 3연속 run → S=[3], threeOrMore=[3]', () => {
    const result = analyzeMasterValue('00', '00055');
    expect(result.lowPatterns.threeOrMore).toEqual([3]);
    expect(result.highPatterns.threeOrMore).toEqual([]);
  });

  it('5연속 run → S=[5], fiveOrMore=[5]', () => {
    const result = analyzeMasterValue('00', '0000055555');
    expect(result.lowPatterns.fiveOrMore).toEqual([5]);
    expect(result.highPatterns.fiveOrMore).toEqual([5]);
  });
});

describe('run 기반 extractSidePatterns — oneBetween', () => {
  it('primary 사이 opposite 1개 패턴 인덱스', () => {
    const digits = '00500';
    const runs = buildRuns(toClassSequence(digits));
    const low = extractSidePatterns(runs, 'low', digits.length);
    expect(low.oneBetween).toEqual([2]);
  });

  it('경계(시작/끝)에서 undefined 없이 동작', () => {
    const result = analyzeMasterValue('00', '50000');
    expect(result.highPatterns.oneBetween).toEqual([]);
  });
});

describe('run 기반 복합 패턴 n+α, m', () => {
  it('3+α, 2 — Low 3연속 후 High 2연속', () => {
    const digits = '00055';
    const runs = buildRuns(toClassSequence(digits));
    expect(extractSidePatterns(runs, 'low', digits.length).plusAlpha_3_2).toEqual([0]);
  });

  it('4+α, 3 — Low 4연속 후 High 3연속', () => {
    const digits = '0000555';
    const runs = buildRuns(toClassSequence(digits));
    expect(extractSidePatterns(runs, 'low', digits.length).plusAlpha_4_3).toEqual([0]);
  });

  it('문자열 끝에서 incomplete 패턴은 매칭 안 함', () => {
    const digits = '00055';
    const runs = buildRuns(toClassSequence(digits));
    expect(matchCompositePlus(runs, 'low', 3, 2, digits.length)).toEqual([0]);
    expect(matchCompositePlus(runs, 'low', 3, 5, digits.length)).toEqual([]);
  });
});

describe('Code Value — between-marker 규칙 (S 기준)', () => {
  it('2, 3+α — S에서 3~9 사이 2 개수', () => {
    const patterns = extractCodeValuesFromBaseSequence([3, 2, 2, 4, 2, 5], 'low');
    expect(patterns.commaAlpha_2_3).toEqual([2, 1]);
  });
});

describe('Code Value — 1 중복 (S에서 value=1 run)', () => {
  it('S에서 1 연속 run 길이 수집', () => {
    const patterns = extractCodeValuesFromBaseSequence([1, 1, 1, 3, 2, 1], 'low');
    expect(patterns.oneDuplicate).toEqual([3, 1]);
  });

  it('교차형 Master → S에 1 포함, oneDuplicate 산출', () => {
    const result = analyzeMasterValue('00', '50505');
    expect(result.lowRunLengths).toEqual([1, 1]);
    expect(result.highRunLengths).toEqual([1, 1, 1]);
    expect(result.highPatterns.oneDuplicate).toEqual([3]);
  });
});

describe('경계조건 — 복합 패턴 방어', () => {
  it('null/undefined 입력 안전', () => {
    const result = analyzeMasterValue('05', null as unknown as string);
    expect(result).toEqual(createEmptyAnalysisResult('05'));
  });
});

describe('buildSidePatternSequence', () => {
  it('runs에서 side별 S 추출', () => {
    const runs = buildRuns(toClassSequence('00055'));
    expect(buildSidePatternSequence(runs, 'low')).toEqual([3]);
    expect(collectPrimaryRunLengths(runs, 'high')).toEqual([2]);
  });
});

describe('analyzeMasterValueCached', () => {
  it('동일 입력은 캐시에서 반환', async () => {
    const { analyzeMasterValueCached, clearAnalysisCache, getAnalysisCacheSize } =
      await import('@/shared/utils/analysisCache');
    clearAnalysisCache();
    const a = analyzeMasterValueCached('00', '0123456789');
    const b = analyzeMasterValueCached('00', '0123456789');
    expect(a).toBe(b);
    expect(getAnalysisCacheSize()).toBe(1);
    clearAnalysisCache();
  });

  it('마스터 값 변경 시 별도 캐시', async () => {
    const { analyzeMasterValueCached, clearAnalysisCache, invalidateAnalysisCacheForMaster } =
      await import('@/shared/utils/analysisCache');
    clearAnalysisCache();
    analyzeMasterValueCached('01', '111');
    analyzeMasterValueCached('01', '222');
    invalidateAnalysisCacheForMaster('01');
    analyzeMasterValueCached('01', '111');
    clearAnalysisCache();
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
describe('buildCodeValueStats — Code 매칭', () => {
  it('패턴 라벨(1 중복) 매칭 카운트', async () => {
    const { buildCodeValueStats } = await import('@/shared/utils/analysisEngine');
    const result = analyzeMasterValue('00', '50505');
    const stats = buildCodeValueStats(result, [
      { id: 1, code: '99', type: '고점', description: '1 중복' },
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0]?.count).toBeGreaterThan(0);
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

  it('Code 목록이 비어 있으면 빈 배열', async () => {
    const { buildCodeValueStats } = await import('@/shared/utils/analysisEngine');
    const result = analyzeMasterValue('00', '0123');
    expect(buildCodeValueStats(result, [])).toEqual([]);
  });

  it('백분율 합계는 100%', async () => {
    const { buildCodeValueStats } = await import('@/shared/utils/analysisEngine');
    const result = analyzeMasterValue('00', '00112255');
    const stats = buildCodeValueStats(result, [
      { id: 1, code: '01', type: '저점', description: '저점,저점' },
      { id: 2, code: '02', type: '저점', description: '저점,고점' },
    ]);
    const totalPercent = stats.reduce((sum, row) => sum + row.percent, 0);
    expect(totalPercent).toBeCloseTo(100, 0);
    expect(stats.some((r) => r.count > 0)).toBe(true);
  });
});

describe('대량 문자열 성능·안정성', () => {
  it('1000자 문자열도 오류 없이 분석', () => {
    const digits = '1415652273'.repeat(100).slice(0, 1000);
    const result = analyzeMasterValue('00', digits);
    expect(result.totalCount).toBe(1000);
    expect(result.lowRate + result.highRate).toBeCloseTo(100, 0);
    expect(Number.isFinite(result.lowRate)).toBe(true);
  });
});
