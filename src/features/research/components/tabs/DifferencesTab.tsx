import { useI18n } from '@/i18n/use-i18n';
import { useResearchStore } from '../../stores/research-store';
import { DIFF_TYPE_COLORS } from '../../types';

export function DifferencesTab() {
  const { t } = useI18n();
  const selected = useResearchStore((s) => s.selectedExperiment);
  const comparisons = useResearchStore((s) => s.comparisons);
  const runComparison = useResearchStore((s) => s.runComparison);

  if (!selected) {
    return (
      <div className="p-4 text-sm text-content-muted">{t('research.common.selectExperiment')}</div>
    );
  }

  const legacyMap: Record<string, string> = {};
  const oursMap: Record<string, string> = {};
  for (const o of selected.outputs ?? []) {
    if (o.source === 'legacy') legacyMap[o.fieldKey] = o.fieldValue;
    if (o.source === 'ours') oursMap[o.fieldKey] = o.fieldValue;
  }
  const allKeys = [...new Set([...Object.keys(legacyMap), ...Object.keys(oursMap)])];

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('research.differences.title')}</h3>
        <button
          type="button"
          className="win-button win-button-primary text-xs"
          onClick={() => void runComparison()}
        >
          {t('research.differences.runComparison')}
        </button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4 text-xs font-semibold uppercase text-content-muted">
        <div>{t('research.outputs.legacyColumn')}</div>
        <div>{t('research.outputs.oursColumn')}</div>
      </div>
      {allKeys.length === 0 && comparisons.length === 0 && (
        <p className="text-sm text-content-muted">{t('research.differences.noOutputs')}</p>
      )}
      <div className="space-y-2">
        {(comparisons.length > 0
          ? comparisons
          : allKeys.map((k) => ({
              fieldKey: k,
              legacyValue: legacyMap[k] ?? '',
              oursValue: oursMap[k] ?? '',
              isMatch: (legacyMap[k] ?? '') === (oursMap[k] ?? ''),
              diffType: null as string | null,
              diffDetail: null as string | null,
            }))
        ).map((row) => {
          const diffClass = row.diffType ? (DIFF_TYPE_COLORS[row.diffType] ?? '') : '';
          return (
            <div
              key={row.fieldKey}
              className={`rounded border border-border p-2 ${row.isMatch ? '' : 'border-red-300 bg-red-50/50'}`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">{row.fieldKey}</span>
                {row.diffType && (
                  <span className={`rounded px-1.5 py-0.5 text-xs ${diffClass}`}>
                    {row.diffType}
                  </span>
                )}
                {row.isMatch && (
                  <span className="text-xs text-green-600">{t('research.differences.match')}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <pre className="overflow-auto rounded bg-surface-muted p-2 font-mono text-xs">
                  {row.legacyValue || t('research.differences.emptyValue')}
                </pre>
                <pre className="overflow-auto rounded bg-surface-muted p-2 font-mono text-xs">
                  {row.oursValue || t('research.differences.emptyValue')}
                </pre>
              </div>
              {row.diffDetail && (
                <p className="mt-1 text-xs text-content-muted">{row.diffDetail}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
