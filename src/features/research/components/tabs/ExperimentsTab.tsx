import { useState } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { useResearchStore } from '../../stores/research-store';
import { EXPERIMENT_STATUSES, EXPERIMENT_STATUS_KEYS } from '../../types';
import { hypothesesForExperiment } from '../../utils/hypothesis-links';

export function ExperimentsTab() {
  const { t } = useI18n();
  const experiments = useResearchStore((s) => s.experiments);
  const saveExperiment = useResearchStore((s) => s.saveExperiment);
  const deleteExperiment = useResearchStore((s) => s.deleteExperiment);
  const selectExperiment = useResearchStore((s) => s.selectExperiment);
  const selected = useResearchStore((s) => s.selectedExperiment);
  const hypotheses = useResearchStore((s) => s.hypotheses);
  const navigateToHypotheses = useResearchStore((s) => s.navigateToHypotheses);
  const navigateToVerification = useResearchStore((s) => s.navigateToVerification);

  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    version: '1.0.0',
    description: '',
    status: 'Draft',
  });

  const statusLabel = (status: string) => {
    const key = EXPERIMENT_STATUS_KEYS[status as (typeof EXPERIMENT_STATUSES)[number]];
    return key ? t(key) : status;
  };

  const loadToForm = (id: number) => {
    const exp = experiments.find((e) => e.id === id);
    if (!exp) return;
    void selectExperiment(id);
    setForm({
      name: exp.name,
      date: exp.date.slice(0, 10),
      version: exp.version,
      description: exp.description,
      status: exp.status,
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    void saveExperiment({ ...form, id: selected?.id ?? null });
  };

  const handleNew = () => {
    void selectExperiment(null);
    setForm({
      name: '',
      date: new Date().toISOString().slice(0, 10),
      version: '1.0.0',
      description: '',
      status: 'Draft',
    });
  };

  return (
    <div className="flex h-full">
      <div className="w-64 shrink-0 overflow-auto border-r border-border">
        <div className="flex gap-1 border-b border-border p-2">
          <button
            type="button"
            className="win-button win-button-primary text-xs"
            onClick={handleNew}
          >
            {t('research.common.new')}
          </button>
        </div>
        {experiments.map((exp) => (
          <button
            key={exp.id}
            type="button"
            className={`block w-full border-b border-border px-3 py-2 text-left text-sm hover:bg-surface-muted ${
              selected?.id === exp.id ? 'bg-surface-muted' : ''
            }`}
            onClick={() => loadToForm(exp.id)}
          >
            <div className="font-medium">{exp.name}</div>
            <div className="text-xs text-content-muted">
              {statusLabel(exp.status)} · {exp.date.slice(0, 10)}
            </div>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <h3 className="mb-3 text-sm font-semibold">{t('research.experiment.details')}</h3>
        <div className="grid max-w-lg gap-3">
          <label className="text-xs">
            {t('research.experiment.name')}
            <input
              className="win-input mt-1 w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="text-xs">
            {t('research.experiment.date')}
            <input
              type="date"
              className="win-input mt-1 w-full"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label className="text-xs">
            {t('research.experiment.version')}
            <input
              className="win-input mt-1 w-full"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
          </label>
          <label className="text-xs">
            {t('research.experiment.statusLabel')}
            <select
              className="win-input mt-1 w-full"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {EXPERIMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(EXPERIMENT_STATUS_KEYS[s])}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            {t('research.experiment.description')}
            <textarea
              className="win-input mt-1 w-full"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className="win-button win-button-primary" onClick={handleSave}>
              {t('research.common.save')}
            </button>
            {selected && (
              <button
                type="button"
                className="win-button"
                onClick={() => void deleteExperiment(selected.id)}
              >
                {t('research.common.delete')}
              </button>
            )}
          </div>
          {selected ? (
            <div className="mt-6 border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                  {t('research.experiment.linkedHypotheses')}
                </h4>
                <button
                  type="button"
                  className="win-button text-xs"
                  onClick={() => navigateToHypotheses(selected.id)}
                >
                  {t('research.experiment.manageHypotheses')}
                </button>
              </div>
              {hypothesesForExperiment(hypotheses, selected.id).length === 0 ? (
                <p className="text-xs text-content-muted">
                  {t('research.experiment.noHypotheses')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {hypothesesForExperiment(hypotheses, selected.id).map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between rounded border border-border px-2 py-1.5 text-xs"
                    >
                      <span>
                        {h.title}
                        {h.sourceField ? (
                          <span className="ml-2 text-content-muted">({h.sourceField})</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="win-button text-xs"
                        onClick={() =>
                          navigateToVerification({
                            experimentId: selected.id,
                            hypothesisId: h.id,
                          })
                        }
                      >
                        {t('research.experiment.verifyHypothesis')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
