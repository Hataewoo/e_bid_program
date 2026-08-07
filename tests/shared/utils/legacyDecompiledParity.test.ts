/**
 * E-Myoung.exe 디컴파일 알고리즘 — STEP2/STEP3 parity
 */
import { describe, it, expect } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  buildLegacyStep2BandBundle,
  buildLegacyStep2CodeContent,
  buildLegacyStep3BandBundle,
  buildLegacyStep3CodeContent,
  LEGACY_CODE_CONTENT_ENGINE_VERSION,
} from '@/shared/utils/legacyCodeContentEngine';
import {
  LEGACY_MASTER_00_CODE_CONTENT,
  LEGACY_MASTER_00_STEP3_CODE_CONTENT,
} from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import {
  LEGACY_STEP2_CODE_ORDER,
  LEGACY_STEP3_CODE_ORDER,
} from '@/shared/fixtures/legacy-step-code-catalog';

describe('decompiled E-Myoung algorithm parity', () => {
  const digits = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE).digits;

  it('STEP2 — 13/13 codes exact for Master 00', () => {
    expect(LEGACY_CODE_CONTENT_ENGINE_VERSION).toBe('emyoung-decompiled-v2');
    const content = buildLegacyStep2CodeContent(digits);
    let exact = 0;
    for (const code of LEGACY_STEP2_CODE_ORDER) {
      if (content[code] === LEGACY_MASTER_00_CODE_CONTENT[code]) exact += 1;
    }
    expect(exact).toBe(13);
  });

  it('STEP3 — 13/13 codes exact for Master 00', () => {
    const content = buildLegacyStep3CodeContent(digits);
    let exact = 0;
    for (const code of LEGACY_STEP3_CODE_ORDER) {
      if (content[code] === LEGACY_MASTER_00_STEP3_CODE_CONTENT[code]) exact += 1;
    }
    expect(exact).toBe(13);
  });

  it('STEP2 band bundle — Low PV + Point Values sub-splits', () => {
    const bundle = buildLegacyStep2BandBundle(digits);
    expect(bundle.detailDigits.length).toBe(502);
    expect(bundle.pointLowLow.gaps.length).toBeGreaterThan(0);
    expect(bundle.pointLowHigh.gaps.length).toBeGreaterThan(0);
    expect(bundle.pointLowLow.patternGrid).toHaveLength(10);
    expect(bundle.masterCountLow.length).toBeGreaterThan(0);
    expect(bundle.masterCountHigh.length).toBeGreaterThan(0);
  });

  it('STEP3 band bundle — High PV + Point Values sub-splits', () => {
    const bundle = buildLegacyStep3BandBundle(digits);
    expect(bundle.detailDigits.length).toBe(498);
    expect(bundle.pointHighLow.gaps.length).toBeGreaterThan(0);
    expect(bundle.pointHighHigh.gaps.length).toBeGreaterThan(0);
    expect(bundle.pointHighHigh.patternGrid).toHaveLength(10);
  });
});
