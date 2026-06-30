import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { useResearchStore } from '../../stores/research-store';
import { SUGGESTED_INPUT_KEYS } from '../../types';
import type { ExperimentInputRow } from '@/types/electron';

function emptyRow(): ExperimentInputRow {
  return { fieldKey: '', fieldValue: '' };
}

export function InputsTab() {
  const { t } = useI18n();
  const selected = useResearchStore((s) => s.selectedExperiment);
  const saveInputs = useResearchStore((s) => s.saveInputs);
  const [rows, setRows] = useState<ExperimentInputRow[]>([emptyRow()]);

  useEffect(() => {
    if (selected?.inputs?.length) {
      setRows(selected.inputs.map((r) => ({ fieldKey: r.fieldKey, fieldValue: r.fieldValue })));
    } else {
      setRows([emptyRow()]);
    }
  }, [selected?.id, selected?.inputs]);

  if (!selected) {
    return (
      <div className="p-4 text-sm text-content-muted">{t('research.common.selectExperiment')}</div>
    );
  }

  const addRow = (key?: string) => setRows([...rows, { fieldKey: key ?? '', fieldValue: '' }]);
  const updateRow = (idx: number, patch: Partial<ExperimentInputRow>) => {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('research.inputs.title')}</h3>
        <div className="flex gap-1">
          {SUGGESTED_INPUT_KEYS.map((k) => (
            <button key={k} type="button" className="win-button text-xs" onClick={() => addRow(k)}>
              + {k}
            </button>
          ))}
          <button type="button" className="win-button text-xs" onClick={() => addRow()}>
            {t('research.inputs.addRow')}
          </button>
          <button
            type="button"
            className="win-button win-button-primary text-xs"
            onClick={() => void saveInputs(rows.filter((r) => r.fieldKey.trim()))}
          >
            {t('research.inputs.save')}
          </button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-content-muted">
            <th className="pb-2 pr-2">{t('research.inputs.fieldKey')}</th>
            <th className="pb-2 pr-2">{t('research.inputs.fieldValue')}</th>
            <th className="w-16 pb-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-border">
              <td className="py-1 pr-2">
                <input
                  className="win-input w-full"
                  value={row.fieldKey}
                  onChange={(e) => updateRow(idx, { fieldKey: e.target.value })}
                  placeholder={t('research.inputs.fieldKeyPlaceholder')}
                />
              </td>
              <td className="py-1 pr-2">
                <input
                  className="win-input w-full font-mono"
                  value={row.fieldValue}
                  onChange={(e) => updateRow(idx, { fieldValue: e.target.value })}
                />
              </td>
              <td className="py-1">
                <button type="button" className="win-button text-xs" onClick={() => removeRow(idx)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
