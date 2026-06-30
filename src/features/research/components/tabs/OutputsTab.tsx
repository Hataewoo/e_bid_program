import { useEffect, useMemo, useState } from 'react';
import { useResearchStore } from '../../stores/research-store';
import { SUGGESTED_OUTPUT_KEYS } from '../../types';
import { buildOursOutputsDraftFromAnalysis } from '../../services/fill-outputs-from-analysis';
import { ResearchOutputDraftBanner } from '../ResearchOutputDraftBanner';
import {
  applyDraftToOursRows,
  previewDraftAgainstLegacy,
  rowsHavePendingDraft,
  type DraftFieldPreview,
} from '../../constants/outputFillPolicy';
import { useI18n } from '@/i18n/use-i18n';
import type { ExperimentOutputRow } from '@/types/electron';

function toRows(outputs: ExperimentOutputRow[] | undefined, source: string): ExperimentOutputRow[] {
  const filtered = (outputs ?? []).filter((o) => o.source === source);
  if (filtered.length === 0) {
    return SUGGESTED_OUTPUT_KEYS.map((k) => ({ source, fieldKey: k, fieldValue: '', memo: '' }));
  }
  return filtered.map((o) => ({
    source,
    fieldKey: o.fieldKey,
    fieldValue: o.fieldValue,
    memo: o.memo ?? '',
  }));
}

const PREVIEW_CLASS: Record<DraftFieldPreview, string> = {
  match: 'text-green-700',
  diff: 'text-orange-700',
  'legacy-only': 'text-amber-700',
  'ours-only': 'text-purple-700',
  'both-empty': 'text-content-muted',
};

export function OutputsTab() {
  const { t } = useI18n();
  const selected = useResearchStore((s) => s.selectedExperiment);
  const saveOutputs = useResearchStore((s) => s.saveOutputs);
  const [legacyRows, setLegacyRows] = useState<ExperimentOutputRow[]>([]);
  const [oursRows, setOursRows] = useState<ExperimentOutputRow[]>([]);
  const [savedOursRows, setSavedOursRows] = useState<ExperimentOutputRow[]>([]);
  const [fillMessage, setFillMessage] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [draftPending, setDraftPending] = useState(false);

  useEffect(() => {
    const legacy = toRows(selected?.outputs, 'legacy');
    const ours = toRows(selected?.outputs, 'ours');
    setLegacyRows(legacy);
    setOursRows(ours);
    setSavedOursRows(ours);
    setDraftPending(rowsHavePendingDraft(ours));
    setFillMessage(null);
  }, [selected?.id, selected?.outputs]);

  const draftPreview = useMemo(
    () => (draftPending ? previewDraftAgainstLegacy(legacyRows, oursRows) : null),
    [draftPending, legacyRows, oursRows],
  );

  if (!selected) {
    return (
      <div className="p-4 text-sm text-content-muted">{t('research.outputs.selectExperiment')}</div>
    );
  }

  const updateLegacy = (idx: number, fieldValue: string) => {
    setLegacyRows(legacyRows.map((r, i) => (i === idx ? { ...r, fieldValue } : r)));
  };

  const updateOurs = (idx: number, fieldValue: string) => {
    setDraftPending(false);
    setOursRows(oursRows.map((r, i) => (i === idx ? { ...r, fieldValue } : r)));
  };

  const handleSave = () => {
    void (async () => {
      await saveOutputs([...legacyRows, ...oursRows]);
      setSavedOursRows(oursRows);
      setDraftPending(false);
      setFillMessage(t('research.outputs.saved'));
    })();
  };

  const handleFillDraft = async () => {
    setFilling(true);
    setFillMessage(null);
    try {
      const inputs = selected.inputs ?? [];
      const draft = await buildOursOutputsDraftFromAnalysis(inputs);
      const nextRows = applyDraftToOursRows(oursRows, draft);
      setOursRows(nextRows);
      setDraftPending(true);
      setFillMessage(t('research.fillOutputsDraftApplied'));
    } catch {
      setFillMessage(t('research.fillOutputsError'));
    } finally {
      setFilling(false);
    }
  };

  const handleClearDraft = () => {
    setOursRows(savedOursRows);
    setDraftPending(false);
    setFillMessage(t('research.fillOutputsDraftCleared'));
  };

  const previewLabel = (preview: DraftFieldPreview): string => {
    switch (preview) {
      case 'match':
        return t('research.outputPolicy.previewMatch');
      case 'diff':
        return t('research.outputPolicy.previewDiff');
      case 'legacy-only':
        return t('research.outputPolicy.previewLegacyOnly');
      case 'ours-only':
        return t('research.outputPolicy.previewOursOnly');
      default:
        return '';
    }
  };

  const renderColumn = (
    title: string,
    rows: ExperimentOutputRow[],
    onChange: (idx: number, val: string) => void,
    showPreview: boolean,
  ) => (
    <div className="flex-1">
      <h4 className="mb-2 text-xs font-semibold uppercase text-content-muted">{title}</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-content-muted">
            <th className="pb-2 pr-2">{t('research.outputs.fieldColumn')}</th>
            <th className="pb-2">{t('research.outputs.valueColumn')}</th>
            {showPreview ? (
              <th className="pb-2 pl-2">{t('research.outputPolicy.previewColumn')}</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const preview = showPreview ? draftPreview?.[row.fieldKey] : null;
            const isDraftRow = draftPending && row.source === 'ours';
            return (
              <tr key={row.fieldKey} className="border-b border-border">
                <td className="py-1 pr-2 font-mono text-xs">{row.fieldKey}</td>
                <td className="py-1">
                  <input
                    className={`win-input w-full font-mono text-xs ${isDraftRow ? 'border-amber-400 bg-amber-50/50' : ''}`}
                    value={row.fieldValue}
                    onChange={(e) => onChange(idx, e.target.value)}
                    placeholder={t('research.outputs.valuePlaceholder')}
                  />
                </td>
                {showPreview ? (
                  <td className={`py-1 pl-2 text-[10px] ${preview ? PREVIEW_CLASS[preview] : ''}`}>
                    {preview && preview !== 'both-empty' ? previewLabel(preview) : ''}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <ResearchOutputDraftBanner className="mb-3" />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t('research.outputs.title')}</h3>
          <p className="text-[10px] text-content-muted">{t('research.outputPolicy.policyBadge')}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="win-button text-xs"
            onClick={() => void handleFillDraft()}
            disabled={filling}
            title={t('research.fillOutputsHint')}
          >
            {t('research.fillOutputs')}
          </button>
          {draftPending ? (
            <button type="button" className="win-button text-xs" onClick={handleClearDraft}>
              {t('research.fillOutputsClearDraft')}
            </button>
          ) : null}
          <button
            type="button"
            className="win-button win-button-primary text-xs"
            onClick={handleSave}
          >
            {t('research.outputs.save')}
          </button>
        </div>
      </div>

      <p className="mb-2 text-xs text-content-muted">{t('research.outputs.description')}</p>
      {draftPending ? (
        <p className="mb-2 text-xs font-medium text-amber-800">
          {t('research.fillOutputsDraftPending')}
        </p>
      ) : null}
      {fillMessage ? <p className="mb-2 text-xs text-content-muted">{fillMessage}</p> : null}

      <div className="flex gap-6">
        {renderColumn(t('research.outputs.legacyColumn'), legacyRows, updateLegacy, false)}
        {renderColumn(t('research.outputs.oursColumn'), oursRows, updateOurs, draftPending)}
      </div>
    </div>
  );
}
