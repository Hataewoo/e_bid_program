import { describe, expect, it } from 'vitest';
import {
  applyVerificationImportPlan,
  buildCatalogInputData,
  buildVerificationExportBundle,
  catalogBundleToCsv,
  extractCatalogId,
  parseVerificationImportCsv,
  parseVerificationImportJson,
  planVerificationImport,
  readCatalogMeta,
} from '@/shared/utils/verificationImport';
import type { Verification } from '@/types/electron';

describe('verificationImport', () => {
  it('extracts catalog id from name', () => {
    expect(extractCatalogId('TC-STEP2-010 Legacy Master 01')).toBe('TC-STEP2-010');
  });

  it('parses JSON bundle with catalog metadata in inputData', () => {
    const raw = JSON.stringify({
      formatVersion: '1.0',
      catalogVersion: '2026-06-30',
      cases: [
        {
          catalogId: 'TC-STEP2-010',
          name: 'TC-STEP2-010 Legacy',
          source: 'SRC-LEGACY',
          category: 'CAT-STEP2',
          masterNo: '01',
          masterValue: '0123456789',
          expectedResult: '{"step2":"01234","step3":"56789"}',
        },
      ],
    });

    const cases = parseVerificationImportJson(raw);
    expect(cases).toHaveLength(1);
    expect(cases[0]?.catalogId).toBe('TC-STEP2-010');

    const meta = readCatalogMeta(cases[0]!.inputData);
    expect(meta?.catalogId).toBe('TC-STEP2-010');
    expect(meta?.source).toBe('SRC-LEGACY');
  });

  it('parses regression fixture shape (input/expected)', () => {
    const raw = JSON.stringify([
      {
        name: 'STEP2/3 — digits 0-9',
        input: { masterNo: '00', masterValue: '0123456789' },
        expected: { step2: '01234', step3: '56789' },
      },
    ]);
    const cases = parseVerificationImportJson(raw);
    expect(cases).toHaveLength(1);
    expect(JSON.parse(cases[0]!.expectedResult)).toMatchObject({ step2: '01234' });
  });

  it('parses CSV with empty step2/step3 columns (DRAFT skeleton)', () => {
    const csv = `catalogId,name,masterNo,masterValue,step2,step3
TC-LEGACY-000,TC-LEGACY-000 Test,00,TBD,,`;

    const cases = parseVerificationImportCsv(csv);
    expect(cases).toHaveLength(1);
    expect(JSON.parse(cases[0]!.expectedResult)).toEqual({ step2: '', step3: '' });
  });

  it('parses CSV with step2/step3 columns', () => {
    const csv = `catalogId,name,masterNo,masterValue,step2,step3
TC-STEP2-011,TC-STEP2-011 Test,02,56789,,56789`;

    const cases = parseVerificationImportCsv(csv);
    expect(cases).toHaveLength(1);
    expect(JSON.parse(cases[0]!.expectedResult)).toMatchObject({ step3: '56789' });
  });

  it('plans skip vs update by catalog id', () => {
    const existing: Verification[] = [
      {
        id: 5,
        name: 'TC-STEP2-010 Legacy',
        inputData: buildCatalogInputData('01', '0', { catalogId: 'TC-STEP2-010' }),
        expectedResult: '{}',
        experimentId: null,
        hypothesisId: null,
        actualResult: null,
        passed: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const incoming = parseVerificationImportJson(
      JSON.stringify([
        {
          catalogId: 'TC-STEP2-010',
          name: 'TC-STEP2-010 updated',
          masterNo: '01',
          masterValue: '0123456789',
          expectedResult: '{"step2":"01234"}',
        },
        {
          catalogId: 'TC-STAT-020',
          name: 'TC-STAT-020 new',
          masterNo: '05',
          masterValue: '0123456789',
          expectedResult: '{"statistics":"x"}',
        },
      ]),
    );

    const skipPlan = planVerificationImport(existing, incoming, 'skip');
    expect(skipPlan.toCreate).toHaveLength(1);
    expect(skipPlan.skipped).toHaveLength(1);

    const updatePlan = planVerificationImport(existing, incoming, 'update');
    expect(updatePlan.toUpdate).toHaveLength(1);
    expect(updatePlan.toUpdate[0]?.existingId).toBe(5);
    expect(updatePlan.toCreate).toHaveLength(1);
  });

  it('exports catalog bundle to CSV', () => {
    const bundle = buildVerificationExportBundle([
      {
        id: 1,
        name: 'TC-STEP2-010 Legacy',
        inputData: buildCatalogInputData('01', '0123456789', {
          catalogId: 'TC-STEP2-010',
          source: 'SRC-LEGACY',
        }),
        expectedResult: '{"step2":"01234"}',
        experimentId: null,
        hypothesisId: null,
        actualResult: null,
        passed: null,
        createdAt: '',
        updatedAt: '',
      },
    ]);

    const csv = catalogBundleToCsv(bundle);
    expect(csv).toContain('catalogId');
    expect(csv).toContain('TC-STEP2-010');
  });

  it('applyVerificationImportPlan calls save for creates', async () => {
    const saved: Array<{ id?: number | null; name: string }> = [];
    const plan = planVerificationImport(
      [],
      parseVerificationImportJson(
        JSON.stringify([
          {
            name: 'TC-EDGE-001 Test',
            masterNo: '04',
            masterValue: '1234',
            expectedResult: '{"step2":"1234"}',
          },
        ]),
      ),
      'skip',
    );

    const result = await applyVerificationImportPlan(plan, async (input) => {
      saved.push({ id: input.id, name: input.name });
    });

    expect(result.created).toBe(1);
    expect(saved).toHaveLength(1);
  });
});
