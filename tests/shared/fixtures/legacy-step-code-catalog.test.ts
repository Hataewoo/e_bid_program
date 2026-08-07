import { describe, expect, it } from 'vitest';
import {
  isLegacyStep2Code,
  LEGACY_STEP2_CODE_ORDER,
} from '@/shared/fixtures/legacy-step-code-catalog';

describe('legacy-step-code-catalog', () => {
  it('defines exactly 13 STEP2 legacy codes', () => {
    expect(LEGACY_STEP2_CODE_ORDER).toHaveLength(13);
  });

  it('matches 이명전기 STEP2 code list order', () => {
    expect([...LEGACY_STEP2_CODE_ORDER]).toEqual([
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
    ]);
  });

  it('isLegacyStep2Code type guard', () => {
    expect(isLegacyStep2Code('234')).toBe(true);
    expect(isLegacyStep2Code('02')).toBe(false);
  });
});
