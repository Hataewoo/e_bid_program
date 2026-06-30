import type { ExperimentOutputRow } from '@/types/electron';
import { SUGGESTED_OUTPUT_KEYS } from '../types';

/** Adopted policy: B — Draft proposal (not auto-verified observation). */
export const RESEARCH_OUTPUT_FILL_POLICY = 'draft-proposal' as const;

export type ResearchOutputFillPolicy = typeof RESEARCH_OUTPUT_FILL_POLICY;

export const DRAFT_MEMO_TAG = '[DRAFT:analysis-engine]';

export interface OursOutputDraft {
  policy: ResearchOutputFillPolicy;
  fields: Record<string, string>;
  generatedAt: string;
}

export type DraftFieldPreview = 'match' | 'diff' | 'legacy-only' | 'ours-only' | 'both-empty';

export function isDraftMemo(memo: string | undefined | null): boolean {
  return (memo ?? '').includes(DRAFT_MEMO_TAG);
}

export function appendDraftMemo(memo: string | undefined): string {
  const base = memo?.trim() ?? '';
  if (base.includes(DRAFT_MEMO_TAG)) return base;
  return base ? `${base} | ${DRAFT_MEMO_TAG}` : DRAFT_MEMO_TAG;
}

export function buildOursOutputDraft(fields: Record<string, string>): OursOutputDraft {
  const memo = appendDraftMemo(fields.memo);
  return {
    policy: RESEARCH_OUTPUT_FILL_POLICY,
    fields: { ...fields, memo },
    generatedAt: new Date().toISOString(),
  };
}

export function applyDraftToOursRows(
  rows: ExperimentOutputRow[],
  draft: OursOutputDraft,
): ExperimentOutputRow[] {
  return rows.map((row) => ({
    ...row,
    fieldValue: draft.fields[row.fieldKey] ?? row.fieldValue,
    memo: row.fieldKey === 'memo' ? (draft.fields.memo ?? row.memo) : row.memo,
  }));
}

export function previewDraftField(
  _fieldKey: string,
  legacyValue: string,
  oursValue: string,
): DraftFieldPreview {
  const legacy = legacyValue.trim();
  const ours = oursValue.trim();

  if (!legacy && !ours) return 'both-empty';
  if (legacy && !ours) return 'legacy-only';
  if (!legacy && ours) return 'ours-only';
  return legacy === ours ? 'match' : 'diff';
}

export function previewDraftAgainstLegacy(
  legacyRows: ExperimentOutputRow[],
  oursRows: ExperimentOutputRow[],
): Record<string, DraftFieldPreview> {
  const legacyMap = Object.fromEntries(legacyRows.map((r) => [r.fieldKey, r.fieldValue]));
  const preview: Record<string, DraftFieldPreview> = {};

  for (const key of SUGGESTED_OUTPUT_KEYS) {
    preview[key] = previewDraftField(
      key,
      legacyMap[key] ?? '',
      oursRows.find((r) => r.fieldKey === key)?.fieldValue ?? '',
    );
  }

  return preview;
}

export function rowsHavePendingDraft(oursRows: ExperimentOutputRow[]): boolean {
  return oursRows.some(
    (row) => isDraftMemo(row.memo) || (row.fieldKey === 'memo' && isDraftMemo(row.fieldValue)),
  );
}
