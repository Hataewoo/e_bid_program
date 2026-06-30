import { useI18n } from '@/i18n/use-i18n';
import { useResearchStore } from '../stores/research-store';
import { EXPERIMENT_STATUS_KEYS, EXPERIMENT_STATUSES } from '../types';

export function ExperimentSelector() {
  const { t } = useI18n();
  const experiments = useResearchStore((s) => s.experiments);
  const selectedId = useResearchStore((s) => s.selectedExperimentId);
  const selectExperiment = useResearchStore((s) => s.selectExperiment);

  const statusLabel = (status: string) => {
    const key = EXPERIMENT_STATUS_KEYS[status as (typeof EXPERIMENT_STATUSES)[number]];
    return key ? t(key) : status;
  };

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <span className="text-xs font-medium text-content-muted">{t('research.selector.label')}</span>
      <select
        className="win-input min-w-[200px] text-sm"
        value={selectedId ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          void selectExperiment(val ? Number(val) : null);
        }}
      >
        <option value="">{t('research.selector.placeholder')}</option>
        {experiments.map((exp) => (
          <option key={exp.id} value={exp.id}>
            [{statusLabel(exp.status)}] {exp.name}
          </option>
        ))}
      </select>
    </div>
  );
}
