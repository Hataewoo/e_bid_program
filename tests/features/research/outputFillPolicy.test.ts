import { describe, expect, it } from 'vitest';
import {
  appendDraftMemo,
  applyDraftToOursRows,
  buildOursOutputDraft,
  DRAFT_MEMO_TAG,
  isDraftMemo,
  previewDraftAgainstLegacy,
  previewDraftField,
  RESEARCH_OUTPUT_FILL_POLICY,
  rowsHavePendingDraft,
} from '@/features/research/constants/outputFillPolicy';

describe('research output fill policy (B — draft proposal)', () => {
  it('uses draft-proposal policy constant', () => {
    expect(RESEARCH_OUTPUT_FILL_POLICY).toBe('draft-proposal');
  });

  it('tags memo with draft marker', () => {
    expect(appendDraftMemo('')).toBe(DRAFT_MEMO_TAG);
    expect(appendDraftMemo('note')).toBe(`note | ${DRAFT_MEMO_TAG}`);
    expect(isDraftMemo(appendDraftMemo('x'))).toBe(true);
  });

  it('builds draft without duplicating memo tag', () => {
    const draft = buildOursOutputDraft({
      step2: '01234',
      step3: '56789',
      statistics: 'n=10',
      prediction: '01',
      memo: 'test',
    });
    expect(draft.policy).toBe('draft-proposal');
    expect(draft.fields.memo).toContain(DRAFT_MEMO_TAG);
    expect(draft.generatedAt).toBeTruthy();
  });

  it('applies draft to ours rows and previews legacy diff', () => {
    const legacy = [
      { source: 'legacy', fieldKey: 'step2', fieldValue: '01234', memo: '' },
      { source: 'legacy', fieldKey: 'step3', fieldValue: '99999', memo: '' },
      { source: 'legacy', fieldKey: 'statistics', fieldValue: '', memo: '' },
      { source: 'legacy', fieldKey: 'prediction', fieldValue: '', memo: '' },
      { source: 'legacy', fieldKey: 'memo', fieldValue: '', memo: '' },
    ];
    const ours = legacy.map((r) => ({ ...r, source: 'ours', fieldValue: '' }));
    const draft = buildOursOutputDraft({
      step2: '01234',
      step3: '56789',
      statistics: 'n=10',
      prediction: '01',
      memo: 'engine',
    });
    const applied = applyDraftToOursRows(ours, draft);
    expect(rowsHavePendingDraft(applied)).toBe(true);

    const preview = previewDraftAgainstLegacy(legacy, applied);
    expect(preview.step2).toBe('match');
    expect(preview.step3).toBe('diff');
    expect(preview.statistics).toBe('ours-only');
    expect(previewDraftField('step2', '01234', '01234')).toBe('match');
  });
});
