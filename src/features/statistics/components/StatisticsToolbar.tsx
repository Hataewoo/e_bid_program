import { useStatisticsStore } from '../stores/statistics-store';
import { useI18n } from '@/i18n/use-i18n';

export function StatisticsToolbar() {
  const { t } = useI18n();
  const loading = useStatisticsStore((s) => s.loading);
  const searchQuery = useStatisticsStore((s) => s.searchQuery);
  const handleRefresh = useStatisticsStore((s) => s.handleRefresh);
  const handleExport = useStatisticsStore((s) => s.handleExport);
  const handleCopy = useStatisticsStore((s) => s.handleCopy);
  const handleReset = useStatisticsStore((s) => s.handleReset);
  const handleSearch = useStatisticsStore((s) => s.handleSearch);

  return (
    <div className="win-toolbar flex flex-wrap items-center gap-2 px-3 py-2">
      <div className="flex items-center gap-1">
        <button type="button" className="win-button" onClick={handleRefresh} disabled={loading}>
          {t('statistics.toolbar.refresh')}
        </button>
        <button type="button" className="win-button" onClick={handleExport}>
          {t('statistics.toolbar.export')}
        </button>
        <button type="button" className="win-button" onClick={handleCopy}>
          {t('statistics.toolbar.copy')}
        </button>
        <button type="button" className="win-button" onClick={handleReset}>
          {t('statistics.toolbar.reset')}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="stat-search" className="win-label shrink-0">
          {t('statistics.toolbar.search')}
        </label>
        <input
          id="stat-search"
          type="text"
          className="win-input w-48 text-sm"
          placeholder={t('statistics.toolbar.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
    </div>
  );
}
