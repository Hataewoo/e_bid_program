import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { resolvePatternRecommendationPath } from '@/shared/utils/codeValueFlowEngine';

describe('codeValueFlowEngine digit scoring', () => {
  it('uses S pattern for flow only — not digit 1 when S has repeated 1', () => {
    const result = analyzeMasterValue('00', '0404040404');
    const path = resolvePatternRecommendationPath(result, '');

    const top = Number(
      Object.entries(path.digitScores).sort((a, b) => b[1] - a[1])[0]?.[0],
    );

    expect(top).not.toBe(1);
    expect([0, 4]).toContain(top);
  });

  it('recommends digits that appear in master at matching run flow', () => {
    const result = analyzeMasterValue('00', '000111222');
    const path = resolvePatternRecommendationPath(result, '');

    expect(path.digitReasons.some((line) => line.includes('Master'))).toBe(true);
    const top = Number(
      Object.entries(path.digitScores).sort((a, b) => b[1] - a[1])[0]?.[0],
    );
    expect([0, 1, 2]).toContain(top);
  });
});
