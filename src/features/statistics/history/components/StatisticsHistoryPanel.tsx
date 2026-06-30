import { useStatisticsHistory } from '../../hooks/use-statistics-history';
import { useI18n } from '@/i18n/use-i18n';
import { StatisticsHistoryTable } from './StatisticsHistoryTable';
import { StatisticsHistoryPreview } from './StatisticsHistoryPreview';

export function StatisticsHistoryPanel() {
  const { t } = useI18n();
  const { history, selectedHistory, loading, refresh, clear, exportJson, selectHistory } =
    useStatisticsHistory();

  return (
    <div className="flex min-h-[300px] flex-col rounded border border-border bg-surface-elevated shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
          {t('statistics.history.title')}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            className="win-button text-xs"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {t('statistics.panel.refresh')}
          </button>
          <button type="button" className="win-button text-xs" onClick={() => void clear()}>
            {t('statistics.history.clear')}
          </button>
          <button
            type="button"
            className="win-button text-xs"
            onClick={() => void exportJson()}
            disabled={history.length === 0}
          >
            {t('statistics.history.export')}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-content-muted">
            {t('statistics.history.loading')}
          </div>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 flex-col p-2">
              <StatisticsHistoryTable
                items={history}
                selectedId={selectedHistory?.id ?? null}
                onSelect={selectHistory}
              />
            </div>
            <StatisticsHistoryPreview item={selectedHistory} />
          </>
        )}
      </div>
    </div>
  );
}
