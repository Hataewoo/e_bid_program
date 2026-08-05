import { memo, useMemo } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import {
  analyzePatternSubDetailFromValues,
  CODE_VALUE_ALPHA_MAX,
  CODE_VALUE_SUB_DETAIL_RULES,
} from '@/shared/utils/codeValueSubAnalysis';
import type { PatternModalState } from '../types/pattern-rows';

interface PatternDetailModalProps {
  modal: PatternModalState | null;
  masterNo: string;
  onClose: () => void;
}

export const PatternDetailModal = memo(function PatternDetailModal({
  modal,
  masterNo,
  onClose,
}: PatternDetailModalProps) {
  const { t } = useI18n();

  const subDetail = useMemo(() => {
    if (!modal || modal.values.length === 0) return null;
    return analyzePatternSubDetailFromValues(modal.values, modal.side);
  }, [modal]);

  if (!modal || !subDetail) return null;

  const sideBandLabel =
    modal.side === 'low'
      ? t('analysis.pattern.subDetailLowBand')
      : t('analysis.pattern.subDetailHighBand');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="win-dialog-window flex max-h-[90vh] w-full max-w-3xl flex-col shadow-lg">
        <div className="win-titlebar flex items-center justify-between">
          <span>
            {t('analysis.pattern.subDetailTitle', {
              band: sideBandLabel,
              code: modal.code,
            })}
          </span>
          <button type="button" className="win-button text-xs" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div>
              <span className="text-content-muted">{t('analysis.pattern.masterNo')} </span>
              <span className="font-semibold">{masterNo}</span>
            </div>
            <div>
              <span className="text-content-muted">{t('analysis.pattern.condition')} </span>
              <span className="font-semibold text-[#0000ff]">{modal.code}</span>
            </div>
          </div>

          <div>
            <div className="mb-1 text-content-muted">{t('analysis.pattern.subDetailRaw')}</div>
            <pre className="max-h-28 overflow-auto border border-border bg-[#fffff0] p-2 font-mono text-xs text-[#0000ff]">
              {modal.values.join(', ')}
            </pre>
          </div>

          <div className="relative rounded border border-border bg-[#f8f8ff] p-2">
            <div className="mb-2 font-semibold text-[#0000ff]">
              {t('analysis.pattern.subDetailRules')}
            </div>
            <ol className="list-none space-y-0.5 text-xs text-[#0000ff]">
              {CODE_VALUE_SUB_DETAIL_RULES.map((rule) => (
                <li key={rule.order}>
                  {String.fromCharCode(0x2460 + rule.order - 1)} {rule.code}: {rule.description}
                </li>
              ))}
            </ol>
            <div className="mt-2 text-right text-xs text-[#cc0000]">
              {t('analysis.pattern.subDetailAlpha', { alpha: CODE_VALUE_ALPHA_MAX })}
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <table className="win-pattern-values-table w-full">
              <thead>
                <tr>
                  <th className="w-[120px] text-left">{t('analysis.pattern.subDetailTableCode')}</th>
                  <th className="text-left">{t('analysis.pattern.subDetailTableDesc')}</th>
                </tr>
              </thead>
              <tbody>
                {subDetail.rows.map((row) => {
                  const isSelected = row.code === modal.code;
                  return (
                    <tr
                      key={row.code}
                      className={isSelected ? 'win-pattern-row-active' : undefined}
                    >
                      <td className="font-semibold">{row.code}</td>
                      <td className="font-mono text-xs text-[#0000ff]">
                        {row.description === '-' ? (
                          <span className="text-content-muted">{t('analysis.pattern.noValues')}</span>
                        ) : (
                          row.description
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});
