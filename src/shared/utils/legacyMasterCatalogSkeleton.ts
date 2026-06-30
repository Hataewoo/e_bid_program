import {
  buildCatalogInputData,
  type CatalogVerificationCase,
  type VerificationImportBundle,
} from './verificationImport';

export const LEGACY_MASTER_SKELETON_VERSION = '2026-06-30';
export const LEGACY_MASTER_SKELETON_COUNT = 100;
export const LEGACY_MASTER_CATALOG_ID_PREFIX = 'TC-LEGACY';

/** Master index 0–99 → `"00"` … `"99"`. */
export function formatLegacyMasterNo(index: number): string {
  const clamped = Math.max(0, Math.min(99, index));
  return String(clamped).padStart(2, '0');
}

/** `"00"` → `TC-LEGACY-000`. */
export function legacyMasterCatalogId(masterNo: string): string {
  const num = parseInt(masterNo.trim(), 10);
  const normalized = Number.isNaN(num) || num < 0 || num > 99 ? 0 : num;
  return `${LEGACY_MASTER_CATALOG_ID_PREFIX}-${String(normalized).padStart(3, '0')}`;
}

const EMPTY_STEP23_EXPECTED = JSON.stringify({ step2: '', step3: '' });

/** One DRAFT case — `masterValue` / expected filled after legacy observation. */
export function buildLegacyMasterSkeletonCase(masterIndex: number): CatalogVerificationCase {
  const masterNo = formatLegacyMasterNo(masterIndex);
  const catalogId = legacyMasterCatalogId(masterNo);
  const meta = {
    catalogId,
    category: 'CAT-BATCH',
    source: 'SRC-LEGACY' as const,
    version: LEGACY_MASTER_SKELETON_VERSION,
  };

  return {
    catalogId,
    name: `${catalogId} Legacy Master ${masterNo} STEP2/3`,
    version: LEGACY_MASTER_SKELETON_VERSION,
    source: 'SRC-LEGACY',
    category: 'CAT-BATCH',
    inputData: buildCatalogInputData(masterNo, '', meta),
    expectedResult: EMPTY_STEP23_EXPECTED,
    legacyEvidence: '',
    observationId: '',
  };
}

export function buildLegacyMasterSkeletonBundle(): VerificationImportBundle {
  return {
    formatVersion: '1.0',
    catalogVersion: LEGACY_MASTER_SKELETON_VERSION,
    source: 'SRC-LEGACY',
    cases: Array.from({ length: LEGACY_MASTER_SKELETON_COUNT }, (_, index) =>
      buildLegacyMasterSkeletonCase(index),
    ),
  };
}

/** CSV placeholder — empty `masterValue` is invalid for CSV import. */
export const LEGACY_MASTER_SKELETON_CSV_PLACEHOLDER = 'TBD';

export function legacyMasterSkeletonToCsv(): string {
  const header =
    'catalogId,name,version,source,category,masterNo,masterValue,step2,step3,statistics,prediction,legacyEvidence,observationId';
  const lines = [
    '# DRAFT skeleton — fill masterValue, step2, step3 from legacy observation before import',
    '# status=DRAFT for all rows; see docs/TEST-CATALOG.md §5.3',
    header,
  ];

  for (let index = 0; index < LEGACY_MASTER_SKELETON_COUNT; index += 1) {
    const masterNo = formatLegacyMasterNo(index);
    const catalogId = legacyMasterCatalogId(masterNo);
    const name = `${catalogId} Legacy Master ${masterNo} STEP2/3`;
    lines.push(
      [
        catalogId,
        name,
        LEGACY_MASTER_SKELETON_VERSION,
        'SRC-LEGACY',
        'CAT-BATCH',
        masterNo,
        LEGACY_MASTER_SKELETON_CSV_PLACEHOLDER,
        '',
        '',
        '',
        '',
        '',
        '',
      ].join(','),
    );
  }

  return `${lines.join('\n')}\n`;
}

/** JSON bundle for committed fixture (import-friendly shape). */
export function legacyMasterSkeletonToImportJson(): string {
  const bundle = {
    formatVersion: '1.0',
    catalogVersion: LEGACY_MASTER_SKELETON_VERSION,
    source: 'SRC-LEGACY',
    description:
      'Master 00-99 STEP2/3 DRAFT skeleton — fill masterValue and expected after legacy observation',
    cases: buildLegacyMasterSkeletonBundle().cases.map((testCase) => {
      let masterNo = '00';
      try {
        const input = JSON.parse(testCase.inputData) as { masterNo?: string };
        masterNo = input.masterNo ?? '00';
      } catch {
        /* keep default */
      }
      return {
        catalogId: testCase.catalogId,
        name: testCase.name,
        version: testCase.version,
        source: testCase.source,
        category: testCase.category,
        masterNo,
        masterValue: '',
        expectedResult: testCase.expectedResult,
        legacyEvidence: testCase.legacyEvidence ?? '',
        observationId: testCase.observationId ?? '',
      };
    }),
  };
  return `${JSON.stringify(bundle, null, 2)}\n`;
}
