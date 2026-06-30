import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import {
  HYPOTHESIS_SOURCE_I18N_KEYS,
  HYPOTHESIS_SOURCE_KEYS,
} from '../../constants/hypothesis-sources';
import { useResearchStore } from '../../stores/research-store';
import {
  countVerificationsForHypothesis,
  experimentNameById,
  filterHypotheses,
} from '../../utils/hypothesis-links';

const EMPTY_FORM = {
  id: null as number | null,
  experimentId: null as number | null,
  sourceField: '' as string,
  title: '',
  description: '',
  confidence: 50,
  verified: false,
};

export function HypothesesTab() {
  const { t } = useI18n();
  const hypotheses = useResearchStore((s) => s.hypotheses);
  const experiments = useResearchStore((s) => s.experiments);
  const verifications = useResearchStore((s) => s.verifications);
  const linkContext = useResearchStore((s) => s.linkContext);
  const clearLinkContext = useResearchStore((s) => s.clearLinkContext);
  const saveHypothesis = useResearchStore((s) => s.saveHypothesis);
  const deleteHypothesis = useResearchStore((s) => s.deleteHypothesis);
  const navigateToExperiment = useResearchStore((s) => s.navigateToExperiment);
  const navigateToVerification = useResearchStore((s) => s.navigateToVerification);

  const [filterExperimentId, setFilterExperimentId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (linkContext?.experimentId != null) {
      setFilterExperimentId(linkContext.experimentId);
      clearLinkContext();
    }
  }, [linkContext, clearLinkContext]);

  const visibleHypotheses = useMemo(
    () => filterHypotheses(hypotheses, filterExperimentId),
    [hypotheses, filterExperimentId],
  );

  const sourceLabel = (key: string | null | undefined) => {
    if (!key) return null;
    const msgKey = HYPOTHESIS_SOURCE_I18N_KEYS[key as keyof typeof HYPOTHESIS_SOURCE_I18N_KEYS];
    return msgKey ? t(msgKey) : key;
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    void saveHypothesis({
      id: form.id,
      experimentId: form.experimentId,
      sourceField: form.sourceField.trim() || null,
      title: form.title,
      description: form.description,
      confidence: form.confidence,
      verified: form.verified,
    });
    setForm(EMPTY_FORM);
  };

  const loadEdit = (id: number) => {
    const h = hypotheses.find((x) => x.id === id);
    if (!h) return;
    setForm({
      id: h.id,
      experimentId: h.experimentId,
      sourceField: h.sourceField ?? '',
      title: h.title,
      description: h.description,
      confidence: h.confidence,
      verified: h.verified,
    });
  };

  return (
    <div className="flex h-full overflow-auto p-4">
      <div className="w-80 shrink-0 border-r border-border pr-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('research.hypotheses.title')}</h3>
        </div>
        <label className="mb-3 block text-xs">
          {t('research.hypotheses.filterExperiment')}
          <select
            className="win-input mt-1 w-full text-sm"
            value={filterExperimentId ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setFilterExperimentId(val ? Number(val) : null);
            }}
          >
            <option value="">{t('research.hypotheses.filterAll')}</option>
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name}
              </option>
            ))}
          </select>
        </label>
        {visibleHypotheses.length === 0 ? (
          <p className="text-xs text-content-muted">{t('research.hypotheses.empty')}</p>
        ) : (
          visibleHypotheses.map((h) => {
            const expName = experimentNameById(experiments, h.experimentId);
            const verifyStats = countVerificationsForHypothesis(verifications, h.id);
            return (
              <div
                key={h.id}
                className={`mb-2 rounded border border-border p-2 text-sm ${
                  form.id === h.id ? 'bg-surface-muted' : ''
                }`}
              >
                <button
                  type="button"
                  className="block w-full text-left hover:underline"
                  onClick={() => loadEdit(h.id)}
                >
                  <div className="font-medium">{h.title}</div>
                  <div className="mt-1 text-xs text-content-muted">
                    {t('research.hypotheses.confidenceShort', { value: h.confidence })} ·{' '}
                    {h.verified
                      ? t('research.hypotheses.verified')
                      : t('research.hypotheses.unverified')}
                  </div>
                </button>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  {expName ? (
                    <button
                      type="button"
                      className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-800 hover:underline"
                      onClick={() => void navigateToExperiment(h.experimentId!)}
                    >
                      {t('research.hypotheses.linkedExperiment', { name: expName })}
                    </button>
                  ) : (
                    <span className="rounded bg-surface-muted px-1.5 py-0.5 text-content-muted">
                      {t('research.hypotheses.noExperiment')}
                    </span>
                  )}
                  {h.sourceField ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-900">
                      {t('research.hypotheses.sourceBadge', {
                        field: sourceLabel(h.sourceField) ?? h.sourceField,
                      })}
                    </span>
                  ) : null}
                  {verifyStats.total > 0 ? (
                    <span className="text-content-muted">
                      {t('research.hypotheses.verificationCount', {
                        total: verifyStats.total,
                        passed: verifyStats.passed,
                      })}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="win-button mt-2 text-xs"
                  onClick={() =>
                    navigateToVerification({
                      experimentId: h.experimentId,
                      hypothesisId: h.id,
                    })
                  }
                >
                  {t('research.hypotheses.openVerification')}
                </button>
              </div>
            );
          })
        )}
      </div>
      <div className="flex-1 pl-4">
        <h3 className="mb-3 text-sm font-semibold">
          {t('research.hypotheses.formTitle', {
            mode: form.id ? t('research.hypotheses.edit') : t('research.hypotheses.new'),
          })}
        </h3>
        <div className="grid max-w-lg gap-3">
          <label className="text-xs">
            {t('research.hypotheses.experimentLabel')}
            <select
              className="win-input mt-1 w-full"
              value={form.experimentId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, experimentId: val ? Number(val) : null });
              }}
            >
              <option value="">{t('research.hypotheses.experimentNone')}</option>
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            {t('research.hypotheses.sourceFieldLabel')}
            <select
              className="win-input mt-1 w-full"
              value={form.sourceField}
              onChange={(e) => setForm({ ...form, sourceField: e.target.value })}
            >
              <option value="">{t('research.hypotheses.sourceNone')}</option>
              {HYPOTHESIS_SOURCE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {sourceLabel(key)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            {t('research.hypotheses.titleLabel')}
            <input
              className="win-input mt-1 w-full"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="text-xs">
            {t('research.hypotheses.descriptionLabel')}
            <textarea
              className="win-input mt-1 w-full"
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('research.hypotheses.descriptionPlaceholder')}
            />
          </label>
          <label className="text-xs">
            {t('research.hypotheses.confidenceLabel', { value: form.confidence })}
            <input
              type="range"
              min={0}
              max={100}
              className="mt-1 w-full"
              value={form.confidence}
              onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm({ ...form, verified: e.target.checked })}
            />
            {t('research.hypotheses.verifiedLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="win-button win-button-primary" onClick={handleSave}>
              {t('research.common.save')}
            </button>
            {form.id && (
              <button
                type="button"
                className="win-button"
                onClick={() => void deleteHypothesis(form.id!)}
              >
                {t('research.common.delete')}
              </button>
            )}
            {form.experimentId != null && (
              <button
                type="button"
                className="win-button"
                onClick={() => void navigateToExperiment(form.experimentId!)}
              >
                {t('research.hypotheses.goExperiment')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
