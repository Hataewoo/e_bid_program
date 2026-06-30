import { useLowHighRatio } from '../../hooks/use-low-high-ratio';
import { useI18n } from '@/i18n/use-i18n';
import { LowHighStackedChart } from '../charts/LowHighStackedChart';
import { RatioCard } from './RatioCard';
import { RatioSummary } from './RatioSummary';

export function LowHighRatioPanel() {
  const { t } = useI18n();
  const { selectedMaster, lowHighRatio, loading, hasData, showNoData, refresh, copyJson } =
    useLowHighRatio();

  return (
    <div className="flex min-h-[280px] flex-col rounded border border-border bg-surface-elevated shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
          {t('statistics.panel.lowHigh')}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            className="win-button text-xs"
            onClick={() => void refresh()}
            disabled={loading || !selectedMaster}
          >
            {t('statistics.panel.refresh')}
          </button>
          <button
            type="button"
            className="win-button text-xs"
            onClick={() => void copyJson()}
            disabled={!hasData}
          >
            {t('statistics.panel.copy')}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        {!selectedMaster && (
          <p className="text-sm text-content-muted">{t('statistics.panel.selectMaster')}</p>
        )}

        {selectedMaster && loading && (
          <p className="text-sm text-content-muted">{t('statistics.panel.loading')}</p>
        )}

        {selectedMaster && showNoData && (
          <div className="flex flex-1 items-center justify-center text-sm text-content-muted">
            {t('statistics.panel.noData')}
          </div>
        )}

        {selectedMaster && !loading && hasData && lowHighRatio && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RatioCard
                title={t('statistics.lowHigh.lowTitle')}
                range={t('statistics.lowHigh.lowRange')}
                value={lowHighRatio.low}
                tooltip={t('statistics.lowHigh.lowTooltip', { value: lowHighRatio.low })}
                variant="low"
              />
              <RatioCard
                title={t('statistics.lowHigh.highTitle')}
                range={t('statistics.lowHigh.highRange')}
                value={lowHighRatio.high}
                tooltip={t('statistics.lowHigh.highTooltip', { value: lowHighRatio.high })}
                variant="high"
              />
            </div>
            <LowHighStackedChart data={lowHighRatio} />
            <RatioSummary data={lowHighRatio} />
          </>
        )}
      </div>
    </div>
  );
}
