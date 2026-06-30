import { describe, expect, it } from 'vitest';
import legacyMasterSkeletonFixture from '@/shared/fixtures/legacy-master-skeleton-00-99.json';
import {
  buildLegacyMasterSkeletonBundle,
  buildLegacyMasterSkeletonCase,
  formatLegacyMasterNo,
  legacyMasterCatalogId,
  LEGACY_MASTER_SKELETON_COUNT,
  legacyMasterSkeletonToCsv,
} from '@/shared/utils/legacyMasterCatalogSkeleton';
import {
  parseVerificationImportCsv,
  parseVerificationImportJson,
  readCatalogMeta,
} from '@/shared/utils/verificationImport';

describe('legacyMasterCatalogSkeleton', () => {
  it('maps master numbers to catalog ids', () => {
    expect(formatLegacyMasterNo(0)).toBe('00');
    expect(formatLegacyMasterNo(99)).toBe('99');
    expect(legacyMasterCatalogId('00')).toBe('TC-LEGACY-000');
    expect(legacyMasterCatalogId('99')).toBe('TC-LEGACY-099');
  });

  it('builds 100 DRAFT STEP2/3 cases with empty expected placeholders', () => {
    const bundle = buildLegacyMasterSkeletonBundle();
    expect(bundle.cases).toHaveLength(LEGACY_MASTER_SKELETON_COUNT);
    expect(bundle.cases[0]?.catalogId).toBe('TC-LEGACY-000');
    expect(bundle.cases[99]?.catalogId).toBe('TC-LEGACY-099');

    const first = bundle.cases[0]!;
    expect(JSON.parse(first.expectedResult)).toEqual({ step2: '', step3: '' });
    const meta = readCatalogMeta(first.inputData);
    expect(meta?.catalogId).toBe('TC-LEGACY-000');
    expect(meta?.category).toBe('CAT-BATCH');
    expect(meta?.source).toBe('SRC-LEGACY');
  });

  it('round-trips through JSON import parser', () => {
    const bundle = buildLegacyMasterSkeletonBundle();
    const parsed = parseVerificationImportJson(JSON.stringify(bundle));
    expect(parsed).toHaveLength(LEGACY_MASTER_SKELETON_COUNT);
    expect(parsed[42]?.name).toContain('Master 42');
  });

  it('exports CSV with TBD masterValue placeholder', () => {
    const csv = legacyMasterSkeletonToCsv();
    expect(csv).toContain('TC-LEGACY-000');
    expect(csv).toContain('TBD');
    const cases = parseVerificationImportCsv(csv.split('\n').slice(2).join('\n'));
    expect(cases).toHaveLength(LEGACY_MASTER_SKELETON_COUNT);
    expect(JSON.parse(cases[0]!.expectedResult)).toEqual({ step2: '', step3: '' });
  });

  it('committed JSON fixture matches builder catalog ids', () => {
    const built = buildLegacyMasterSkeletonBundle();
    expect(legacyMasterSkeletonFixture.cases).toHaveLength(LEGACY_MASTER_SKELETON_COUNT);
    expect(legacyMasterSkeletonFixture.cases[0]?.catalogId).toBe(built.cases[0]?.catalogId);
    expect(legacyMasterSkeletonFixture.cases[99]?.catalogId).toBe(built.cases[99]?.catalogId);
  });

  it('uses unique catalog ids across the bundle', () => {
    const ids = buildLegacyMasterSkeletonBundle().cases.map((c) => c.catalogId);
    expect(new Set(ids).size).toBe(LEGACY_MASTER_SKELETON_COUNT);
  });

  it('buildLegacyMasterSkeletonCase clamps out-of-range index', () => {
    expect(buildLegacyMasterSkeletonCase(-1).catalogId).toBe('TC-LEGACY-000');
    expect(buildLegacyMasterSkeletonCase(150).catalogId).toBe('TC-LEGACY-099');
  });
});
