/**
 * Master 00 — 이명전기 STEP2/STEP3 Code · 내용 parity (디컴파일 DetailGrid)
 */
import { describe, it, expect } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { buildLegacyCodeContentRow, buildLegacyStep3CodeContent } from '@/shared/utils/legacyCodeContentEngine';
import {
  LEGACY_MASTER_00_CODE_CONTENT,
  LEGACY_MASTER_00_STEP3_CODE_CONTENT,
} from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import {
  getLegacyStepCodeDefinition,
  LEGACY_STEP2_CODE_ORDER,
  LEGACY_STEP3_CODE_ORDER,
} from '@/shared/fixtures/legacy-step-code-catalog';

function parity(code: string, content: string, expectedMap: Readonly<Record<string, string>>) {
  const expected = expectedMap[code];
  if (!expected) return null;
  const e = expected.split(',');
  const a = content ? content.split(',') : [];
  if (e.length !== a.length) return { code, match: 0, lenE: e.length, lenA: a.length, exact: false };
  let match = 0;
  for (let i = 0; i < e.length; i++) if (e[i] === a[i]) match++;
  return { code, match, lenE: e.length, lenA: a.length, exact: match === e.length };
}

describe('legacy Master 00 parity (decompiled DetailGrid)', () => {
  const result = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);

  it('confirms analysis pipeline sizes', () => {
    expect(LEGACY_MASTER_00_VALUE.length).toBe(1000);
    expect(result.lowCount).toBe(502);
    expect(result.highCount).toBe(498);
  });

  it('STEP2 — 13/13 exact parity', () => {
    const rows = LEGACY_STEP2_CODE_ORDER.map((code) => {
      const def = getLegacyStepCodeDefinition(code, 'low')!;
      const row = buildLegacyCodeContentRow(result.digits, { id: 0, ...def }, 'low');
      return parity(code, row.content, LEGACY_MASTER_00_CODE_CONTENT);
    });
    expect(rows.every((r) => r?.exact)).toBe(true);
  });

  it('STEP3 — 13/13 exact parity', () => {
    const content = buildLegacyStep3CodeContent(result.digits);
    const rows = LEGACY_STEP3_CODE_ORDER.map((code) =>
      parity(code, content[code] ?? '', LEGACY_MASTER_00_STEP3_CODE_CONTENT),
    );
    expect(rows.every((r) => r?.exact)).toBe(true);
  });
});
