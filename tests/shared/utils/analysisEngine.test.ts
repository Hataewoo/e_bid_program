import { describe, expect, it, vi } from 'vitest';
import {
  analyzeMasterValue,
  buildRuns,
  calcRate,
  createEmptyAnalysisResult,
  extractDigits,
  extractSidePatterns,
  matchCompositePlus,
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

  it('1~2자리 극단 케이스도 안전', () => {
    const result = analyzeMasterValue('02', '3');
    expect(result.totalCount).toBe(1);
    expect(result.lowCount).toBe(1);
    expect(result.highCount).toBe(0);
    expect(result.lowRate).toBe(100);
  });
});

describe('연속 패턴 — threeOrMore / fiveOrMore', () => {
  it('Low 3연속 run 길이 수집', () => {
    const result = analyzeMasterValue('00', '00055');
    expect(result.lowPatterns.threeOrMore).toEqual([3]);
    expect(result.highPatterns.threeOrMore).toEqual([]);
    expect(result.highPatterns.exactTwo).toEqual([2]);
  });

  it('5연속 이상 run 길이 수집', () => {
    const result = analyzeMasterValue('00', '0000055555');
    expect(result.lowPatterns.fiveOrMore).toEqual([5]);
    expect(result.highPatterns.fiveOrMore).toEqual([5]);
  });
});

describe('1 사이 (oneBetween)', () => {
  it('primary 사이 opposite 1개 패턴 인덱스', () => {
    // L L H L L  →  00500 (5=High)
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

describe('복합 패턴 n+α, m', () => {
  it('3+α, 2 — Low 3연속 후 High 2연속', () => {
    const result = analyzeMasterValue('00', '00055');
    expect(result.lowPatterns.plusAlpha_3_2).toEqual([0]);
  });

  it('4+α, 3 — Low 4연속 후 High 3연속', () => {
    const result = analyzeMasterValue('00', '0000555');
    expect(result.lowPatterns.plusAlpha_4_3).toEqual([0]);
  });

  it('문자열 끝에서 incomplete 패턴은 매칭 안 함', () => {
    const digits = '00055';
    const runs = buildRuns(toClassSequence(digits));
    expect(matchCompositePlus(runs, 'low', 3, 2, digits.length)).toEqual([0]);
    expect(matchCompositePlus(runs, 'low', 3, 5, digits.length)).toEqual([]);
  });
});

describe('복합 패턴 n, m+α', () => {
  it('2,3+α — Low 2연속 후 High 3연속 이상', () => {
    const result = analyzeMasterValue('00', '00555');
    expect(result.lowPatterns.commaAlpha_2_3).toEqual([0]);
  });
});

describe('1 중복 / exactTwo', () => {
  it('단일·이중 연속 길이 수집', () => {
    const result = analyzeMasterValue('00', '05067');
    expect(result.lowPatterns.oneDuplicate).toContain(1);
    expect(result.highPatterns.exactTwo).toContain(2);
  });
});

describe('경계조건 — 복합 패턴 방어', () => {
  it('끝에서 incomplete opposite — 3+α,2 미매칭', () => {
    const result = analyzeMasterValue('00', '0005');
    expect(result.lowPatterns.plusAlpha_3_2).toEqual([]);
  });

  it('시작 primary + 끝 incomplete — 미매칭', () => {
    const result = analyzeMasterValue('00', '000');
    expect(result.lowPatterns.plusAlpha_3_2).toEqual([]);
    expect(result.lowPatterns.threeOrMore).toEqual([3]);
  });

  it('null/undefined 입력 안전', () => {
    const result = analyzeMasterValue('05', null as unknown as string);
    expect(result).toEqual(createEmptyAnalysisResult('05'));
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
    const result = analyzeMasterValue('00', '015605');
    const stats = buildCodeValueStats(result, [
      { id: 1, code: '99', type: '저점', description: '1 중복' },
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
